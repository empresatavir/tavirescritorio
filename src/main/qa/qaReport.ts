/**
 * Relatório de QA em HTML no DS da TAVIR (Tinta/Lima/Teal, Instrument Sans + IBM Plex Mono).
 * Fica em qa/evidencias/<id>/index.html e aponta para as evidências pelo caminho relativo,
 * então abre direto do disco e pode ser zipado junto com a pasta.
 */
import type { QaRun, QaTestResult } from './qaRunner';

const esc = (x: unknown) =>
  String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rel = (p: string) => p.split('/').map(encodeURIComponent).join('/');
const dur = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, '0')} s` : `${String(Math.round(s * 10) / 10).replace('.', ',')} s`);

export const CSS = `
:root{--ink:#0B1220;--lime:#B7F34A;--teal:#1BC5BD;--teal-deep:#0B6C67;--cloud:#F4F6F2;--slate:#5E6878;--line:rgba(11,18,32,.12);
--danger:oklch(.52 .18 27);--danger-subtle:oklch(.52 .18 27 / .10);--ok:#0B6C67;--ok-subtle:rgba(11,108,103,.10);--warn:oklch(.52 .12 78);--warn-subtle:oklch(.62 .12 78 / .14);
--body:"Instrument Sans",Arial,sans-serif;--mono:"IBM Plex Mono",Consolas,monospace}
*{box-sizing:border-box}body{margin:0;background:var(--cloud);color:var(--ink);font:14px/1.55 var(--body);-webkit-font-smoothing:antialiased}
a{color:var(--teal-deep)}h1,h2,h3,p{margin:0}
.top{background:var(--ink);color:var(--cloud);padding:28px 40px 30px}
.brand{display:flex;align-items:center;gap:10px;font:600 13px var(--mono);letter-spacing:.18em;text-transform:uppercase;color:#aeb7c4}
.brand b{font:700 20px var(--body);letter-spacing:.02em;color:var(--cloud)}.brand i{width:10px;height:10px;border-radius:3px;background:var(--lime);display:inline-block}
.top h1{font-size:30px;font-weight:600;margin-top:18px;letter-spacing:-.01em}
.meta{margin-top:8px;color:#aeb7c4;font:12.5px var(--mono)}
.verdict{display:inline-flex;align-items:center;gap:8px;margin-top:18px;padding:7px 14px;border-radius:999px;font:600 12px var(--mono);letter-spacing:.08em;text-transform:uppercase}
.verdict.ok{background:var(--lime);color:#25360a}.verdict.bad{background:oklch(.635 .185 27);color:#fff}
main{max-width:1180px;margin:0 auto;padding:28px 40px 60px}
.eyebrow{font:600 11px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--slate)}
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:-52px}
.kpi{background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px 18px;box-shadow:0 10px 30px rgba(11,18,32,.06)}
.kpi b{display:block;font:600 28px var(--mono);margin-top:4px}.kpi .ok{color:var(--ok)}.kpi .bad{color:var(--danger)}
section{margin-top:34px}section>h2{font-size:19px;font-weight:600;margin:6px 0 14px}
.card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin-bottom:12px}
.fail{border-left:4px solid var(--danger)}
.fail h3{font-size:15.5px;font-weight:600}.fail .msg{margin-top:4px;color:var(--danger);font-weight:600}
.kv{display:grid;grid-template-columns:110px 1fr;gap:4px 14px;margin-top:12px;font-size:13px}.kv dt{color:var(--slate)}.kv dd{margin:0;white-space:pre-wrap;word-break:break-word}
pre{margin:10px 0 0;background:var(--ink);color:#E2E8F0;padding:12px 14px;border-radius:10px;font:12px/1.5 var(--mono);white-space:pre-wrap;word-break:break-word;max-height:320px;overflow:auto}
.media{display:flex;gap:12px;flex-wrap:wrap;margin-top:14px}.media a{display:block;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--cloud)}
.media img{display:block;max-width:360px;max-height:260px;object-fit:cover;object-position:top}
.media figcaption{font:11px var(--mono);color:var(--slate);padding:6px 8px}
table{width:100%;border-collapse:collapse;font-size:13.5px}th{font:600 11px var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--slate);text-align:left;padding:8px 10px;border-bottom:1px solid var(--line)}
td{padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}tr:last-child td{border-bottom:0}
.pill{display:inline-block;padding:2px 9px;border-radius:999px;font:600 10.5px var(--mono);letter-spacing:.06em;text-transform:uppercase}
.pill.ok{background:var(--ok-subtle);color:var(--ok)}.pill.bad{background:var(--danger-subtle);color:var(--danger)}.pill.n{background:#eef1ec;color:var(--slate)}
.suite{display:flex;align-items:baseline;justify-content:space-between;gap:12px}.suite span{font:12px var(--mono);color:var(--slate)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
.ev{background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden}.ev img,.ev video{display:block;width:100%;max-height:220px;object-fit:cover;object-position:top;background:var(--ink)}
.ev div{padding:8px 10px;font:11.5px var(--mono);color:var(--slate);display:flex;justify-content:space-between;gap:8px}.ev div b{color:var(--ink);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ev.f{outline:2px solid var(--danger);outline-offset:-2px}
ul.notes{margin:0;padding-left:18px}ul.notes li{margin:4px 0}
footer{margin-top:40px;color:var(--slate);font:12px var(--mono)}
@media (max-width:760px){.top,main{padding-left:16px;padding-right:16px}.kpis{grid-template-columns:repeat(2,1fr)}.media img{max-width:100%}}
`;

function media(t: QaTestResult): string {
  const items: string[] = [];
  for (const s of t.shots || []) items.push(`<a href="${rel(s)}" target="_blank"><img loading="lazy" src="${rel(s)}" alt="Print: ${esc(t.name)}"><figcaption>${esc(s)}</figcaption></a>`);
  if (t.gif) items.push(`<a href="${rel(t.gif)}" target="_blank"><img loading="lazy" src="${rel(t.gif)}" alt="GIF da falha: ${esc(t.name)}"><figcaption>${esc(t.gif)}</figcaption></a>`);
  return items.length ? `<div class="media">${items.join('')}</div>` : '';
}

export function renderQaReport(projectName: string, run: QaRun): string {
  const failures = run.suites.flatMap((s) => s.tests.filter((t) => t.st === 'fail').map((t) => ({ suite: s.name, t })));
  const failHtml = failures.length
    ? failures
        .map(
          ({ suite, t }) => `<div class="card fail"><div class="eyebrow">${esc(suite)}</div><h3>${esc(t.name)}</h3><p class="msg">${esc(t.err?.msg || 'Falhou')}</p>
<dl class="kv"><dt>Esperado</dt><dd>${esc(t.err?.exp)}</dd><dt>Recebido</dt><dd>${esc(t.err?.rec)}</dd><dt>Onde</dt><dd>${esc(t.err?.at)}</dd>${t.log ? `<dt>Log</dt><dd><a href="${rel(t.log)}" target="_blank">${esc(t.log)}</a></dd>` : ''}</dl>
${t.err?.code ? `<pre>${esc(t.err.code)}</pre>` : ''}${media(t)}</div>`,
        )
        .join('')
    : `<div class="card"><p>${run.empty ? 'Nenhum teste rodou, então não há falha de asserção. Veja as observações abaixo.' : 'Nenhuma falha. Todos os testes passaram.'}</p></div>`;

  const suitesHtml = run.suites
    .map((s) => {
      const ok = s.tests.filter((t) => t.st === 'pass').length;
      const rows = s.tests
        .map((t) => {
          const evs = [...(t.shots || []).map((x) => `<a href="${rel(x)}" target="_blank">print</a>`), t.gif ? `<a href="${rel(t.gif)}" target="_blank">gif</a>` : '', t.log ? `<a href="${rel(t.log)}" target="_blank">log</a>` : ''].filter(Boolean).join(' · ');
          return `<tr><td><span class="pill ${t.st === 'pass' ? 'ok' : 'bad'}">${t.st === 'pass' ? 'passou' : 'falhou'}</span></td><td>${esc(t.name)}${t.err ? `<div style="color:var(--danger);font-size:12.5px;margin-top:2px">${esc(t.err.msg)}</div>` : ''}</td><td class="mono">${dur(t.dur)}</td><td>${evs || '<span style="color:var(--slate)">—</span>'}</td></tr>`;
        })
        .join('');
      return `<div class="card"><div class="suite"><h3 style="font-size:15.5px;font-weight:600">${esc(s.name)}</h3><span>${ok}/${s.tests.length}</span></div><table style="margin-top:8px"><tr><th style="width:96px">Status</th><th>Teste</th><th style="width:90px">Duração</th><th style="width:150px">Evidências</th></tr>${rows}</table></div>`;
    })
    .join('');

  const gallery = run.ev
    .filter((e) => e.kind === 'video' || e.kind === 'gif' || e.kind === 'img')
    .sort((a, b) => Number(b.fail) - Number(a.fail))
    .map((e) => {
      const view = e.kind === 'video' ? `<video controls preload="metadata" src="${rel(e.path)}"></video>` : `<a href="${rel(e.path)}" target="_blank"><img loading="lazy" src="${rel(e.path)}" alt="${esc(e.note || e.name)}"></a>`;
      return `<div class="ev${e.fail ? ' f' : ''}">${view}<div><b title="${esc(e.name)}">${esc(e.name)}</b><span>${esc(e.kind === 'img' ? 'print' : e.kind)} · ${esc(e.size)}</span></div></div>`;
    })
    .join('');
  const files = run.ev
    .filter((e) => e.kind === 'trace' || e.kind === 'log')
    .map((e) => `<tr><td><span class="pill n">${e.kind}</span></td><td><a href="${rel(e.path)}" target="_blank">${esc(e.path)}</a></td><td class="mono">${esc(e.size)}</td><td>${esc(e.note || '')}</td></tr>`)
    .join('');

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>QA · ${esc(projectName)} · ${esc(run.id)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
<header class="top"><div class="brand"><i></i><b>TAVIR</b> Fábrica · Relatório de QA</div>
<h1>${esc(projectName)}</h1>
<div class="meta">${esc(run.id)} · ${esc(run.when)} · ${esc(run.stack)} · alvo ${esc(run.target)} · commit ${esc(run.commit)}${run.label ? ` · ${esc(run.label)}` : ''}</div>
<div class="verdict ${run.ok ? 'ok' : 'bad'}">${run.ok ? 'Aprovado' : 'Reprovado'} · ${run.ok ? 'todos os testes passaram' : run.empty ? 'nenhum teste rodou' : `${run.fail} falha(s)`}</div>
<div style="height:40px"></div></header>
<main>
<div class="kpis"><div class="kpi"><span class="eyebrow">Testes</span><b>${run.total}</b></div><div class="kpi"><span class="eyebrow">Passaram</span><b class="ok">${run.pass}</b></div><div class="kpi"><span class="eyebrow">Falharam</span><b class="${run.fail ? 'bad' : ''}">${run.fail}</b></div><div class="kpi"><span class="eyebrow">Duração</span><b>${dur(run.dur)}</b></div></div>
${run.regress && run.regress.length ? `<section><div class="eyebrow">Passavam em ${esc(run.prevId)} e quebraram agora</div><h2>Regressões</h2><div class="card fail"><ul class="notes">${run.regress.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div></section>` : ''}
<section><div class="eyebrow">Primeiro o que quebrou</div><h2>Falhas</h2>${failHtml}</section>
<section><div class="eyebrow">Tudo que rodou</div><h2>Suítes</h2>${suitesHtml || '<div class="card"><p>Nenhuma suíte rodou.</p></div>'}</section>
<section><div class="eyebrow">Vídeos, GIFs e prints</div><h2>Evidências</h2>${gallery ? `<div class="grid">${gallery}</div>` : '<div class="card"><p>Sem evidência visual nesta execução.</p></div>'}
${files ? `<div class="card" style="margin-top:12px"><table><tr><th style="width:80px">Tipo</th><th>Arquivo</th><th style="width:90px">Tamanho</th><th>Uso</th></tr>${files}</table></div>` : ''}</section>
<section><div class="eyebrow">Como rodou</div><h2>Ambiente</h2><div class="card"><dl class="kv" style="margin-top:0"><dt>Navegador</dt><dd>${esc(run.browsers)}</dd><dt>Stack</dt><dd>${esc(run.stack)}</dd><dt>Alvo</dt><dd>${esc(run.target)}</dd><dt>Commit</dt><dd>${esc(run.commit)}</dd><dt>Executor</dt><dd>${esc(run.by)} (${esc(run.motor)})</dd></dl>
${run.notes.length ? `<div class="eyebrow" style="margin-top:16px">Observações</div><ul class="notes">${run.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}</div></section>
<footer>Gerado pela Fábrica TAVIR em ${esc(new Date(run.at).toLocaleString('pt-BR'))}. Para abrir um trace: npx playwright show-trace traces/desktop.zip</footer>
</main></body></html>`;
}
