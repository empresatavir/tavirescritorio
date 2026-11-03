/**
 * Gera preview_fabrica.html — HTML navegável fiel ao layout atual da Fábrica.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'dist/renderer/assets/index-DbADcohf.css'), 'utf8');

const extraCss = `
.shell{height:100vh}
.content{overflow:auto}
.segs{display:inline-flex;flex-wrap:wrap;gap:6px;align-items:center}
.seg{height:28px;padding:0 10px;border-radius:999px;border:1px solid var(--line);background:transparent;color:var(--text-secondary);font-size:12px;display:inline-flex;align-items:center;gap:6px}
.seg:hover{border-color:var(--flow-subtle-line);color:var(--flow)}
.seg.on{background:var(--cloud);color:var(--ink);border-color:transparent;font-weight:600}
.seg .c{opacity:.65;font-size:10.5px;font-family:var(--font-mono)}
.rows{display:flex;flex-direction:column}
.row{display:flex;align-items:center;gap:14px;padding:14px 18px;border-bottom:1px solid var(--line)}
.row:last-child{border-bottom:0}
.row:hover{background:rgba(244,246,242,.03)}
.tabs{display:flex;gap:4px;border-bottom:1px solid var(--line);overflow-x:auto}
.tab{height:40px;padding:0 14px;border:0;background:transparent;color:var(--text-muted);border-bottom:2px solid transparent;display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:500;white-space:nowrap}
.tab.on{color:var(--text-primary);border-bottom-color:var(--flow)}
.input{height:40px;width:100%;border-radius:10px;border:1px solid var(--line);background:var(--surface-1);padding:0 12px;color:var(--text-primary)}
.input:focus{outline:none;border-color:var(--flow)}
.track{background:var(--line);border-radius:999px;overflow:hidden}
.track .fill{height:100%;background:var(--lime);transform-origin:left}
.av{border-radius:50%;background:var(--surface-3);border:1px solid var(--line);display:grid;place-items:center;font-weight:600}
.bubble{align-self:flex-start;background:var(--surface-0);border:1px solid var(--line);border-radius:14px;padding:10px 12px}
.bubble.me{align-self:flex-end;background:var(--flow-subtle);border-color:var(--flow-subtle-line)}
.legend{display:flex;gap:12px;font-size:12px;color:var(--text-muted);align-items:center}
.legend i{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:4px}
.metric{background:var(--surface-2);border:1px solid var(--line);border-radius:14px;padding:16px 18px;display:flex;flex-direction:column;gap:6px}
.metric strong{font-size:28px;font-weight:600;letter-spacing:-.03em}
.metric small{color:var(--text-muted);font-size:12px}
.hidden{display:none!important}
.noscroll{-webkit-overflow-scrolling:touch}
.preview-banner{position:sticky;top:0;z-index:90;background:#b7f34a;color:#25360a;padding:8px 16px;font-size:12.5px;font-weight:600;display:flex;gap:12px;align-items:center;justify-content:space-between}
.preview-banner code{font-family:var(--font-mono);font-size:11px;opacity:.8}
`;

const html = `<!doctype html>
<html lang="pt-BR" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Preview · Fábrica (layout atual)</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Instrument+Sans:ital,wght@0,400..700;1,400..700&display=swap" rel="stylesheet">
<style>${css}${extraCss}</style>
</head>
<body>
<div class="preview-banner">
  <span>Preview navegável da Fábrica — layout atual (pensamento colapsado · workspace em modal · motor compacto)</span>
  <code>preview_fabrica.html</code>
</div>
<div class="tv shell">
  <!-- RAIL -->
  <aside class="rail" aria-label="Domínios">
    <button class="rail-mark" title="TAVIR" type="button"><svg width="30" height="30" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#B7F34A"/><path d="M8 10h16v3H18v12h-4V13H8V10z" fill="#0B1220"/></svg></button>
    <button class="rail-btn" type="button" title="Operação"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg></button>
    <button class="rail-btn on" type="button" title="Módulos"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg></button>
    <button class="rail-btn" type="button" title="Comercial"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a4 4 0 0 1 8 0v2"/></svg></button>
    <div class="grow"></div>
    <button class="rail-btn" type="button" title="Tema"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg></button>
    <span class="avatar">CH</span>
  </aside>

  <!-- SUBNAV -->
  <nav class="sub" aria-label="Módulos">
    <div class="sub-brand"><strong style="color:var(--on-ink);letter-spacing:.02em">TAVIR</strong><small>Escritório</small></div>
    <div class="sub-label">Módulos</div>
    <div class="sub-nav">
      <button class="nav-item" type="button"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5"/></svg><span>Visão dos módulos</span></button>
      <button class="nav-item" type="button"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg><span>Raio-X</span></button>
      <button class="nav-item" type="button"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/></svg><span>Studio</span></button>
      <button class="nav-item on" type="button"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 21h18M5 21V10l7-5 7 5v11"/><path d="M9 21v-6h6v6"/></svg><span>Fábrica</span><b>1</b></button>
      <button class="nav-item" type="button"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3v12"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg><span>Flow</span><em>BETA</em></button>
      <button class="nav-item" type="button"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h4M7 13h10"/></svg><span>Edição</span><em>BETA</em></button>
    </div>
    <div class="sub-foot">
      <div class="health"><span class="live-dot" style="width:7px;height:7px;border-radius:50%;background:var(--flow);display:inline-block"></span> office.py · SQLite</div>
      <div class="health"><span class="live-dot" style="width:7px;height:7px;border-radius:50%;background:var(--flow);display:inline-block"></span> Sincron Brain MCP</div>
    </div>
  </nav>

  <!-- MAIN -->
  <main class="main">
    <header class="top">
      <div class="crumbs"><span class="dim">Módulos</span><span class="sep">/</span><strong>Fábrica</strong></div>
      <span class="badge flow" style="margin-left:8px"><i class="live-dot" style="width:6px;height:6px;border-radius:50%;background:currentColor;display:inline-block"></i> AO VIVO</span>
      <div class="grow"></div>
      <button class="search" type="button"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg><span>Buscar telas, tasks, agentes...</span><span class="kbd">Ctrl K</span></button>
    </header>

    <div class="content">
      <!-- LISTA -->
      <div id="view-list" class="page screen" style="max-width:1520px">
        <div class="phead">
          <div class="grow">
            <div class="eyebrow">Módulo · Vender</div>
            <h1 style="margin-top:8px">Fábrica</h1>
            <p>Landing, oferta e sistema em esteiras. Cada etapa tem dono, artefato e critério de pronto.</p>
          </div>
          <div class="actions">
            <button class="btn secondary" type="button">Absorver pasta (Product Lab)</button>
            <button class="btn primary" type="button">+ Nova esteira</button>
          </div>
        </div>
        <div class="g4">
          <div class="metric"><span class="eyebrow">Esteiras ativas</span><strong>2</strong><small>1 criação · 1 manutenção</small></div>
          <div class="metric"><span class="eyebrow">No gate</span><strong style="color:var(--warning)">0</strong><small>nenhuma sincronizada</small></div>
          <div class="metric"><span class="eyebrow">Entregues em 30 dias</span><strong>4</strong><small>todas com QA na 1ª ou 2ª rodada</small></div>
          <div class="metric"><span class="eyebrow">Lead time médio</span><strong>4,2 d</strong><small>meta: menos de 4 dias</small></div>
        </div>
        <section class="card">
          <div class="card-h"><h3>Esteiras ao vivo</h3><div class="grow"></div>
            <div class="legend"><span><i style="background:var(--flow)"></i>concluída</span><span><i style="background:var(--warning)"></i>agora</span><span><i style="background:var(--line-strong)"></i>a seguir</span></div>
          </div>
          <div class="rows">
            <div class="row" style="padding:20px 18px;gap:20px;flex-wrap:wrap;cursor:pointer" data-open-console>
              <div style="flex:0 0 230px;min-width:0">
                <div style="font-size:15px;font-weight:600">Novo App</div>
                <div class="muted">Sistemas · Criação · TAVIR</div>
                <div class="mono" style="font-size:11px;margin-top:6px;color:var(--flow)">tavir-interno/novo-app-2dad16</div>
              </div>
              <div style="flex:1 1 380px;min-width:0;display:flex;flex-direction:column;gap:10px">
                <div style="height:8px;border-radius:999px;background:var(--line);overflow:hidden"><div style="width:100%;height:100%;background:var(--flow)"></div></div>
                <div style="display:flex;gap:8px;align-items:center;font-size:12px;flex-wrap:wrap">
                  <span class="muted">Executando agora:</span><b style="color:var(--flow)">Concluído (Handoff)</b><span class="muted">· Paulo Publicador</span>
                  <span class="badge flow" style="font-size:10px;height:19px">CURSOR · SDK</span>
                </div>
                <div class="mono" style="font-size:11px;color:var(--text-secondary);padding:5px 9px;border-radius:7px;background:var(--surface-0);border:1px solid var(--line);display:flex;align-items:center;gap:6px">
                  <span style="color:var(--flow)">🧠 Pensamento:</span>
                  <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">[Cursor] Esteira 100% concluída · artefatos validados na pasta isolada</span>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:10px"><span class="num" style="font-size:22px">100%</span><span class="badge flow">concluída</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.9"><path d="M9 6l6 6-6 6"/></svg></div>
            </div>
            <div class="row" style="padding:20px 18px;gap:20px;flex-wrap:wrap;opacity:.92">
              <div style="flex:0 0 230px;min-width:0">
                <div style="font-size:15px;font-weight:600">App Tavir</div>
                <div class="muted">Sistemas · Manutenção · TAVIR</div>
                <div class="mono" style="font-size:11px;margin-top:6px;color:var(--warning)">tavir-interno/mobile-tavir-7375fb</div>
              </div>
              <div style="flex:1 1 380px;min-width:0;display:flex;flex-direction:column;gap:10px">
                <div style="height:8px;border-radius:999px;background:var(--line);overflow:hidden"><div style="width:25%;height:100%;background:var(--warning)"></div></div>
                <div style="display:flex;gap:8px;align-items:center;font-size:12px;flex-wrap:wrap">
                  <span class="muted">Executando agora:</span><b style="color:var(--warning)">Dossiê</b><span class="muted">· Dora Descoberta</span>
                  <span class="badge flow" style="font-size:10px;height:19px">CURSOR · SDK</span>
                </div>
                <div class="mono" style="font-size:11px;color:var(--text-secondary);padding:5px 9px;border-radius:7px;background:var(--surface-0);border:1px solid var(--line);display:flex;align-items:center;gap:6px">
                  <span style="color:var(--flow)">🧠 Pensamento:</span>
                  <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">[Cursor] Execução pausada na etapa Dossiê · contexto preservado</span>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:10px"><span class="num" style="font-size:22px">25%</span><span class="badge warn">pausada</span></div>
            </div>
          </div>
        </section>
        <div class="sec-title"><h2>Templates de esteira</h2><span class="muted" style="font-size:13px">Começam com etapas, donos e critérios prontos</span></div>
        <div class="g3">
          ${['Landing Pages','Ofertas','Sistemas'].map((n,i)=>`
          <article class="card lift" style="padding:20px;display:flex;flex-direction:column;gap:12px">
            <div style="display:flex;align-items:center"><span class="eyebrow">${['LP','OF','SY'][i]}</span><div class="grow"></div><span class="badge">${[9,8,15][i]} etapas</span></div>
            <h3 style="font-size:18px;font-weight:600">${n}</h3>
            <p class="sec" style="font-size:13px">Template com isolamento Git/.env e Completion Guard.</p>
            <div style="margin-top:auto;padding-top:6px;display:flex;align-items:center"><span class="muted" style="font-size:12px">Lead: Paula PM</span><div class="grow"></div><button class="btn sm secondary" type="button">Usar esteira</button></div>
          </article>`).join('')}
        </div>
      </div>

      <!-- CONSOLE -->
      <div id="view-console" class="page screen hidden" style="max-width:1520px;gap:18px;padding-bottom:110px">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <button class="link" type="button" id="btn-back">← Esteiras</button>
          <span class="muted">/</span><span style="font-size:14px;font-weight:600">Novo App</span>
          <div class="grow"></div>
          <button class="btn sm primary" type="button" id="btn-iris-top">💬 Íris · Chat do Projeto</button>
          <button class="btn sm secondary" type="button">Absorver pasta (Product Lab)</button>
          <button class="btn sm ghost" type="button">Abrir pasta</button>
          <button class="btn sm ghost" type="button">Pausar projeto</button>
          <button class="btn sm ghost" type="button" style="color:var(--danger)">Remover projeto</button>
          <button class="btn sm ghost" type="button">Controle e Isolamento</button>
          <button class="btn sm secondary" type="button">Pedir alteração</button>
        </div>

        <section class="ink" style="padding:24px 26px;display:flex;gap:28px;flex-wrap:wrap;align-items:stretch">
          <div style="flex:2 1 340px;display:flex;flex-direction:column;gap:12px">
            <span class="eyebrow">SY-C · TAVIR</span>
            <h1 style="font-size:30px;font-weight:600;letter-spacing:-.03em;line-height:1.1">Novo App</h1>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <span class="badge flow">100% CONCLUÍDA</span>
              <span class="badge flow">ISOLAMENTO GIT/.ENV ATIVO</span>
              <span class="badge">GIT: TAVIR</span>
              <span class="badge flow" id="badge-caption">CURSOR · AUTO</span>
            </div>
            <div style="margin-top:4px;padding:10px 14px;border-radius:10px;background:rgba(7,13,24,.65);border:1px solid var(--on-ink-line);display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <span class="eyebrow" style="color:var(--teal);font-size:10px">📁 Pasta do Projeto:</span>
              <code class="mono" style="font-size:12px;color:#F4F6F2;word-break:break-all;flex:1;min-width:180px">C:\\Users\\carlo\\Downloads\\Projetos a Estudar\\tavirescritorio\\tavir-interno\\novo-app-2dad16</code>
              <button type="button" class="btn sm onink-sec" style="height:28px;padding:0 10px;font-size:11.5px">Abrir no Explorer</button>
              <button type="button" class="btn sm onink-sec" id="btn-estrutura" style="height:28px;padding:0 10px;font-size:11.5px">📁 Estrutura</button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:auto;padding-top:10px">
              <div><div class="eyebrow" style="font-size:10px">Progresso</div><div class="num" style="font-size:28px;margin-top:4px;color:var(--lime)">100%</div></div>
              <div><div class="eyebrow" style="font-size:10px">Etapa</div><div class="num" style="font-size:28px;margin-top:4px">15<span style="font-size:14px;color:var(--on-ink-muted)"> / 15</span></div></div>
              <div><div class="eyebrow" style="font-size:10px">Custo / orçamento</div><div class="num" style="font-size:16px;margin-top:8px">US$ 9,74 <span style="color:var(--on-ink-muted)">/ 25</span></div><div class="track" style="margin-top:6px;height:4px"><div class="fill" style="width:39%"></div></div></div>
            </div>
          </div>
          <div style="flex:1 1 280px;border-radius:14px;padding:18px;display:flex;flex-direction:column;gap:10px;background:rgba(27,197,189,.12);border:1px solid rgba(27,197,189,.35)">
            <div style="display:flex;align-items:center;gap:10px"><span style="width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:rgba(27,197,189,.2);color:var(--teal)">✓</span><span class="eyebrow" style="color:var(--teal)">Agora</span></div>
            <b style="font-size:17px">Esteira 100% concluída</b>
            <p style="font-size:13px;color:var(--on-ink-muted)">Todas as 15 etapas foram finalizadas. Pacote e artefatos isolados na pasta do projeto.</p>
            <div style="margin-top:auto"><button class="btn sm onink" type="button">Ver Handoff</button></div>
          </div>
        </section>

        <!-- MOTOR COMPACTO -->
        <section class="card" style="padding:12px 16px;display:flex;flex-direction:column;gap:10px;border:1px solid var(--flow-subtle-line)">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <span style="width:32px;height:32px;border-radius:9px;display:grid;place-items:center;background:var(--flow-subtle);color:var(--flow);flex:none">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 3 5 14h6l-1 7 8-11h-6z"/></svg>
            </span>
            <div class="grow" style="min-width:200px">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <span class="eyebrow" style="color:var(--flow)">Motor & execução</span>
                <span class="badge flow" style="font-size:10px;height:18px">100% CONCLUÍDO · MONITORANDO</span>
                <span class="badge flow" style="font-size:10px;height:18px" id="badge-caption-2">CURSOR · AUTO</span>
              </div>
              <div style="font-size:13.5px;font-weight:600;margin-top:2px;line-height:1.35" id="exec-headline">Esteira 100% Concluída · Monitorada por Cursor · Auto</div>
            </div>
            <span class="mono muted" style="font-size:11px">2.480 tok · 3,2 s · US$ 0,04</span>
            <button type="button" class="btn sm primary" style="height:32px" id="btn-run">▶ Executar etapa no Cursor</button>
            <button type="button" class="btn sm secondary" style="height:32px" id="btn-iris">💬 Íris</button>
            <button type="button" class="btn sm ghost" style="height:32px" id="btn-think">🧠 Ver pensamento</button>
            <button type="button" class="btn sm ghost" style="height:32px" id="btn-pasta">📁 Pasta</button>
          </div>

          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding-top:6px;border-top:1px solid var(--line)">
            <span class="eyebrow" style="font-size:9.5px">Motor (<span id="engine-count">1</span>):</span>
            <div class="segs" id="engine-segs"></div>
            <span class="eyebrow" style="font-size:9.5px">Modelo:</span>
            <div class="segs" id="model-segs"></div>
            <span class="eyebrow" style="font-size:9.5px" id="effort-label">Esforço:</span>
            <div class="segs" id="effort-segs"></div>
            <span class="muted" style="font-size:11px" id="auto-note">Auto não aplica Cost/Balance/Intelligence nesta instalação.</span>
          </div>

          <div id="thinking-panel" class="hidden" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px;animation:rise 180ms var(--ease) both">
            <div style="border-radius:10px;background:#070d18;border:1px solid rgba(27,197,189,.28);padding:10px 12px;display:flex;flex-direction:column;gap:6px;max-height:220px">
              <div style="display:flex;align-items:center;gap:8px">
                <span class="eyebrow" style="color:#1BC5BD;font-size:10px">🧠 Pensamento · <span id="think-eng">Cursor</span></span>
                <div class="grow"></div>
                <button type="button" class="btn sm ghost" id="btn-think-hide" style="height:24px;font-size:11px;padding:0 8px">Ocultar</button>
              </div>
              <div style="display:flex;flex-direction:column;gap:6px;overflow:auto" id="think-list"></div>
            </div>
            <div style="border-radius:10px;background:var(--surface-0);border:1px solid var(--line);padding:10px 12px;display:flex;flex-direction:column;gap:8px">
              <div style="display:flex;align-items:center;gap:8px"><span class="eyebrow" style="font-size:10px">Passos</span><div class="grow"></div><span class="badge flow" style="font-size:10px;height:18px">3</span></div>
              <div style="display:flex;flex-direction:column;gap:5px" id="steps-list"></div>
              <div style="display:flex;gap:8px;align-items:center;padding-top:4px;border-top:1px solid var(--line)">
                <input class="input" style="height:32px;font-size:12px;flex:1" placeholder="Instrução ao motor...">
                <button type="button" class="btn sm secondary" style="height:32px;flex:none">Injetar</button>
              </div>
            </div>
          </div>
        </section>

        <!-- TOPOLOGIA -->
        <section class="card" style="padding:18px 20px 16px">
          <div style="display:flex;align-items:center;margin-bottom:14px"><h3 style="font-size:14px;font-weight:600">Topologia da esteira</h3><div class="grow"></div><span class="muted" style="font-size:12px">Clique numa etapa para abrir o painel dela</span></div>
          <div class="noscroll" style="display:flex;align-items:flex-start;overflow-x:auto;gap:0" id="topo"></div>
        </section>

        <section class="card" style="overflow:hidden">
          <div style="padding:18px 20px;display:flex;gap:16px;align-items:center;flex-wrap:wrap">
            <span style="width:46px;height:46px;border-radius:13px;display:grid;place-items:center;background:var(--flow-subtle);color:var(--flow);flex:none">✓</span>
            <div class="grow" style="min-width:200px">
              <div class="eyebrow">Etapa 09 de 15 · CONCLUÍDA</div>
              <h2 style="font-size:22px;font-weight:600;letter-spacing:-.02em;margin-top:4px">Handoff</h2>
            </div>
            <div style="display:flex;gap:10px;align-items:center"><span class="av" style="width:34px;height:34px;font-size:10px">PP</span><div><b style="font-size:13px">Paulo Publicador</b><div class="muted" style="font-size:11.5px">Publicação e release</div></div></div>
            <button class="btn sm secondary" type="button">Refazer etapa</button>
          </div>
          <div class="tabs" style="padding:0 12px">
            <button class="tab on" type="button">Pacote de entrega</button>
            <button class="tab" type="button">Livro-razão</button>
          </div>
          <div class="rows">
            <div class="row" style="cursor:default"><span class="mono muted" style="font-size:12px">01</span><span class="grow" style="font-weight:500">Deploy na conta do cliente</span><span class="badge warn">AGUARDANDO</span></div>
            <div class="row" style="cursor:default"><span class="mono muted" style="font-size:12px">02</span><span class="grow" style="font-weight:500">Checklist de Handoff assinado</span><span class="badge flow">PRONTO</span></div>
          </div>
        </section>
      </div>
    </div>
  </main>
</div>

<!-- MODAL ESTRUTURA -->
<div id="tree-modal" class="hidden" role="dialog" aria-modal="true" style="position:fixed;inset:0;z-index:80;display:grid;place-items:center;background:rgba(7,13,24,.72);padding:24px">
  <div class="card" style="width:min(720px,100%);max-height:min(78vh,640px);display:flex;flex-direction:column;gap:12px;padding:16px 18px;border:1px solid var(--flow-subtle-line);box-shadow:var(--shadow-elevated)">
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <div class="grow" style="min-width:180px">
        <div class="eyebrow" style="color:var(--flow)">Workspace isolado</div>
        <h3 style="font-size:16px;font-weight:600;margin-top:2px">Novo App — estrutura no disco</h3>
        <div class="mono muted" style="font-size:11.5px;margin-top:2px;word-break:break-all">C:\\Users\\carlo\\Downloads\\Projetos a Estudar\\tavirescritorio\\tavir-interno\\novo-app-2dad16</div>
      </div>
      <span class="badge flow">29 pastas</span>
      <span class="badge">90 arquivos</span>
      <button type="button" class="btn sm ghost" style="height:30px">Atualizar</button>
      <button type="button" class="btn sm secondary" style="height:30px">Explorer</button>
      <button type="button" class="btn sm primary" id="btn-close-modal" style="height:30px;padding:0 12px">Fechar</button>
    </div>
    <div style="flex:1;min-height:0;overflow:auto;border-radius:10px;border:1px solid var(--line);background:var(--surface-0);padding:6px 10px" id="tree-list"></div>
  </div>
</div>

<!-- CHAT ÍRIS -->
<section id="chat-drawer" class="hidden" role="dialog" aria-label="Íris" style="position:fixed;right:24px;bottom:24px;z-index:50;width:min(440px,calc(100vw - 32px));height:min(580px,calc(100vh - 96px));display:flex;flex-direction:column;background:var(--surface-1);border:1px solid var(--flow-subtle-line);border-radius:18px;box-shadow:var(--shadow-elevated);overflow:hidden">
  <div class="ink" style="border-radius:0;border:0;padding:12px 14px;display:flex;gap:10px;align-items:center">
    <span class="av" style="width:32px;height:32px;font-size:11px;background:rgba(27,197,189,.2);color:#1BC5BD;border:1px solid rgba(27,197,189,.45)">ÍR</span>
    <div class="grow" style="min-width:0">
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        <b style="font-size:13.5px">Íris</b>
        <span class="badge flow" style="font-size:9.5px;height:18px;padding:0 6px" id="chat-badge">CURSOR · AUTO</span>
      </div>
      <div style="font-size:11px;color:var(--on-ink-muted)">Novo App · etapa Handoff</div>
    </div>
    <button type="button" class="ibtn sm" id="btn-close-chat" aria-label="Fechar" style="border-color:var(--on-ink-line);color:var(--on-ink-muted)">✕</button>
  </div>
  <div style="padding:8px 12px;border-bottom:1px solid var(--line);background:var(--surface-0)">
    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
      <span class="eyebrow" style="font-size:9.5px">Motor:</span>
      <div class="segs" id="chat-engine-segs"></div>
    </div>
  </div>
  <div style="flex:1;overflow:auto;padding:12px 14px;display:flex;flex-direction:column;gap:10px" id="chat-msgs">
    <div class="bubble ag" style="font-size:13px;max-width:94%;display:flex;flex-direction:column;gap:6px">
      <div style="display:flex;align-items:center;gap:6px"><span class="eyebrow" style="font-size:9.5px;color:var(--flow)">Íris · Cursor</span><div class="grow"></div><span class="mono muted" style="font-size:10px">07:10</span></div>
      <button type="button" class="btn sm ghost" id="btn-msg-think" style="height:24px;font-size:11px;align-self:flex-start;padding:0 8px">🧠 Ver pensamento (2)</button>
      <div id="msg-think" class="hidden" style="padding:7px 9px;border-radius:8px;background:rgba(7,13,24,.75);border-left:2px solid #1BC5BD;font-family:var(--font-mono);font-size:11px;color:#94A3B8">
        <div>• [Cursor · Auto] Conectada à pasta isolada</div>
        <div>• [Árvore] 29 pastas e 90 arquivos mapeados</div>
      </div>
      <div style="white-space:pre-line;line-height:1.5">Olá, Carlos! Sou a Íris via Cursor · Auto, conectada ao projeto "Novo App". Pergunte sobre arquivos, etapas ou peça ajustes.</div>
    </div>
  </div>
  <div style="padding:10px 12px 12px;border-top:1px solid var(--line);background:var(--surface-0);display:flex;gap:8px;align-items:center">
    <input class="input" style="border-radius:999px;height:38px;flex:1" placeholder="Pergunte à Íris..." id="chat-input">
    <button type="button" class="btn sm primary" style="height:38px;padding:0 14px;border-radius:999px;flex:none" id="btn-send">Enviar</button>
  </div>
</section>

<script>
const CATALOG = {
  cursor: { label:'Cursor', models:[
    {id:'auto', label:'Auto', efforts:['Cost','Balance','Intelligence'], note:true},
    {id:'composer', label:'Composer', efforts:['Baixo','Médio','Alto','Máximo']},
    {id:'gpt5', label:'GPT-5', efforts:['Baixo','Médio','Alto','Máximo']},
    {id:'sonnet', label:'Sonnet Thinking', efforts:['Baixo','Médio','Alto','Máximo']},
  ]},
  claude: { label:'Claude', models:[
    {id:'opus', label:'Opus 5.5', efforts:['Baixo','Médio','Alto']},
    {id:'sonnet5', label:'Sonnet 5', efforts:['Baixo','Médio','Alto']},
  ]},
  codex: { label:'Codex', models:[
    {id:'gpt5c', label:'GPT-5 Codex', efforts:['Baixo','Médio','Alto']},
  ]},
  antigravity: { label:'Antigravity', models:[
    {id:'pro', label:'Gemini 2.5 Pro', efforts:['Baixo','Médio','Alto']},
    {id:'flash', label:'Gemini 2.5 Flash', efforts:['Baixo','Médio','Alto']},
  ]},
};
// Preview: 1 motor ativo (como nas suas configs)
const ENABLED = ['cursor'];
let state = { engine:'cursor', model:'auto', effort:'Balance', think:false, chat:false, modal:false, msgThink:false };

const STAGES = ['Entender','Refinar','Dossiê','Arquitetura','Construção','QA','Security','SEO','Handoff'];
const TREE = [
  {p:'.tavir/', d:true, pad:10},
  {p:'.tavir/iris-chat.json', d:false, pad:28, ext:'JSON', sz:'4,3 KB'},
  {p:'.tavir/isolation.json', d:false, pad:28, ext:'JSON', sz:'1,2 KB'},
  {p:'.tavir/project.json', d:false, pad:28, ext:'JSON', sz:'890 B'},
  {p:'aplicativo/', d:true, pad:10},
  {p:'aplicativo/android/', d:true, pad:28},
  {p:'aplicativo/android/build.gradle.kts', d:false, pad:46, ext:'KTS', sz:'530 B'},
  {p:'aplicativo/lib/', d:true, pad:28},
  {p:'memory/', d:true, pad:10},
  {p:'context/', d:true, pad:10},
];

function caption(){
  const m = CATALOG[state.engine];
  const model = m.models.find(x=>x.id===state.model) || m.models[0];
  if(model.id==='auto') return m.label+' · '+model.label;
  return m.label+' · '+model.label+' · '+state.effort;
}
function syncCaption(){
  const c = caption().toUpperCase().replace(/ · /g,' · ');
  ['badge-caption','badge-caption-2','chat-badge'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.textContent=c;
  });
  const h=document.getElementById('exec-headline');
  if(h) h.textContent='Esteira 100% Concluída · Monitorada por '+caption();
  const te=document.getElementById('think-eng'); if(te) te.textContent=CATALOG[state.engine].label;
  const run=document.getElementById('btn-run'); if(run) run.textContent='▶ Executar etapa no '+CATALOG[state.engine].label;
  document.getElementById('engine-count').textContent=ENABLED.length;
}
function renderSegs(){
  const engBox=document.getElementById('engine-segs');
  engBox.innerHTML=ENABLED.map(id=>{
    const on=state.engine===id?'on':'';
    return '<button type="button" class="seg '+on+'" data-eng="'+id+'" style="height:26px;font-size:11.5px">'+CATALOG[id].label+'</button>';
  }).join('');
  engBox.querySelectorAll('[data-eng]').forEach(b=>b.onclick=()=>{
    state.engine=b.dataset.eng;
    state.model=CATALOG[state.engine].models[0].id;
    state.effort=CATALOG[state.engine].models[0].efforts[1]||CATALOG[state.engine].models[0].efforts[0];
    renderSegs(); syncCaption(); renderThink();
  });
  const chatEng=document.getElementById('chat-engine-segs');
  if(chatEng){
    chatEng.innerHTML=ENABLED.map(id=>'<button type="button" class="seg '+(state.engine===id?'on':'')+'" data-ceng="'+id+'" style="height:24px;font-size:11px;padding:0 8px">'+CATALOG[id].label+'</button>').join('');
    chatEng.querySelectorAll('[data-ceng]').forEach(b=>b.onclick=()=>{state.engine=b.dataset.ceng;state.model=CATALOG[state.engine].models[0].id;renderSegs();syncCaption();});
  }
  const models=CATALOG[state.engine].models;
  const model=models.find(x=>x.id===state.model)||models[0];
  state.model=model.id;
  const modBox=document.getElementById('model-segs');
  modBox.innerHTML=models.map(m=>'<button type="button" class="seg '+(state.model===m.id?'on':'')+'" data-model="'+m.id+'" style="height:26px;font-size:11.5px">'+m.label+'</button>').join('');
  modBox.querySelectorAll('[data-model]').forEach(b=>b.onclick=()=>{
    state.model=b.dataset.model;
    const mm=models.find(x=>x.id===state.model);
    state.effort=mm.efforts.includes(state.effort)?state.effort:(mm.efforts[1]||mm.efforts[0]);
    renderSegs(); syncCaption();
  });
  const effBox=document.getElementById('effort-segs');
  const note=document.getElementById('auto-note');
  const elab=document.getElementById('effort-label');
  effBox.innerHTML=model.efforts.map(e=>'<button type="button" class="seg '+(state.effort===e?'on':'')+'" data-eff="'+e+'" style="height:26px;font-size:11.5px">'+e+'</button>').join('');
  effBox.querySelectorAll('[data-eff]').forEach(b=>b.onclick=()=>{state.effort=b.dataset.eff;renderSegs();syncCaption();});
  note.style.display=model.note?'':'none';
}
function renderThink(){
  const panel=document.getElementById('thinking-panel');
  const btn=document.getElementById('btn-think');
  panel.classList.toggle('hidden', !state.think);
  if(state.think) panel.style.display='grid'; else panel.style.display='none';
  btn.textContent=state.think?'Ocultar pensamento':'🧠 Ver pensamento';
  const list=document.getElementById('think-list');
  const eng=CATALOG[state.engine].label;
  list.innerHTML=[
    '['+eng+'] $ agent --output-format stream-json --workspace ".../novo-app-2dad16" --model '+(state.model==='auto'?'auto-smart':state.model)+' · '+caption(),
    '[WORKSPACE] Pasta isolada conectada (29 pastas · 90 arquivos · Flutter / Mobile)',
    '[PENSAMENTO] Esteira 100% concluída. Monitorando integridade dos artefatos de Handoff.'
  ].map((t,i)=>'<div style="font-family:var(--font-mono);font-size:11.5px;line-height:1.45;color:#E2E8F0;padding:5px 8px;border-radius:7px;background:rgba(15,23,41,.85);border-left:2px solid #1BC5BD"><div style="display:flex;gap:8px;font-size:10px;color:#94A3B8;margin-bottom:2px"><b style="color:#1BC5BD">['+eng.toUpperCase()+']</b><span>#'+(i+1)+'</span></div><div>'+t+'</div></div>').join('');
  document.getElementById('steps-list').innerHTML=[
    ['✓','SDK local conectado: '+eng, caption().split(' · ')[1]||'Auto','var(--flow)'],
    ['✓','Leitura da árvore física e isolamento','29 pastas · 90 arq','var(--flow)'],
    ['✓','Todas as etapas da esteira finalizadas','100%','var(--flow)'],
  ].map(s=>'<div style="display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:7px;background:var(--surface-1);border:1px solid var(--line);font-size:12px"><span class="mono" style="color:'+s[3]+';font-weight:700">'+s[0]+'</span><span class="grow" style="font-weight:500">'+s[1]+'</span><span class="mono muted" style="font-size:10.5px">'+s[2]+'</span></div>').join('');
}
function renderTopo(){
  const box=document.getElementById('topo');
  box.innerHTML=STAGES.map((label,i)=>{
    const done=true;
    return '<div style="display:flex;align-items:flex-start;flex:1;min-width:0">'+(i? '<div style="flex:1;min-width:8px;height:2px;margin-top:21px;background:var(--flow)"></div>':'')+
      '<button type="button" style="flex:none;width:84px;display:flex;flex-direction:column;align-items:center;gap:6px;background:transparent;border:0;color:inherit;padding:0 0 8px;text-align:center;position:relative">'+
      '<span style="width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:var(--flow-subtle);color:var(--flow);border:2px solid var(--flow-subtle-line)">✓</span>'+
      '<b style="font-size:12px;white-space:nowrap">'+label+'</b>'+
      '<span class="mono" style="font-size:10px;color:var(--text-muted)">ok</span>'+
      '<i style="position:absolute;bottom:0;left:22px;right:22px;height:3px;border-radius:3px;background:'+(i===8?'var(--flow)':'transparent')+'"></i>'+
      '</button></div>';
  }).join('');
}
function renderTree(){
  document.getElementById('tree-list').innerHTML=TREE.map(item=>
    '<div style="display:flex;align-items:center;gap:10px;padding:6px 8px;padding-left:'+item.pad+'px;border-bottom:1px solid var(--line);font-size:12.5px">'+
    '<span class="mono" style="color:'+(item.d?'var(--flow)':'var(--text-secondary)')+'">'+(item.d?'📁':'📄')+'</span>'+
    '<b class="mono" style="font-weight:'+(item.d?'600':'400')+';color:'+(item.d?'var(--text-primary)':'var(--text-secondary)')+'">'+item.p+'</b>'+
    '<div class="grow"></div>'+
    '<span class="badge '+(item.d?'flow':'')+'" style="font-size:10px;height:18px;padding:0 6px">'+(item.d?'DIR':(item.ext||'FILE'))+'</span>'+
    '<span class="mono muted" style="font-size:10.5px;min-width:56px;text-align:right">'+(item.sz||(item.d?'pasta':''))+'</span></div>'
  ).join('');
}
function show(view){
  document.getElementById('view-list').classList.toggle('hidden', view!=='list');
  document.getElementById('view-console').classList.toggle('hidden', view!=='console');
}
function setModal(on){
  state.modal=on;
  const m=document.getElementById('tree-modal');
  m.classList.toggle('hidden', !on);
  m.style.display=on?'grid':'none';
}
function setChat(on){
  state.chat=on;
  const c=document.getElementById('chat-drawer');
  c.classList.toggle('hidden', !on);
  c.style.display=on?'flex':'none';
}

document.querySelectorAll('[data-open-console]').forEach(el=>el.onclick=()=>show('console'));
document.getElementById('btn-back').onclick=()=>show('list');
document.getElementById('btn-think').onclick=()=>{state.think=!state.think;renderThink();};
document.getElementById('btn-think-hide').onclick=()=>{state.think=false;renderThink();};
document.getElementById('btn-estrutura').onclick=()=>setModal(true);
document.getElementById('btn-pasta').onclick=()=>setModal(true);
document.getElementById('btn-close-modal').onclick=()=>setModal(false);
document.getElementById('btn-iris').onclick=()=>setChat(true);
document.getElementById('btn-iris-top').onclick=()=>setChat(true);
document.getElementById('btn-close-chat').onclick=()=>setChat(false);
document.getElementById('btn-msg-think').onclick=()=>{
  state.msgThink=!state.msgThink;
  document.getElementById('msg-think').classList.toggle('hidden', !state.msgThink);
  document.getElementById('btn-msg-think').textContent=state.msgThink?'Ocultar pensamento (2)':'🧠 Ver pensamento (2)';
};
document.getElementById('btn-send').onclick=()=>{
  const inp=document.getElementById('chat-input');
  const t=inp.value.trim(); if(!t) return;
  const box=document.getElementById('chat-msgs');
  box.insertAdjacentHTML('beforeend','<div class="bubble me" style="font-size:13px;max-width:94%"><div class="eyebrow" style="font-size:9.5px;margin-bottom:4px">Carlos</div>'+t+'</div>');
  inp.value='';
  setTimeout(()=>{
    box.insertAdjacentHTML('beforeend','<div class="bubble ag" style="font-size:13px;max-width:94%"><div class="eyebrow" style="font-size:9.5px;color:var(--flow);margin-bottom:4px">Íris · '+CATALOG[state.engine].label+'</div>Recebi "'+t+'" no contexto de Novo App via '+caption()+'. Diretriz vinculada à etapa Handoff.</div>');
    box.scrollTop=box.scrollHeight;
  },400);
};

renderSegs(); syncCaption(); renderThink(); renderTopo(); renderTree();
setModal(false); setChat(false); show('list');
</script>
</body>
</html>`;

const out = path.join(root, 'preview_fabrica.html');
fs.writeFileSync(out, html, 'utf8');
console.log('Gerado:', out);
console.log('Tamanho:', (Buffer.byteLength(html)/1024).toFixed(1), 'KB');
