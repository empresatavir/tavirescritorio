import { motorAuthStatus } from '../motorAuth';
import { MOTOR_IDS, MOTOR_LABEL, type MotorId } from '../motors';
import { startMotionJob } from './motionAuthor';
import { MOTION_TOKEN_PADRAO, type MotionPreset } from '../../shared/studio';
import { openStudioStore } from './store';

export interface MotionScenarioReport {
  preset: MotionPreset;
  pedido: string;
  ok: boolean;
  ms: number;
  attempts: number;
  failedCheck: string;
  detail: string;
}

export interface MotionMotorReport {
  motor: MotorId;
  label: string;
  ok: boolean;
  blocker: string;
  scenarios: MotionScenarioReport[];
}

const PEDIDOS: Array<{ preset: MotionPreset; pedido: string }> = [
  { preset: 'titulo-entrada', pedido: 'título entra com mola de baixo para cima, palavra-chave em accent, 3 s, 1080×1920' },
  { preset: 'legenda-palavra', pedido: 'legenda palavra por palavra a partir de um array de palavras com tempo, destaque na palavra ativa' },
  { preset: 'zoom-lento', pedido: 'imagem de fundo com zoom de zoomFrom a zoomTo durante a cena, sem tremer' },
];

function blocked(motor: MotorId, reason: string): MotionMotorReport {
  return {
    motor,
    label: MOTOR_LABEL[motor],
    ok: false,
    blocker: reason,
    scenarios: PEDIDOS.map((item) => ({
      preset: item.preset,
      pedido: item.pedido,
      ok: false,
      ms: 0,
      attempts: 0,
      failedCheck: '',
      detail: reason,
    })),
  };
}

/** Roda os 3 pedidos em cada motor. Sem CLI ou sem login, marca ⛔ e não finge resultado. */
export async function runMotionConformance(opts: {
  home: string;
  source?: string;
  motors?: MotorId[];
  onLog?: (line: string) => void;
} ): Promise<MotionMotorReport[]> {
  const log = opts.onLog || (() => {});
  const motors = opts.motors?.length ? opts.motors : MOTOR_IDS;
  const store = openStudioStore(opts.home);
  const perfil = store.savePerfil({
    nome: 'Conformidade Motion',
    iniciais: 'CM',
    cor_avatar: '#1BC5BD',
    brand_kit: {
      palette: { ink: '#0B1220', surface: '#F4F6F2', text: '#F4F6F2', accent: '#B7F34A', accent2: '#1BC5BD' },
      fonts: { title: 'Instrument Sans', body: 'Instrument Sans' },
      imageStyle: '',
      negatives: [],
      characters: [],
      tone: 'direto',
      canon: [],
    },
  });
  store.saveMotionKit({ perfil_id: perfil.id, nome: 'Kit conformidade', tokens: MOTION_TOKEN_PADRAO, presets: {} });
  const out: MotionMotorReport[] = [];
  try {
    for (const motor of motors) {
      const auth = await motorAuthStatus(motor);
      if (!auth.installed) {
        const report = blocked(motor, `CLI do ${MOTOR_LABEL[motor]} não encontrado.`);
        out.push(report);
        log(`⛔ ${report.label}: ${report.blocker}`);
        continue;
      }
      if (!auth.loggedIn) {
        const report = blocked(motor, `${MOTOR_LABEL[motor]} sem login. ${auth.detail}`);
        out.push(report);
        log(`⛔ ${report.label}: ${report.blocker}`);
        continue;
      }
      const report: MotionMotorReport = { motor, label: MOTOR_LABEL[motor], ok: false, blocker: '', scenarios: [] };
      for (const item of PEDIDOS) {
        const t0 = Date.now();
        log(`… ${report.label} · ${item.preset}`);
        try {
          const job = await startMotionJob({
            perfilId: perfil.id,
            preset: item.preset,
            pedido: item.pedido,
            motor,
            home: opts.home,
            source: opts.source,
            store,
          });
          const checks = (job.checks && typeof job.checks === 'object' && Array.isArray((job.checks as { items?: unknown[] }).items))
            ? (job.checks as { items: Array<{ id: string; ok: boolean; detalhe: string }>; attempts?: number }).items
            : [];
          const attempts = job.checks && typeof job.checks === 'object' ? Number((job.checks as { attempts?: number }).attempts || 1) : 1;
          const failed = checks.find((check) => !check.ok);
          const ok = job.status === 'aguardando_gate';
          report.scenarios.push({
            preset: item.preset,
            pedido: item.pedido,
            ok,
            ms: Date.now() - t0,
            attempts,
            failedCheck: failed ? failed.id : '',
            detail: ok ? 'checagens passaram; aguardando o gate do CEO' : (failed ? `${failed.id}: ${failed.detalhe}` : job.status),
          });
          log(`${ok ? '✓' : '✗'} ${report.label} · ${item.preset}`);
        } catch (err) {
          const detail = err instanceof Error ? err.message : String(err);
          report.scenarios.push({
            preset: item.preset,
            pedido: item.pedido,
            ok: false,
            ms: Date.now() - t0,
            attempts: 0,
            failedCheck: '',
            detail,
          });
          log(`✗ ${report.label} · ${item.preset} — ${detail}`);
        }
      }
      report.ok = report.scenarios.length === PEDIDOS.length && report.scenarios.every((item) => item.ok);
      out.push(report);
    }
  } finally {
    store.close();
  }
  return out;
}

export function motionConformanceMarkdown(results: MotionMotorReport[]): string {
  const lines = ['# Conformidade de motion', '', `Gerado em ${new Date().toISOString()}`, ''];
  lines.push('| Motor | título de entrada | legenda palavra | zoom lento |', '|---|---|---|---|');
  for (const result of results) {
    const cell = (preset: MotionPreset) => {
      const item = result.scenarios.find((scenario) => scenario.preset === preset);
      if (result.blocker) return `⛔ ${result.blocker.replace(/\|/g, '/')}`;
      if (!item) return '—';
      if (item.ok) return `✅ ${Math.round(item.ms / 1000)} s · ${item.attempts} tentativa(s)`;
      return `❌ ${item.failedCheck || 'erro'} · ${item.detail.replace(/\|/g, '/')}`;
    };
    lines.push(`| ${result.label} | ${cell('titulo-entrada')} | ${cell('legenda-palavra')} | ${cell('zoom-lento')} |`);
  }
  return lines.join('\n') + '\n';
}
