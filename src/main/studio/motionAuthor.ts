import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { engineHub } from '../drivers/engineHub';
import { runMotor, type MotorId } from '../motors';
import { startRun } from '../runLedger';
import { MOTION_PRESETS, MOTION_TOKEN_PADRAO, type MotionJob, type MotionPreset, type Perfil } from '../../shared/studio';
import { componentName, rememberCheckOutputs, runMotionChecks, snapshotTree, type MotionCheckDeps, type MotionCheckItem } from './motionChecks';
import { motionPrompt, writeMotionContext } from './motionContext';
import { ensureMotionHome } from './motionHome';
import { ensureStudioTree, studioHome } from './paths';
import { getStudioStore, openStudioStore, StudioError, type StudioStore } from './store';

const MOTORS = new Set<MotorId>(['cursor', 'claude', 'codex', 'antigravity']);

export type MotionDecision = 'aprovado' | 'ajuste' | 'recusado';

export interface MotionAsk {
  perfilId: string;
  preset: string;
  pedido: string;
  motor?: MotorId;
  home?: string;
  source?: string;
  store?: StudioStore;
  runMotorImpl?: (call: {
    motor: MotorId;
    workspace: string;
    prompt: string;
    model: string;
    effort: string;
    access: 'write';
    timeoutMs: number;
  }) => Promise<{ ok: boolean; text: string; exitCode?: number | null; error?: { message?: string } }>;
  deps?: MotionCheckDeps;
  checkImpl?: typeof runMotionChecks;
  maxAutoRetries?: number;
}

function motorId(engine: string): MotorId {
  if (engine === 'anthropic') return 'claude';
  if (MOTORS.has(engine as MotorId)) return engine as MotorId;
  return 'cursor';
}

function run(command: string, args: string[], cwd: string): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, windowsHide: true });
    let output = '';
    child.stdout?.on('data', (chunk) => { output += chunk.toString('utf8'); });
    child.stderr?.on('data', (chunk) => { output += chunk.toString('utf8'); });
    child.on('close', (code) => resolve({ code: code ?? 1, output }));
  });
}

function copyTree(from: string, to: string): void {
  fs.mkdirSync(to, { recursive: true });
  for (const name of fs.readdirSync(from)) {
    if (name === 'node_modules' || name === 'out' || name === '.git') continue;
    const src = path.join(from, name);
    const dest = path.join(to, name);
    if (fs.statSync(src).isDirectory()) copyTree(src, dest);
    else fs.copyFileSync(src, dest);
  }
}

function stubSource(preset: string): string {
  const name = componentName(preset);
  return `import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { z } from 'zod';

export const schema = z.object({
  title: z.string(),
  accent: z.string(),
  durationInFrames: z.number(),
});

export const defaultProps = {
  title: '',
  accent: '#B7F34A',
  durationInFrames: 90,
};

export const ${name}: React.FC<z.infer<typeof schema>> = (props) => {
  useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: '#0B1220', color: props.accent }}>
      {props.title}
    </AbsoluteFill>
  );
};
`;
}

export function registerKitInRoot(rootFile: string, kitId: string, preset: string): void {
  const text = fs.readFileSync(rootFile, 'utf8');
  if (!text.includes('{/* <kits> */}') || !text.includes('{/* </kits> */}')) {
    throw new StudioError('bloco de kits ausente no Root.tsx');
  }
  if (text.includes(`id="${preset}"`)) return;
  const name = componentName(preset);
  const alias = `Kit_${kitId.replace(/-/g, '')}_${name}`;
  const importLine = `import { ${name} as ${alias}, schema as ${alias}Schema, defaultProps as ${alias}Defaults } from './kits/${kitId}/${name}';`;
  const block = `    <Composition id="${preset}" component={${alias}} durationInFrames={90} fps={30} width={1080} height={1920} schema={${alias}Schema} defaultProps={${alias}Defaults} />`;
  const withBlock = text.replace('{/* <kits> */}', `{/* <kits> */}\n${block}`);
  const at = withBlock.lastIndexOf('\nimport ');
  const end = withBlock.indexOf('\n', at + 1);
  const next = `${withBlock.slice(0, end + 1)}${importLine}\n${withBlock.slice(end + 1)}`;
  fs.writeFileSync(rootFile, next);
}

async function commitMotion(dir: string, message: string): Promise<void> {
  const git = (args: string[]) => run('git', ['-c', 'user.name=TAVIR Studio', '-c', 'user.email=studio@tavir.local', ...args], dir);
  if (!fs.existsSync(path.join(dir, '.git'))) await run('git', ['init'], dir);
  await git(['add', '-A']);
  const commit = await git(['commit', '-m', message]);
  if (commit.code !== 0 && !/nothing to commit/i.test(commit.output)) {
    throw new StudioError(commit.output.slice(-400) || 'commit do kit falhou');
  }
}

function storeOf(home?: string, given?: StudioStore): StudioStore {
  return given || (home ? openStudioStore(home) : getStudioStore());
}

function assertPreset(preset: string): asserts preset is MotionPreset {
  if (!(MOTION_PRESETS as readonly string[]).includes(preset)) throw new StudioError('preset desconhecido');
}

/** Cria o workspace, pede o preset ao motor e só então roda as checagens. Nunca aprova. */
export async function startMotionJob(ask: MotionAsk): Promise<MotionJob> {
  assertPreset(ask.preset);
  const store = storeOf(ask.home, ask.store);
  const perfil = store.getPerfil(ask.perfilId);
  if (!perfil) throw new StudioError('perfil não encontrado');
  if (!ask.pedido?.trim()) throw new StudioError('pedido vazio');
  let motor = ask.motor || 'cursor';
  let model = 'auto-smart';
  let effort = 'medium';
  if (!ask.motor) {
    try {
      const call = engineHub.resolveCall();
      motor = motorId(call.motor.id);
      model = call.model.id;
      effort = call.effort.id;
    } catch {
      motor = 'cursor';
    }
  }
  const kits = store.listMotionKits(perfil.id);
  const kit = kits[0] || store.saveMotionKit({
    perfil_id: perfil.id,
    nome: `Kit ${perfil.nome}`,
    tokens: MOTION_TOKEN_PADRAO,
    presets: {},
  });
  const source = ask.source || (await ensureMotionHome(ask.home)).dir;
  if (!fs.existsSync(path.join(source, 'package.json'))) throw new StudioError('base de motion ausente');
  const tree = ensureStudioTree(ask.home);
  const jobId = randomUUID();
  const workspace = path.join(tree.motionJobs, jobId);
  copyTree(source, workspace);
  const modules = path.join(source, 'node_modules');
  if (!fs.existsSync(modules)) fs.mkdirSync(modules, { recursive: true });
  fs.symlinkSync(modules, path.join(workspace, 'node_modules'), 'junction');
  writeMotionContext(workspace, perfil as Perfil, kit.tokens);
  const fileName = `${componentName(ask.preset)}.tsx`;
  fs.mkdirSync(path.join(workspace, 'src', 'kits', kit.id), { recursive: true });
  fs.writeFileSync(path.join(workspace, 'src', 'kits', kit.id, fileName), stubSource(ask.preset));
  registerKitInRoot(path.join(workspace, 'src', 'Root.tsx'), kit.id, ask.preset);
  const before = snapshotTree(workspace);
  let job = store.saveMotionJob({
    kit_id: kit.id,
    preset: ask.preset,
    motor,
    modelo: model,
    pedido: ask.pedido.trim(),
    workspace,
    status: 'rodando',
  });
  const runner = ask.runMotorImpl || runMotor;
  const check = ask.checkImpl || runMotionChecks;
  const retries = ask.maxAutoRetries ?? 2;
  let prompt = motionPrompt(ask.preset, ask.pedido.trim());
  let checks: MotionCheckItem[] = [];
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const run = await startRun({
      workspace,
      kind: 'chat',
      label: `Studio · motion ${ask.preset}`,
      stage: 'motion',
      owner: 'Studio',
      projectName: perfil.nome,
      engine: motor,
      binary: motor,
      model,
      effort,
      mode: 'write',
      args: [],
      timeoutMs: 900000,
      prompt,
    });
    let reply = '';
    let failed = '';
    try {
      const result = await runner({
        motor,
        workspace,
        prompt,
        model,
        effort,
        access: 'write',
        timeoutMs: 900000,
      });
      reply = result.text || '';
      failed = result.ok ? '' : (result.error?.message || 'motor não respondeu');
      await run.finish({ ok: result.ok, exitCode: result.exitCode ?? null, reply, error: failed || undefined });
    } catch (err) {
      failed = err instanceof Error ? err.message : String(err);
      await run.finish({ ok: false, reply: '', error: failed }).catch(() => undefined);
    }
    checks = await check({
      workspace,
      kitId: kit.id,
      preset: ask.preset,
      before,
      width: 1080,
      height: 1920,
      fps: 30,
      durationInFrames: 90,
      deps: ask.deps,
    });
    const passed = checks.every((item) => item.ok) && !failed;
    rememberCheckOutputs(before, workspace);
    job = store.saveMotionJob({
      ...job,
      status: passed ? 'aguardando_gate' : 'reprovado',
      checks: { items: checks, attempts: attempt + 1, motor: reply.slice(0, 500) },
      run_id: null,
    });
    if (passed || attempt === retries) break;
    const report = checks.filter((item) => !item.ok).map((item) => `${item.id}: ${item.detalhe}`).join('\n');
    prompt = `${motionPrompt(ask.preset, ask.pedido.trim())}\nTentar de novo com o erro:\n${failed}\n${report}\nNão grave arquivos fora da pasta do kit.\n`;
  }
  return job;
}

/** Gate do CEO. A resposta do motor não chega aqui. */
export async function decideMotionGate(jobId: string, decisao: MotionDecision, comentario = '', home?: string, store?: StudioStore, source?: string): Promise<MotionJob> {
  const db = storeOf(home, store);
  const job = db.getMotionJob(jobId);
  if (!job) throw new StudioError('job não encontrado');
  if (decisao === 'recusado') return db.applyMotionGate(jobId, 'recusado');
  if (decisao === 'ajuste') {
    const kit = db.getMotionKit(job.kit_id);
    if (!kit) throw new StudioError('kit não encontrado');
    return startMotionJob({
      perfilId: kit.perfil_id,
      preset: job.preset,
      pedido: `${job.pedido}\nAjuste do CEO: ${comentario}`,
      motor: MOTORS.has(job.motor as MotorId) ? job.motor as MotorId : 'cursor',
      home,
      source,
      store: db,
    });
  }
  if (job.status !== 'aguardando_gate') throw new StudioError('o gate só aprova um job que passou nas checagens');
  const motion = source || path.join(studioHome(home), 'motion');
  copyTree(path.join(job.workspace, 'src', 'kits', job.kit_id), path.join(motion, 'src', 'kits', job.kit_id));
  registerKitInRoot(path.join(motion, 'src', 'Root.tsx'), job.kit_id, job.preset);
  await commitMotion(motion, `kit ${job.preset}`);
  return db.applyMotionGate(jobId, 'aprovado');
}

export function latestMotionView(perfilId: string, home?: string, store?: StudioStore): { job: MotionJob | null; still: string } {
  const db = storeOf(home, store);
  const job = db.listMotionJobs(perfilId)[0] || null;
  if (!job) return { job: null, still: '' };
  const file = path.join(job.workspace, 'out', 'frame-mid.png');
  if (!fs.existsSync(file)) return { job, still: '' };
  const body = fs.readFileSync(file);
  if (body.length > 2_500_000) return { job, still: '' };
  return { job, still: `data:image/png;base64,${body.toString('base64')}` };
}
