/**
 * Relatório de segurança white box em HTML no DS da TAVIR. Fica em qa/seguranca/<id>/index.html.
 * Segredos já chegam mascarados do scanner; aqui só se escapa o texto.
 */
import { CSS } from '../qa/qaReport';
import type { SegFinding, SegRun } from './segScanner';

const esc = (x: unknown) =>
  String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rel = (p: string) => p.split('/').map(encodeURIComponent).join('/');
const dur = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, '0')} s` : `${String(Math.round(s * 10) / 10).replace('.', ',')} s`);

const SEV_CLS: Record<string, string> = { 'crítica': 'bad', 'alta': 'bad', 'média': 'warn', 'baixa': 'n', 'info': 'n' };

const EXTRA = `
.pill.warn{background:var(--warn-subtle);color:var(--warn)}
.ring{width:84px;height:84px;border-radius:50%;display:grid;place-items:center;font:600 22px var(--mono);color:var(--cloud)}
.score{display:flex;align-items:center;gap:18px;margin-top:18px}
.sev{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.top .pill.n{background:#1c2638;color:#aeb7c4}.top .pill.bad{background:oklch(.635 .185 27);color:#fff}.top .pill.warn{background:oklch(.8 .13 78);color:#2a1f00}
.f h3{font-size:15.5px;font-weight:600;margin-top:4px}.f.alta,.f.crítica{border-left:4px solid var(--danger)}.f.média{border-left:4px solid var(--warn)}
.f.corrigida{opacity:.72;border-left:4px solid var(--ok)}.f.aceita{border-left:4px dashed var(--slate)}
.head{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.refs{margin-top:10px;font:12px var(--mono);color:var(--slate)}
`;

function finding(f: SegFinding): string {
  const st = f.st === 'corrigida' ? '<span class="pill ok">corrigida</span>' : f.st === 'aceita' ? '<span class="pill n">risco aceito</span>' : '<span class="pill bad">aberta</span>';
  return `<div class="card f ${esc(f.sev)} ${esc(f.st)}"><div class="head"><span class="pill ${SEV_CLS[f.sev] || 'n'}">${esc(f.sev)}</span>${st}<span class="eyebrow">${esc(f.id)} · ${esc(f.tool)}</span></div>
<h3>${esc(f.title)}</h3>
<dl class="kv"><dt>Onde</dt><dd>${esc(f.where)}</dd><dt>O que é</dt><dd>${esc(f.desc)}</dd>${f.impact ? `<dt>Impacto</dt><dd>${esc(f.impact)}</dd>` : ''}<dt>Correção</dt><dd>${esc(f.fix)}</dd>${f.accepted ? `<dt>Aceite</dt><dd>${esc(f.accepted.by)} em ${esc(new Date(f.accepted.at).toLocaleString('pt-BR'))}: ${esc(f.accepted.note)}</dd>` : ''}</dl>
${f.ev ? `<div class="eyebrow" style="margin-top:12px">Evidência</div><pre>${esc(f.ev)}</pre>` : ''}${f.code ? `<div class="eyebrow" style="margin-top:12px">Sugestão</div><pre>${esc(f.code)}</pre>` : ''}
${f.refs.length ? `<div class="refs">${f.refs.map(esc).join(' · ')}</div>` : ''}</div>`;
}

export function renderSegReport(projectName: string, run: SegRun): string {
  const open = run.findings.filter((f) => f.st === 'aberta');
  const accepted = run.findings.filter((f) => f.st === 'aceita');
  const fixed = run.findings.filter((f) => f.st === 'corrigida');
  const ring = run.score >= 90 ? 'var(--ok)' : run.score >= 70 ? 'var(--warn)' : 'var(--danger)';
  const checkRows = run.checks
    .map((c) => {
      const pill = c.st === 'pass' ? '<span class="pill ok">passou</span>' : c.st === 'fail' ? '<span class="pill bad">falhou</span>' : c.st === 'warn' ? '<span class="pill warn">atenção</span>' : '<span class="pill n">não se aplica</span>';
      return `<tr><td>${pill}</td><td>${esc(c.area)}</td><td>${esc(c.title)}</td><td style="color:var(--slate)">${esc(c.note || '')}</td></tr>`;
    })
    .join('');
  const toolRows = run.tools
    .map((t) => `<tr><td><span class="pill ${t.ran ? 'ok' : 'n'}">${t.ran ? 'rodou' : 'não rodou'}</span></td><td>${esc(t.name)}</td><td>${esc(t.note)}</td><td class="mono">${t.ms ? dur(t.ms / 1000) : '—'}</td><td>${t.log ? `<a href="${rel(t.log)}" target="_blank">${esc(t.log)}</a>` : ''}</td></tr>`)
    .join('');
  const sevPills = (['crítica', 'alta', 'média', 'baixa', 'info'] as const).map((s) => `<span class="pill ${run.counts[s] ? SEV_CLS[s] : 'n'}">${run.counts[s]} ${s}</span>`).join('');

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Segurança · ${esc(projectName)} · ${esc(run.id)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>${CSS}${EXTRA}</style></head><body>
<header class="top"><div class="brand"><i></i><b>TAVIR</b> Fábrica · Segurança white box</div>
<h1>${esc(projectName)}</h1>
<div class="meta">${esc(run.id)} · ${esc(run.when)} · ${run.files} arquivo(s) lidos · commit ${esc(run.commit)}${run.label ? ` · ${esc(run.label)}` : ''}</div>
<div class="score"><div class="ring" style="background:${ring}">${run.score}</div><div><div class="verdict ${run.ok ? 'ok' : 'bad'}" style="margin-top:0">${run.ok ? 'Aprovado' : 'Reprovado'} · ${run.ok ? 'nenhum achado crítico ou alto aberto' : `${run.blocking} achado(s) crítico(s) ou alto(s)`}</div><div class="sev">${sevPills}</div></div></div>
<div style="height:40px"></div></header>
<main>
<div class="kpis"><div class="kpi"><span class="eyebrow">Nota</span><b>${run.score}/100</b></div><div class="kpi"><span class="eyebrow">Abertos</span><b class="${open.length ? 'bad' : 'ok'}">${open.length}</b></div><div class="kpi"><span class="eyebrow">Corrigidos</span><b class="ok">${fixed.length}</b></div><div class="kpi"><span class="eyebrow">Riscos aceitos</span><b>${accepted.length}</b></div></div>
<section><div class="eyebrow">Primeiro o mais grave</div><h2>Achados abertos</h2>${open.length ? open.map(finding).join('') : '<div class="card"><p>Nenhum achado aberto.</p></div>'}</section>
${accepted.length ? `<section><div class="eyebrow">Fora do portão, com justificativa</div><h2>Riscos aceitos</h2>${accepted.map(finding).join('')}</section>` : ''}
${fixed.length ? `<section><div class="eyebrow">Estavam na varredura anterior e sumiram</div><h2>Corrigidos</h2>${fixed.map(finding).join('')}</section>` : ''}
<section><div class="eyebrow">O que foi verificado</div><h2>Testes</h2><div class="card"><table><tr><th style="width:120px">Status</th><th style="width:130px">Área</th><th>Teste</th><th>Observação</th></tr>${checkRows}</table></div></section>
<section><div class="eyebrow">Como rodou</div><h2>Ferramentas</h2><div class="card"><table><tr><th style="width:110px">Status</th><th>Ferramenta</th><th>Resultado</th><th style="width:80px">Tempo</th><th>Saída</th></tr>${toolRows}</table>
${run.notes.length ? `<div class="eyebrow" style="margin-top:16px">Observações</div><ul class="notes">${run.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}</div></section>
<footer>Gerado pela Fábrica TAVIR em ${esc(new Date(run.at).toLocaleString('pt-BR'))} em ${dur(run.dur)}. Segredos aparecem mascarados. Riscos aceitos ficam em .tavir/seguranca-aceites.json.</footer>
</main></body></html>`;
}
