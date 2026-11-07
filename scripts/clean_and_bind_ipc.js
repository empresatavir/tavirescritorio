const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const refPathExternal = 'C:/Users/carlo/Downloads/Referencias/novo/TAVIR-Escritorio-redesenho.html';
const refPathLocal = path.resolve(__dirname, '../src/renderer/reference_app.html');
let html;
try {
  html = fs.readFileSync(refPathExternal, 'utf8');
} catch {
  html = fs.readFileSync(refPathLocal, 'utf8');
}

// ==========================================
// 1. LIMPAR SUB-PÁGINAS DO __bundler/manifest
// ==========================================
const manifestRegex = /<script type="__bundler\/manifest">([\s\S]*?)<\/script>/i;
const manifestMatch = manifestRegex.exec(html);

if (!manifestMatch) {
  throw new Error('Script __bundler/manifest não encontrado!');
}

const manifest = JSON.parse(manifestMatch[1]);
console.log('Manifest lido com sucesso. Total de chaves:', Object.keys(manifest).length);

// 1.1 Limpar ae920b1d (Comercial: Propostas, Funil, Finanças)
const comUuid = 'ae920b1d-0f39-48c2-94d5-5b23ec5f507f';
if (manifest[comUuid] && manifest[comUuid].compressed) {
  const buf = Buffer.from(manifest[comUuid].data, 'base64');
  let comHtml = zlib.gunzipSync(buf).toString('utf8');

  // Limpar PROPS mockadas (Atlas, Meridian, etc.)
  const origPropsIdx = comHtml.indexOf('const PROPS = [');
  if (origPropsIdx !== -1) {
    const origPropsEnd = comHtml.indexOf('];', origPropsIdx);
    comHtml = comHtml.slice(0, origPropsIdx) + 'const PROPS = [];' + comHtml.slice(origPropsEnd + 2);
    console.log('PROPS limpos no Comercial!');
  }

  // Fallback seguro para P quando PROPS está vazio
  const origP = "const P = PROPS.find((x) => x.id === s.p);";
  const safeP = "const P = PROPS.find((x) => x.id === s.p) || PROPS[0] || { id: '', num: '—', client: 'Nenhuma proposta', value: 'R$ 0,00', short: '—', cls: '', ver: 1, status: 'Nenhuma proposta cadastrada no momento', terms: '—', link: '', step: 0, dates: ['—','—','—','—','—'], acts: [] };";
  comHtml = comHtml.replace(origP, safeP);

  // Limpar deals (Negócios vivos)
  const origDealsIdx = comHtml.indexOf('deals: [');
  if (origDealsIdx !== -1) {
    const origDealsEnd = comHtml.indexOf('].map((d)', origDealsIdx);
    comHtml = comHtml.slice(0, origDealsIdx) + 'deals: [].map((d)' + comHtml.slice(origDealsEnd + 9);
    console.log('Deals limpos no Comercial!');
  }

  // Limpar margins (Margem por projeto)
  const origMarginsIdx = comHtml.indexOf('margins: [');
  if (origMarginsIdx !== -1) {
    const origMarginsEnd = comHtml.indexOf('].map((m)', origMarginsIdx);
    comHtml = comHtml.slice(0, origMarginsIdx) + 'margins: [].map((m)' + comHtml.slice(origMarginsEnd + 9);
    console.log('Margins limpos no Comercial!');
  }

  // Conectar com IPC do Electron se disponível
  const oldComMount = "constructor(props) { super(props); this.state = { v: 'funil', p: 'p1' }; }";
  const newComMount = `constructor(props) {
    super(props);
    this.state = { v: 'funil', p: '' };
    const self = this;
    const tavir = (typeof window !== 'undefined' && (window.tavir || (window.parent && window.parent.tavir))) || null;
    if (tavir && tavir.proposals) {
      tavir.proposals.list().then(function(list) {
        if (Array.isArray(list) && list.length) {
          self.setState({ props: list });
        }
      }).catch(function(e) { console.error('Erro proposals:', e); });
    }
  }`;
  if (comHtml.includes(oldComMount)) {
    comHtml = comHtml.replace(oldComMount, newComMount);
  }

  manifest[comUuid].data = zlib.gzipSync(Buffer.from(comHtml, 'utf8')).toString('base64');
  console.log('Comercial limpo e atualizado!');
}

// 1.2 Fábrica: layout de referência (Fábrica-html) + IPC SQLite
const fabUuid = '6dd69d42-d13a-4290-9e3c-b0c4bc77a500';
if (manifest[fabUuid] && manifest[fabUuid].compressed) {
  const fabRefCandidates = [
    path.resolve(__dirname, '../src/renderer/fabrica-ref/Fabrica.dc.html'),
    'C:/Users/carlo/Downloads/Referencias/Fábrica-html/Fabrica.dc.html',
  ];
  let fabHtml = null;
  let fabFromRef = false;
  for (const cand of fabRefCandidates) {
    try {
      fabHtml = fs.readFileSync(cand, 'utf8');
      fabFromRef = true;
      console.log('Fábrica: layout de referência carregado de', cand);
      break;
    } catch {
      /* tenta próximo */
    }
  }
  if (!fabHtml) {
    const buf = Buffer.from(manifest[fabUuid].data, 'base64');
    fabHtml = zlib.gunzipSync(buf).toString('utf8');
    console.log('Fábrica: fallback para fragmento legado do manifest');
  }

  if (fabFromRef) {
    // Bundler já fornece React — remove vendors do mockup
    fabHtml = fabHtml.replace(/<script src="\.\/vendor\/react\.js"><\/script>\s*/g, '');
    fabHtml = fabHtml.replace(/<script src="\.\/vendor\/react-dom\.js"><\/script>\s*/g, '');

    // Remove showcase Meridian + demos GP do painel — só absorbed (IPC/SQLite)
    {
      const plMark = "    const PL = [{\n      id: 'meridian'";
      const gpMark = '    GP.concat(s.absorbed).forEach((g) => {';
      const plIdx = fabHtml.indexOf(plMark);
      const gpIdx = fabHtml.indexOf(gpMark);
      if (plIdx !== -1 && gpIdx !== -1 && gpIdx > plIdx) {
        fabHtml =
          fabHtml.slice(0, plIdx) +
          '    const PL = [];\n    (s.absorbed || []).forEach((g) => {' +
          fabHtml.slice(gpIdx + gpMark.length);
        console.log('Fábrica: fixtures Meridian/GP removidos do painel');
      }
    }

    // Esvazia GP demo depois de TPL_STAGES capturar as esteiras (templates ficam; painel não)
    {
      const tplMark =
        "const TPL_STAGES = { 'LP-C1': STG.map((x, i) => [x[0], x[1], x[3], [1, 1, 1, 1, 2, 1, 2, 2, 2][i]]), 'LP-M1': GP.find((g) => g.id === 'advocacia').stages, 'OF-C1': GP.find((g) => g.id === 'oferta').stages, 'OF-M0': OF_M0, 'SY-C1': SY_C1, 'SY-M1': SY_M1 };";
      if (fabHtml.includes(tplMark)) {
        fabHtml = fabHtml.replace(
          tplMark,
          tplMark + '\nGP.splice(0, GP.length); Object.keys(GP_INIT).forEach((k) => { delete GP_INIT[k]; });',
        );
        console.log('Fábrica: GP demo esvaziado após TPL_STAGES');
      }
    }

    // findG prioriza projetos reais do SQLite
    fabHtml = fabHtml.replace(
      'findG(id) { return GP.find((x) => x.id === id) || this.state.absorbed.find((x) => x.id === id); }',
      'findG(id) { return (this.state.absorbed || []).find((x) => x.id === id) || GP.find((x) => x.id === id); }',
    );

    // Nunca forçar pid Meridian (topology / goStage)
    fabHtml = fabHtml.replace(
      "const pid = spot === 'topology' ? 'meridian' : s.pid;",
      'const pid = s.pid;',
    );
    fabHtml = fabHtml.replace(
      "const goStage = (i, t) => { const tb = Object.assign({}, s.tabs); if (t) tb[i] = t; self.setState({ stage: i, tabs: tb, pid: 'meridian', ptab: 'esteira' }); };",
      'const goStage = (i, t) => { const tb = Object.assign({}, s.tabs); if (t) tb[i] = t; self.setState({ stage: i, tabs: tb, ptab: \'esteira\' }); };',
    );

    // Estado + workspace real via inspectFolder
    fabHtml = fabHtml.replace(
      'absorbed: [], treeClosed: {}',
      'absorbed: [], ipcFiles: [], treeClosed: {}',
    );
    fabHtml = fabHtml.replace(
      "const openProj = (id, tb) => self.setState({ pid: id, ptab: tb || 'geral', ff: 'all', menu: false, cfgOpen: false, evf: 'all', repF: 'all', sevF: 'all', credF: 'all', evw: null });",
      `const openProj = (id, tb) => {
      self.setState({ pid: id, ptab: tb || 'geral', ff: 'all', menu: false, cfgOpen: false, evf: 'all', repF: 'all', sevF: 'all', credF: 'all', evw: null, ipcFiles: [] });
      if (self.loadIpcFiles) self.loadIpcFiles(id);
    };`,
    );
    fabHtml = fabHtml.replace(
      'const pFiles = FILES.filter((f) => isM ? !f.proj : f.proj === P.id);',
      'const pFiles = (s.ipcFiles && s.ipcFiles.length && P && P.id && !isM) ? s.ipcFiles.filter((f) => f.proj === P.id) : FILES.filter((f) => isM ? !f.proj : f.proj === P.id);',
    );
    fabHtml = fabHtml.replace(
      'const VF = s.viewer ? FILES.find((f) => f.id === s.viewer) : null;',
      "const VF = s.viewer ? (FILES.find((f) => f.id === s.viewer) || (s.ipcFiles || []).find((f) => f.id === s.viewer)) : null;",
    );
    fabHtml = fabHtml.replace(
      'const openFile = (id) => self.setState({ viewer: id, zoom: 1, mdMode: \'view\', csvMode: \'table\' });',
      `const openFile = (id) => {
      self.setState({ viewer: id, zoom: 1, mdMode: 'view', csvMode: 'table' });
      const hit = (self.state.ipcFiles || []).find(function(f) { return f.id === id; });
      if (hit && hit.fullPath && self.ensureIpcFileText) self.ensureIpcFileText(hit);
    };`,
    );

    // KPIs seguros com lista vazia
    fabHtml = fabHtml.replace(
      'const avg = Math.round(PL.reduce((a, p) => a + p.pct, 0) / PL.length);',
      'const avg = PL.length ? Math.round(PL.reduce((a, p) => a + p.pct, 0) / PL.length) : 0;',
    );
    fabHtml = fabHtml.replace(
      "['Projetos ativos', String(runN), PL.length + ' no total', 'var(--text-primary)', Math.round(runN / PL.length * 100), 'run', 'run'],",
      "['Projetos ativos', String(runN), PL.length + ' no total', 'var(--text-primary)', Math.round(runN / (PL.length || 1) * 100), 'run', 'run'],",
    );
    fabHtml = fabHtml.replace(
      "['Completion Guard', guardOk + ' de ' + PL.length, 'projetos com 8/8 no QA', 'var(--flow)', Math.round(guardOk / PL.length * 100), 'run', 'done']",
      "['Completion Guard', guardOk + ' de ' + PL.length, 'projetos com 8/8 no QA', 'var(--flow)', Math.round(guardOk / (PL.length || 1) * 100), 'run', 'done']",
    );
    fabHtml = fabHtml.replace(
      'Nenhum projeto neste filtro.',
      'Nenhum projeto no SQLite. Use Novo projeto ou Absorver pasta.',
    );

    // Sem chat mock da Meridian
    fabHtml = fabHtml.replace(
      "chat: false, unread: 2, typing: false, draft: '', msgs: [['Yuri UX', 'A hero ainda compete com o menu em 390 px. Proponho cortar o subtítulo e virar o menu ícone.', 'ag'], ['Vitor Construtor', 'Ajuste pronto no branch hero-390. Preciso da prova visual de novo.', 'ag']]",
      "chat: false, unread: 0, typing: false, draft: '', msgs: []",
    );

    // Absorver via modal IPC do Escritório
    fabHtml = fabHtml.replace(
      "const openAbsorb = () => self.setState({ menu: false, abs: Object.assign({}, A, { open: true, step: 'path', tpl: null, name: '', logN: 0 }) });",
      "const openAbsorb = () => { self.setState({ menu: false }); if (app && app.modal) app.modal('factory-absorb', { tpl: 'Sistemas', mode: 'Manutenção' }); else self.setState({ abs: Object.assign({}, A, { open: true, step: 'path', tpl: null, name: '', logN: 0 }) }); };",
    );

    // Explorer real via IPC
    fabHtml = fabHtml.replace(
      "const openExplorer = () => { self.setState({ menu: false }); app.toast('Explorer aberto', P.path); };",
      `const openExplorer = () => {
      self.setState({ menu: false });
      const tavir = (typeof window !== 'undefined' && (window.tavir || (window.parent && window.parent.tavir))) || null;
      const target = P.path || P.slug || P.id;
      if (tavir && tavir.projects && tavir.projects.openInExplorer) {
        tavir.projects.openInExplorer(target).then(function(res) {
          app.toast(res && res.ok === false ? 'Não foi possível abrir' : 'Explorer aberto', String(target));
        }).catch(function() { app.toast('Explorer', String(target)); });
      } else app.toast('Explorer', String(target));
    };`,
    );

    // Pausar/retomar no SQLite
    fabHtml = fabHtml.replace(
      `togglePause(id) {
    const s = this.state; const app = this.props.app || NOOP;
    if (id === 'meridian') { this.setState({ mPaused: !s.mPaused }); app.toast(s.mPaused ? 'Esteira retomada' : 'Esteira pausada', 'Landing Meridian Capital'); return; }
    const g = this.findG(id); const d = Object.assign({}, s.gp[id]); if (d.cur >= g.stages.length) return;
    d.paused = !d.paused; d.extra = [[hm(), d.paused ? 'Esteira pausada' : 'Esteira retomada', 'Carlos Henrique']].concat(d.extra);
    const gp = Object.assign({}, s.gp); gp[id] = d; this.setState({ gp: gp }); app.toast(d.paused ? 'Esteira pausada' : 'Esteira retomada', g.name);
  }`,
      `togglePause(id) {
    const s = this.state; const app = this.props.app || NOOP;
    const g = this.findG(id); if (!g) return;
    const d = Object.assign({ cur: 0, paused: false, resolved: {}, extra: [] }, s.gp[id] || {});
    if (d.cur >= g.stages.length && !d.paused) return;
    d.paused = !d.paused;
    d.extra = [[hm(), d.paused ? 'Esteira pausada' : 'Esteira retomada', 'Carlos Henrique']].concat(d.extra || []);
    const gp = Object.assign({}, s.gp); gp[id] = d; this.setState({ gp: gp });
    const tavir = (typeof window !== 'undefined' && (window.tavir || (window.parent && window.parent.tavir))) || null;
    if (tavir && tavir.projects && tavir.projects.updateStatus) {
      tavir.projects.updateStatus(id, d.paused ? 'paused' : 'running').catch(function() {});
    }
    app.toast(d.paused ? 'Esteira pausada' : 'Esteira retomada', g.name);
  }`,
    );

    // Remover projeto via IPC (permite lista ficar vazia)
    fabHtml = fabHtml.replace(
      "rmConfirm: () => { if (PL.length <= 1) { app.toast('Não dá para remover', 'O painel precisa de pelo menos um projeto.'); return; } const rmv = Object.assign({}, s.removed); rmv[P.id] = true; self.setState({ removed: rmv, rmOpen: false, pid: null, lastRm: [P.id, P.name], chat: false }); app.toast('Projeto removido', P.name + ' saiu do painel. A pasta no disco foi mantida.'); },",
      `rmConfirm: () => {
        const projId = P.id; const projName = P.name; const projPath = P.path || P.slug;
        const tavir = (typeof window !== 'undefined' && (window.tavir || (window.parent && window.parent.tavir))) || null;
        const finish = function() {
          const rmv = Object.assign({}, self.state.removed); rmv[projId] = true;
          self.setState({ removed: rmv, rmOpen: false, pid: null, lastRm: [projId, projName], chat: false });
          if (self.reloadIpcProjects) self.reloadIpcProjects();
          app.toast('Projeto removido', projName + ' saiu do painel. A pasta no disco foi mantida.');
        };
        if (tavir && tavir.projects && tavir.projects.delete) {
          tavir.projects.delete(projId, false, projPath).then(finish).catch(finish);
        } else finish();
      },`,
    );

    // Carrega só projetos reais do SQLite
    fabHtml = fabHtml.replace(
      'componentWillUnmount() { clearTimeout(this.t1); clearTimeout(this.t2); clearTimeout(this.t3); (this.tms || []).forEach((x) => clearTimeout(x)); clearInterval(this.vi); Object.keys(this).forEach((k) => { if (/^pi(qa|sec):/.test(k)) clearInterval(this[k]); }); }',
      `componentDidMount() {
    const self = this;
    const getTavir = function() {
      return (typeof window !== 'undefined' && (window.tavir || (window.parent && window.parent.tavir))) || null;
    };
    const normTpl = function(raw) {
      const t = String(raw || 'lp-c').toLowerCase().replace(/_/g, '-');
      if (t === 'sy-c' || t === 'sy-c1') return 'SY-C1';
      if (t === 'sy-m' || t === 'sy-m1') return 'SY-M1';
      if (t === 'of-c' || t === 'of-c1') return 'OF-C1';
      if (t === 'of-m' || t === 'of-m0') return 'OF-M0';
      if (t === 'lp-m' || t === 'lp-m1') return 'LP-M1';
      if (t.indexOf('sy') === 0) return t.indexOf('m') >= 0 ? 'SY-M1' : 'SY-C1';
      if (t.indexOf('of') === 0) return t.indexOf('m') >= 0 ? 'OF-M0' : 'OF-C1';
      return t.indexOf('m') >= 0 ? 'LP-M1' : 'LP-C1';
    };
    this.ensureIpcFileText = function(file) {
      if (!file || !file.fullPath) return;
      if (self.state.saved && self.state.saved[file.id] != null) return;
      if (self.state.edits && self.state.edits[file.id] != null) return;
      const tavir = getTavir();
      if (!tavir || !tavir.projects || !tavir.projects.readFile) return;
      tavir.projects.readFile(file.fullPath).then(function(res) {
        if (!res || res.ok === false) return;
        const sv = Object.assign({}, self.state.saved || {});
        sv[file.id] = String(res.content || '');
        const ipcFiles = (self.state.ipcFiles || []).map(function(f) {
          return f.id === file.id ? Object.assign({}, f, { text: sv[file.id], size: res.size ? String(res.size) : f.size }) : f;
        });
        self.setState({ saved: sv, ipcFiles: ipcFiles });
      }).catch(function() {});
    };
    this.loadIpcFiles = function(id) {
      if (!id) return;
      const tavir = getTavir();
      const g = (self.state.absorbed || []).find(function(x) { return x.id === id; });
      const key = (g && (g.local_path || g.id)) || id;
      if (!tavir || !tavir.projects || !tavir.projects.inspectFolder) return;
      tavir.projects.inspectFolder(key).then(function(info) {
        if (!info || info.exists === false) {
          self.setState({ ipcFiles: [] });
          return;
        }
        const files = [];
        (info.tree || []).forEach(function(n) {
          if (!n || n.isDir) return;
          const rel = String(n.relPath || n.name || '').replace(/\\\\/g, '/');
          const parts = rel.split('/').filter(Boolean);
          const name = parts.pop() || n.name || 'arquivo';
          const dir = parts.length ? parts.join('/') + '/' : '';
          const ext = (name.split('.').pop() || '').toLowerCase();
          const kind = ext === 'md' ? 'md' : ext === 'csv' ? 'csv' : ext === 'json' ? 'json' : /png|jpe?g|gif|webp|svg/.test(ext) ? 'img' : 'code';
          files.push({
            id: n.fullPath || rel,
            proj: id,
            name: name,
            dir: dir,
            stage: -1,
            kind: kind,
            lang: ext ? ext.toUpperCase() : 'TXT',
            by: 'disco',
            when: '',
            size: n.sizeLabel || (n.size != null ? String(n.size) : ''),
            text: '',
            fullPath: n.fullPath || null,
            ro: false
          });
        });
        const dirs = Number(info.dirCount) || 0;
        const fileN = Number(info.fileCount) || files.length;
        const absorbed = (self.state.absorbed || []).map(function(p) {
          if (p.id !== id) return p;
          return Object.assign({}, p, {
            disk: [dirs, fileN, (p.disk && p.disk[2]) || 'pasta isolada'],
            local_path: info.rootPath || p.local_path
          });
        });
        self.setState({ ipcFiles: files, absorbed: absorbed });
      }).catch(function(err) { console.error('[Fábrica] falha ao inspecionar pasta:', err); });
    };
    this.reloadIpcProjects = function() {
      const tavir = getTavir();
      if (!tavir || !tavir.projects || !tavir.projects.list) return;
      tavir.projects.list().then(function(rows) {
        const list = Array.isArray(rows) ? rows : [];
        const absorbed = [];
        const gp = {};
        list.forEach(function(p) {
          if (!p || !p.id) return;
          const total = Math.max(1, Number(p.total_stages) || 9);
          const done = Math.min(total, Math.max(0, Number(p.stages_done) || 0));
          const code = normTpl(p.template_code);
          const stages = (typeof TPL_STAGES !== 'undefined' && TPL_STAGES[code])
            ? TPL_STAGES[code]
            : (typeof STG !== 'undefined' ? STG.map(function(x, i) { return [x[0], x[1], x[3], [1,1,1,1,2,1,2,2,2][i] || 1]; }) : [['Início', 'Paula PM', 'orquestração', 1]]);
          const st = String(p.status || '').toLowerCase();
          const fullPath = String(p.local_path || p.slug || p.id || '');
          const rootFlat = String(typeof ROOT !== 'undefined' ? ROOT : '').replace(/\\\\/g, '/').toLowerCase();
          const fullFlat = fullPath.replace(/\\\\/g, '/');
          let relSlug = fullPath;
          if (rootFlat && fullFlat.toLowerCase().indexOf(rootFlat) === 0) {
            relSlug = fullPath.slice(String(ROOT).length).replace(/^[\\\\/]+/, '');
          } else {
            relSlug = fullPath.split(/[\\\\/]/).filter(Boolean).slice(-2).join('/');
          }
          absorbed.push({
            id: p.id,
            name: p.name || 'Projeto',
            code: code.slice(0, 4),
            line: code,
            kind: code.indexOf('OF') === 0 ? 'Ofertas' : code.indexOf('SY') === 0 ? 'Sistemas' : 'LPs · Criação',
            client: p.company || p.client || '—',
            guard: st === 'done' || st === 'completed' || done >= total ? 8 : Math.min(7, Math.round((done / total) * 8)),
            base: [2026, 1, 1],
            pauseNote: 'Contexto preservado na pasta isolada.',
            tags: [['code', p.stack || 'Stack local']],
            stages: stages,
            pends: [],
            acts: [['agora', 'Sincronizado do SQLite', 'Sistema']],
            inv: [['Etapas', String(total)], ['Feitas', String(done)], ['Status', p.status || 'run'], ['Pasta', relSlug.replace(/\\\\/g, '/')]],
            env: [],
            target: 'local · tavir',
            acc: [],
            people: [['CH', 'Carlos Henrique', 'CEO · aprovador', 'admin']],
            slug: relSlug,
            git: 'TAVIR',
            cost: [0, 25],
            disk: [6, 12, 'pasta isolada'],
            tok0: [0, 0, 0],
            think: p.description || (done >= total ? 'Esteira concluída' : 'Em execução'),
            local_path: p.local_path || null,
            alterations_open: false
          });
          gp[p.id] = { cur: done, paused: st === 'paused', resolved: {}, extra: [] };
        });
        const keepPid = self.state.pid && absorbed.some(function(x) { return x.id === self.state.pid; }) ? self.state.pid : null;
        self.setState({ absorbed: absorbed, gp: gp, pid: keepPid, removed: {} });
        if (keepPid && self.loadIpcFiles) self.loadIpcFiles(keepPid);
        // Carrega controle Liberar/Fechar alterações por projeto
        absorbed.forEach(function(proj) {
          const key = proj.local_path || proj.id;
          if (!tavir.projects.getAlterationsControl) return;
          tavir.projects.getAlterationsControl(key).then(function(ctrl) {
            if (!ctrl || !ctrl.ok) return;
            const open = !!ctrl.alterations_open;
            const nextAbs = (self.state.absorbed || []).map(function(p) {
              return p.id === proj.id ? Object.assign({}, p, { alterations_open: open }) : p;
            });
            const altMap = Object.assign({}, self.state.altOpen || {});
            altMap[proj.id] = open;
            const trackMap = Object.assign({}, self.state.altTrack || {});
            if (ctrl.alt_track) trackMap[proj.id] = ctrl.alt_track;
            self.setState({ absorbed: nextAbs, altOpen: altMap, altTrack: trackMap });
          }).catch(function() {});
        });
      }).catch(function(err) { console.error('[Fábrica] falha ao listar projects:', err); });
    };
    this.sendIrisMessage = function(rawText, opts) {
      opts = opts || {};
      const txt = String(rawText != null ? rawText : (self.state.draft || '')).trim();
      if (!txt) return;
      const tavir = getTavir();
      const app = self.props.app || { toast: function() {} };
      const list = self.state.absorbed || [];
      const ap = list.find(function(p) { return p.id === self.state.pid; }) || list[0];
      if (!ap) { app.toast('Sem projeto', 'Abra um projeto para falar com a Íris.'); return; }
      const gpRow = (self.state.gp && self.state.gp[ap.id]) || {};
      const stageN = (ap.stages && ap.stages.length) || Number(ap.n) || 9;
      const doneN = Math.min(Number(gpRow.cur != null ? gpRow.cur : ap.done) || 0, stageN);
      const finished = doneN >= stageN || String(ap.status || '').toLowerCase() === 'done' || String(ap.status || '').toLowerCase() === 'completed';
      const unlocked = !finished || !!(self.state.altOpen && self.state.altOpen[ap.id]) || !!ap.alterations_open;
      const motorRow = (self.state.motors && self.state.motors[ap.id]) || {};
      const engName = String(motorRow.engine || 'cursor').toLowerCase();
      const engLabel = engName === 'antigravity' ? 'Antigravity' : (engName.charAt(0).toUpperCase() + engName.slice(1));
      const engModel = motorRow.model || (engName === 'claude' ? 'claude-sonnet-4-5' : engName === 'codex' ? 'gpt-5-codex' : engName === 'antigravity' ? 'gemini-2.5-pro' : 'auto-smart');
      const engEffort = motorRow.effort || 'medium';
      const hm = function() {
        const d = new Date();
        return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      };
      const pidNow = ap.id;
      const prev = (self.state.chats && self.state.chats[pidNow]) || [];
      const base = prev.concat([['Carlos', txt, 'me', [], hm()]]);
      const chats = Object.assign({}, self.state.chats || {});
      chats[pidNow] = base;
      self.setState({ chats: chats, draft: '', typing: true, chat: true, unread: 0 });
      const finish = function(reply, thoughts, extra) {
        const st = self.state;
        const c3 = Object.assign({}, st.chats || {});
        c3[pidNow] = (st.chats[pidNow] || base).concat([['Íris · ' + engLabel, reply, 'ag', thoughts || [], hm()]]);
        const patch = { chats: c3, typing: false };
        if (extra && extra.alt_track) {
          const tm = Object.assign({}, st.altTrack || {});
          tm[pidNow] = extra.alt_track;
          patch.altTrack = tm;
          const step = Number(extra.alt_track.step) || 0;
          const labels = ['Mapear gaps', 'Planejar', 'Ajustar', 'Validar & build'];
          if (extra.registered) app.toast('Trilho atualizado', 'Registro gravado em ' + (labels[step] || 'Mapear gaps') + '.');
        }
        self.setState(patch);
      };
      if (!tavir || !tavir.projects || !tavir.projects.askIris) {
        finish(
          unlocked
            ? ('Absorvi "' + txt + '" no projeto ' + (ap.name || '') + '.')
            : 'Projeto fechado para alterações. Use Liberar alterações para falar com os agentes.',
          ['[Local] sem IPC askIris']
        );
        return;
      }
      const stg = (ap.stages && ap.stages[Math.min((ap.stages.length || 1) - 1, Math.max(0, Number(ap.done) || 0))]) || ['Handoff', 'Paula PM'];
      const track = (self.state.altTrack && self.state.altTrack[pidNow]) || {};
      const trackLabels = ['Mapear gaps', 'Planejar', 'Ajustar', 'Validar e build'];
      const trackStep = Math.max(0, Math.min(3, Number(track.step) || 0));
      tavir.projects.askIris({
        projectId: ap.id,
        projectName: ap.name,
        projectPath: ap.local_path || ap.path || ap.slug || '',
        stageName: finished ? (trackLabels[trackStep] || stg[0]) : stg[0],
        stageOwner: finished && trackStep === 1 ? 'Paula PM' : stg[1],
        engine: engName,
        model: engModel,
        effort: engEffort,
        question: txt,
        asChangeRequest: !!opts.asChangeRequest,
        persona: 'Íris · Inteligência do Projeto'
      }).then(function(res) {
        const msg = res && res.replyMessage;
        const thoughts = (msg && msg.thoughts) || [];
        const registered = thoughts.some(function(t) { return String(t).indexOf('[Trilho]') >= 0; });
        finish((msg && msg.t) || 'Pedido registrado na memória do projeto.', thoughts, {
          alt_track: res && res.alt_track,
          registered: registered
        });
      }).catch(function(err) {
        finish('Não consegui falar com o motor agora (' + String(err && err.message || err) + ').', ['[Erro] askIris']);
      });
    };
    this.reloadIpcProjects();
    this._onProjCreated = function() { if (self.reloadIpcProjects) self.reloadIpcProjects(); };
    this._onProjDeleted = function() { if (self.reloadIpcProjects) self.reloadIpcProjects(); };
    if (typeof window !== 'undefined') {
      window.addEventListener('tavir:project-created', this._onProjCreated);
      window.addEventListener('tavir:project-deleted', this._onProjDeleted);
    }
  }
  componentWillUnmount() {
    if (typeof window !== 'undefined') {
      if (this._onProjCreated) window.removeEventListener('tavir:project-created', this._onProjCreated);
      if (this._onProjDeleted) window.removeEventListener('tavir:project-deleted', this._onProjDeleted);
    }
    clearTimeout(this.t1); clearTimeout(this.t2); clearTimeout(this.t3); (this.tms || []).forEach((x) => clearTimeout(x)); clearInterval(this.vi); Object.keys(this).forEach((k) => { if (/^pi(qa|sec):/.test(k)) clearInterval(this[k]); });
  }`,
    );

    fabHtml = fabHtml.replace(
      'goPainel: () => self.setState({ pid: null }),',
      'goPainel: () => { self.setState({ pid: null }); if (self.reloadIpcProjects) self.reloadIpcProjects(); },',
    );

    fabHtml = fabHtml.replace(
      '<div class="tv" style="min-height: 100%">',
      '<div class="tv fab" data-screen-label="Tavir Fábrica" style="min-height: 100%; height: calc(100vh - 64px); background: var(--surface-0)">',
    );
    fabHtml = fabHtml.replace(
      '.fb-side{width:236px;flex:none;border-right:1px solid var(--line);background:var(--surface-1);padding:16px 10px;display:flex;flex-direction:column;gap:2px;position:sticky;top:0;align-self:flex-start;height:100vh;overflow-y:auto;scrollbar-width:thin}',
      '.fb-side{width:236px;flex:none;border-right:1px solid var(--line);background:var(--surface-1);padding:16px 10px;display:flex;flex-direction:column;gap:2px;position:sticky;top:0;align-self:flex-start;height:calc(100vh - 64px);overflow-y:auto;scrollbar-width:thin}',
    );

    // Clique em etapa/gate em todos os projetos (fonte Fabrica.dc.html)
    if (fabHtml.includes("const stepPick = (i) => isM ? () => goStage(i) : () => self.setState({ ptab: 'esteira' });")) {
      fabHtml = fabHtml.replace(
        "const stepPick = (i) => isM ? () => goStage(i) : () => self.setState({ ptab: 'esteira' });",
        "const stepPick = (i) => () => goStage(i);"
      );
      console.log('Fábrica: stepPick universal (gates/etapas clicáveis)');
    }

    manifest[fabUuid].data = zlib.gzipSync(Buffer.from(fabHtml, 'utf8')).toString('base64');
    console.log('Fábrica limpa e atualizada! (referência sem mock + IPC)');
  } else {

  // Botão extra "Absorver pasta (Product Lab)" ao lado de "Nova esteira"
  fabHtml = fabHtml.replace(
    '<div class="actions"><button class="btn primary" onClick="{{newLine}}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>Nova esteira</button></div>',
    '<div class="actions"><button class="btn secondary" onClick="{{absorbLine}}">Absorver pasta (Product Lab)</button><button class="btn primary" onClick="{{newLine}}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>Nova esteira</button></div>'
  );

  // Conecta cada botão "Usar esteira" com t.use (que passa o template pré-selecionado)
  fabHtml = fabHtml.replace(
    '<button class="btn sm secondary" onClick="{{newLine}}">Usar esteira</button>',
    '<button class="btn sm secondary" onClick="{{t.use}}">Usar esteira</button>'
  );

  // Atualiza tpls para incluir a callback use: () => app.modal('factory-new', { tpl: x[1] })
  fabHtml = fabHtml.replace(
    ".map((x) => ({ k: x[0], name: x[1], x: x[2], n: x[3], st: x[4].map((y) => ({ t: y })), lead: x[5] }))",
    ".map((x) => ({ k: x[0], name: x[1], x: x[2], n: x[3], st: x[4].map((y) => ({ t: y })), lead: x[5], use: () => app.modal('factory-new', { tpl: x[1] }) }))"
  );

  // Na lista "Esteiras ao vivo", mostra o que está sendo executado no momento + pensamento em curso
  fabHtml = fabHtml.replace(
    '<div style="display: flex; gap: 8px; align-items: center; font-size: 12px"><span class="muted">Agora:</span><b>{{l.stage}}</b><span class="muted">· {{l.owner}}</span></div>',
    `<div style="display: flex; gap: 8px; align-items: center; font-size: 12px; flex-wrap: wrap"><span class="muted">Executando agora:</span><b style="color: var(--flow)">{{l.stage}}</b><span class="muted">· {{l.owner}}</span><span class="badge flow" style="font-size: 10px; height: 19px; padding: 0 7px">{{l.motorBadge}}</span></div>
            <div class="mono" style="font-size: 11px; color: var(--text-secondary); padding: 5px 9px; border-radius: 7px; background: var(--surface-0); border: 1px solid var(--line); display: flex; align-items: center; gap: 6px"><span style="color: var(--flow)">🧠 Pensamento:</span><span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{l.thoughtPreview}}</span></div>`
  );

  // Na lista "Esteiras ao vivo", adiciona botões de Pausar/Retomar e Remover em cada linha
  fabHtml = fabHtml.replace(
    '<button class="row" onClick="{{l.open}}" style="padding: 20px 18px; gap: 20px; flex-wrap: wrap">',
    '<div class="row" onClick="{{l.open}}" style="padding: 20px 18px; gap: 20px; flex-wrap: wrap; cursor: pointer">'
  );
  fabHtml = fabHtml.replace(
    '<div style="display: flex; align-items: center; gap: 14px"><span class="num" style="font-size: 22px">{{l.pct}}%</span><span class="badge {{l.cls}}">{{l.state}}</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg></div>\n        </button>',
    '<div style="display: flex; align-items: center; gap: 10px"><span class="num" style="font-size: 22px">{{l.pct}}%</span><span class="badge {{l.cls}}">{{l.state}}</span><button class="btn sm ghost" onClick="{{l.togglePause}}" title="{{l.pauseLabel}}">{{l.pauseLabel}}</button><button class="btn sm ghost" onClick="{{l.del}}" style="color: var(--danger)" title="Remover projeto (perguntar sobre arquivos locais)">Remover</button><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg></div>\n        </div>'
  );

  // Injeta estado inicial de projects + estrutura de pastas (projTree) + Execução ao Vivo (4 Motores) + Íris Chat
  const origFabState = "this.state = { open: false, stage: 5,";
  const newFabState = `this.state = { projects: [], activeProject: null, projTree: null, showTreePanel: false, showTreeModal: false, showThinkingPanel: false, expandedMsgThoughts: {}, engineCatalog: [], execEngine: 'Cursor', execEngineId: 'cursor', execModel: 'auto-smart', execModelLabel: 'Auto', execEffort: 'balanced', execEffortLabel: 'Balance', execRunning: false, execDraft: '', execThoughts: [], execSteps: [], execTokens: '2.480 tok', execElapsed: '3,2 s', execCost: 'US$ 0,04', chatPersona: 'Íris · Inteligência do Projeto', open: false, stage: 5,`;
  fabHtml = fabHtml.replace(origFabState, newFabState);

  // Limpa mensagens iniciais mockadas da Meridian no state do chat
  fabHtml = fabHtml.replace(
    "chat: false, unread: 2, typing: false, draft: '', msgs: [['Yuri UX', 'A hero ainda compete com o menu em 390 px. Proponho cortar o subtítulo e virar o menu ícone.', 'ag'], ['Vitor Construtor', 'Ajuste pronto no branch hero-390. Preciso da prova visual de novo.', 'ag']]",
    "chat: false, unread: 1, typing: false, draft: '', msgs: []"
  );

  const origFabUnmount = "componentWillUnmount() { clearTimeout(this.t1); clearTimeout(this.t2); clearTimeout(this.t3); }";
  const newFabLifecycle = `componentDidMount() {
    const self = this;
    const getTavir = function() {
      return (typeof window !== 'undefined' && (window.tavir || (window.parent && window.parent.tavir))) || null;
    };
    this.saveLocalProjects = function(list) {
      try { localStorage.setItem('tavir_factory_projects', JSON.stringify(list || [])); } catch (e) {}
    };
    this.getEngineMeta = function(engName, modelId, effortId) {
      const catalog = self.state.engineCatalog || [];
      const k = String(engName || self.state.execEngineId || 'cursor').toLowerCase();
      let motor = catalog.find(function(m) { return m.id === k || String(m.label || '').toLowerCase() === k; });
      if (!motor) {
        if (k.indexOf('claude') >= 0) motor = { id: 'claude', label: 'Claude', sdk: '~/.claude', cli: 'claude -p --output-format json', protocol: 'Claude Code SDK · Extended Thinking', models: [{ id: 'claude-opus-5-5', label: 'Opus 5.5', efforts: [{ id: 'medium', label: 'Médio' }] }] };
        else if (k.indexOf('codex') >= 0) motor = { id: 'codex', label: 'Codex', sdk: '~/.codex', cli: 'codex exec --reasoning high', protocol: 'OpenAI Codex CLI · Reasoning Sandbox', models: [{ id: 'gpt-5-codex', label: 'GPT-5 Codex', efforts: [{ id: 'medium', label: 'Médio' }] }] };
        else if (k.indexOf('anti') >= 0) motor = { id: 'antigravity', label: 'Antigravity', sdk: '~/.gemini/antigravity', cli: 'agy --thought-stream', protocol: 'Google Antigravity SDK · Native <thought> Stream', models: [{ id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', efforts: [{ id: 'medium', label: 'Médio' }] }] };
        else motor = { id: 'cursor', label: 'Cursor', sdk: '~/.cursor', cli: 'agent --output-format stream-json', protocol: 'Cursor Agent Stream-JSON · Extended Thinking', models: [{ id: 'auto-smart', label: 'Auto', efforts: [{ id: 'balanced', label: 'Balance' }] }] };
      }
      const wantedModel = modelId || self.state.execModel;
      const model = (motor.models || []).find(function(m) { return m.id === wantedModel; }) || (motor.models || [])[0] || { id: 'auto-smart', label: 'Auto', efforts: [{ id: 'balanced', label: 'Balance' }] };
      const wantedEffort = effortId || self.state.execEffort;
      const effort = (model.efforts || []).find(function(e) { return e.id === wantedEffort; }) || (model.efforts || [])[0] || { id: 'balanced', label: 'Balance' };
      const caption = model.id === 'auto-smart' ? (motor.label + ' · ' + model.label) : (motor.label + ' · ' + model.label + ' · ' + effort.label);
      return { id: motor.id, name: motor.label, sdk: motor.sdk, cli: motor.cli, protocol: motor.protocol, model: model.id, modelLabel: model.label, effort: effort.id, effortLabel: effort.label, caption: caption, models: motor.models || [] };
    };
    this.applyEngineSelection = function(engineId, modelId, effortId) {
      const eng = self.getEngineMeta(engineId, modelId, effortId);
      self.setState({
        execEngine: eng.name,
        execEngineId: eng.id,
        execModel: eng.model,
        execModelLabel: eng.modelLabel,
        execEffort: eng.effort,
        execEffortLabel: eng.effortLabel
      });
      return eng;
    };
    this.loadEngineCatalog = function() {
      const tavir = getTavir();
      if (!tavir || !tavir.engines || !tavir.engines.getCatalog) return;
      tavir.engines.getCatalog().then(function(cat) {
        const engines = (cat && cat.engines) || [];
        const settings = (cat && cat.settings) || {};
        const defId = settings.defaultEngine || ((engines[0] && engines[0].id) || 'cursor');
        const eng = self.getEngineMeta(defId, settings.defaultModel, settings.defaultEffort);
        self.setState({
          engineCatalog: engines,
          execEngine: eng.name,
          execEngineId: eng.id,
          execModel: eng.model,
          execModelLabel: eng.modelLabel,
          execEffort: eng.effort,
          execEffortLabel: eng.effortLabel
        });
        if (self.syncLiveThinkingState) self.syncLiveThinkingState(self.state.activeProject, self.state.projTree, eng.name, eng.effort, self.state.stage);
      }).catch(function() {});
    };
    this.loadEngineCatalog();
    this.syncLiveThinkingState = function(proj, info, engineOverride, effortOverride, stageOverride) {
      const targetProj = proj || self.state.activeProject;
      const eng = self.getEngineMeta(engineOverride || self.state.execEngineId || self.state.execEngine, self.state.execModel, effortOverride || self.state.execEffort);
      const eff = eng.effortLabel;
      const stgIdx = stageOverride != null ? stageOverride : (self.state.stage || 0);
      const stgRow = STG[Math.min(STG.length - 1, Math.max(0, stgIdx))] || STG[0];
      const pName = (targetProj && targetProj.name) || 'Projeto';
      const rootP = (info && info.rootPath) || (targetProj && targetProj.local_path) || ('tavir-interno/' + ((targetProj && targetProj.slug) || 'projeto'));
      const dCount = (info && info.dirCount != null) ? info.dirCount : 6;
      const fCount = (info && info.fileCount != null) ? info.fileCount : 4;
      const stacks = (info && info.stacks) || (targetProj && targetProj.stack) || 'Fullstack / Sistema';
      const isDone = targetProj && (targetProj.status === 'done' || targetProj.status === 'completed' || (Number(targetProj.stages_done) >= Number(targetProj.total_stages) && Number(targetProj.total_stages) > 0));
      const isPaused = targetProj && targetProj.status === 'paused';
      const ts = hm();
      const thoughts = [
        { step: 1, ts: ts, tag: eng.name.toUpperCase(), text: '$ ' + eng.cli + ' --workspace "' + rootP + '" --model ' + eng.model + ' (' + eng.sdk + ') · ' + eng.caption },
        { step: 2, ts: ts, tag: 'WORKSPACE', text: 'Conectado à pasta isolada de "' + pName + '" (' + dCount + ' pastas · ' + fCount + ' arquivos · stack: ' + stacks + ').' },
        { step: 3, ts: ts, tag: 'ISOLAMENTO', text: 'Verificado .tavir/isolation.json e cofre .env.project — credenciais e Git confinados exclusivamente ao diretório do projeto.' },
        { step: 4, ts: ts, tag: 'PENSAMENTO', text: isDone
            ? 'Esteira 100% concluída. Monitorando integridade dos artefatos de Handoff e pronto para novas demandas de evolução.'
            : isPaused
            ? 'Projeto pausado pelo operador na etapa "' + stgRow[0] + '". Contexto preservado em memória para retomada imediata.'
            : 'Executando raciocínio (' + eff + ') da etapa "' + stgRow[0] + '" com ' + stgRow[1] + ' (' + stgRow[3] + ') em ' + eng.caption + '.' }
      ];
      const steps = [
        { label: 'SDK local conectado: ' + eng.name + ' (' + eng.sdk + ')', state: 'done', meta: eng.modelLabel || eng.model },
        { label: 'Leitura da árvore física e isolamento (.tavir/isolation.json)', state: 'done', meta: dCount + ' pastas · ' + fCount + ' arq' },
        { label: isDone ? 'Todas as etapas da esteira finalizadas' : ('Etapa ativa: ' + stgRow[0] + ' · ' + stgRow[1]), state: isDone ? 'done' : isPaused ? 'paused' : 'running', meta: isDone ? '100%' : isPaused ? 'pausado' : 'em execução' }
      ];
      self.setState({ execThoughts: thoughts, execSteps: steps });
    };
    this.loadProjectChat = function(proj) {
      const target = proj || self.state.activeProject;
      if (!target) return;
      const tavir = getTavir();
      const key = target.id || target.local_path || target.slug || target.name;
      if (tavir && tavir.projects && tavir.projects.getChat) {
        tavir.projects.getChat(key).then(function(res) {
          if (res && Array.isArray(res.messages) && res.messages.length) {
            self.setState({ msgs: res.messages });
          }
        }).catch(function() {});
      } else {
        const welcome = {
          id: 'w-' + Date.now(),
          who: 'Íris · Inteligência do Projeto',
          role: 'ag',
          engine: self.state.execEngine || 'Cursor',
          ts: hm(),
          thoughts: [
            '[Workspace] Conectada ao projeto ' + (target.name || 'Projeto'),
            '[Contexto] Pronta para responder sobre arquivos, arquitetura, etapas e execução nos 4 motores'
          ],
          t: 'Olá, Carlos! Sou a Íris, conectada ao projeto "' + (target.name || 'Projeto') + '". Pergunte sobre o que está sendo executado, estrutura de pastas, arquivos ou peça qualquer alteração.'
        };
        self.setState({ msgs: [welcome] });
      }
    };
    this.sendIrisMessage = function(rawText) {
      let txt = String(rawText != null ? rawText : (self.state.draft || '')).trim();
      if (!txt && typeof document !== 'undefined') {
        const inp = document.querySelector('#tavir-iris-chat-input');
        if (inp && inp.value) txt = String(inp.value).trim();
      }
      if (!txt) return;
      if (typeof document !== 'undefined') {
        const inp = document.querySelector('#tavir-iris-chat-input');
        if (inp) inp.value = '';
      }
      const ap = self.state.activeProject;
      const stgRow = STG[Math.min(STG.length - 1, Math.max(0, self.state.stage || 0))] || STG[0];
      const eng = self.getEngineMeta(self.state.execEngineId || self.state.execEngine, self.state.execModel, self.state.execEffort);
      const userMsg = {
        id: 'u-' + Date.now(),
        who: 'Carlos',
        role: 'me',
        engine: eng.name,
        ts: hm(),
        thoughts: [],
        t: txt
      };
      const curMsgs = (Array.isArray(self.state.msgs) && self.state.msgs.length) ? self.state.msgs.slice() : [{
        id: 'w-init',
        who: 'Íris · Inteligência do Projeto',
        role: 'ag',
        engine: eng.name,
        ts: hm(),
        thoughts: ['[Workspace] Conectada ao projeto ' + ((ap && ap.name) || 'Projeto')],
        t: 'Olá, Carlos! Sou a Íris, conectada ao projeto "' + ((ap && ap.name) || 'Projeto') + '".'
      }];
      curMsgs.push(userMsg);
      self.setState({ msgs: curMsgs, draft: '', typing: true, chat: true, unread: 0 });
      const tavir = getTavir();
      const key = (ap && (ap.id || ap.local_path || ap.slug || ap.name)) || 'projeto';
      const finishWithReply = function(replyObj) {
        const updated = (self.state.msgs || []).slice();
        updated.push(replyObj);
        const newThoughts = (Array.isArray(replyObj.thoughts) && replyObj.thoughts.length)
          ? replyObj.thoughts.map(function(tLine, idx) { return { step: idx + 1, ts: hm(), tag: eng.name.toUpperCase(), text: tLine }; })
          : self.state.execThoughts;
        self.setState({
          msgs: updated,
          typing: false,
          execThoughts: newThoughts,
          showThinkingPanel: false,
          extra: [[hm(), 'chat', 'Íris (' + eng.name + '): ' + txt.slice(0, 48), 'Íris', '—', (self.state.stage || 0) + 1]].concat(self.state.extra || [])
        });
      };
      if (tavir && tavir.projects && tavir.projects.askIris) {
        tavir.projects.askIris({
          projectId: key,
          projectName: (ap && ap.name) || 'Projeto',
          projectPath: (ap && ap.local_path) || '',
          stageName: stgRow[0],
          stageOwner: stgRow[1],
          engine: eng.name,
          model: eng.model,
          effort: eng.effort,
          persona: self.state.chatPersona || 'Íris · Inteligência do Projeto',
          question: txt
        }).then(function(res) {
          if (res && res.replyMessage) {
            finishWithReply(res.replyMessage);
          } else {
            finishWithReply({
              id: 'a-' + Date.now(),
              who: 'Íris · ' + eng.name,
              role: 'ag',
              engine: eng.name,
              ts: hm(),
              thoughts: ['[' + eng.name + '] Contexto do projeto ' + ((ap && ap.name) || '') + ' analisado na etapa ' + stgRow[0]],
              t: 'Analisei sua solicitação ("' + txt + '") no projeto ' + ((ap && ap.name) || 'ativo') + ' com o motor ' + eng.name + '. Diretriz vinculada à etapa ' + stgRow[0] + ' (' + stgRow[1] + ').'
            });
          }
        }).catch(function() {
          finishWithReply({
            id: 'a-' + Date.now(),
            who: 'Íris · ' + eng.name,
            role: 'ag',
            engine: eng.name,
            ts: hm(),
            thoughts: ['[' + eng.name + '] Leitura local do projeto ' + ((ap && ap.name) || '')],
            t: 'Recebi seu pedido ("' + txt + '") para ' + ((ap && ap.name) || 'o projeto') + '. Registrado na etapa ' + stgRow[0] + ' com ' + stgRow[1] + ' via ' + eng.name + '.'
          });
        });
      } else {
        clearTimeout(self.t3);
        self.t3 = setTimeout(function() {
          finishWithReply({
            id: 'a-' + Date.now(),
            who: 'Íris · ' + eng.name,
            role: 'ag',
            engine: eng.name,
            ts: hm(),
            thoughts: ['[' + eng.name + '] Inspecionando ' + ((ap && ap.name) || 'projeto') + ' na etapa ' + stgRow[0]],
            t: 'Analisei "' + txt + '" no contexto de ' + ((ap && ap.name) || 'projeto') + ' (etapa ' + stgRow[0] + ' · ' + stgRow[1] + '). Tudo sincronizado com o motor ' + eng.name + '.'
          });
        }, 500);
      }
    };
    this.runStageWithEngine = function(customInstruction) {
      const ap = self.state.activeProject;
      const app = self.props.app || NOOP;
      const stgIdx = self.state.stage || 0;
      const stgRow = STG[Math.min(STG.length - 1, Math.max(0, stgIdx))] || STG[0];
      const eng = self.getEngineMeta(self.state.execEngineId || self.state.execEngine, self.state.execModel, self.state.execEffort);
      const eff = eng.effortLabel;
      let instr = String(customInstruction != null ? customInstruction : (self.state.execDraft || '')).trim();
      if (customInstruction === undefined && !instr && typeof document !== 'undefined') {
        const inp = document.querySelector('#tavir-live-exec-input');
        if (inp && inp.value) instr = String(inp.value).trim();
      }
      if (typeof document !== 'undefined') {
        const inp = document.querySelector('#tavir-live-exec-input');
        if (inp) inp.value = '';
      }
      self.setState({
        execRunning: true,
        execDraft: '',
        showThinkingPanel: false,
        execThoughts: [
          { step: 1, ts: hm(), tag: eng.name.toUpperCase(), text: 'Iniciando ' + eng.protocol + ' · ' + eng.caption + ' na pasta do projeto...' }
        ],
        execSteps: [
          { label: 'Inicializando ' + eng.name + ' (' + eng.sdk + ')', state: 'running', meta: eng.modelLabel },
          { label: 'Executando raciocínio (' + eff + ') na etapa ' + stgRow[0], state: 'queued', meta: stgRow[1] }
        ]
      });
      const tavir = getTavir();
      const key = (ap && (ap.id || ap.local_path || ap.slug || ap.name)) || 'projeto';
      if (tavir && tavir.projects && tavir.projects.runWithThinking) {
        tavir.projects.runWithThinking({
          projectId: key,
          projectName: (ap && ap.name) || 'Projeto',
          projectPath: (ap && ap.local_path) || '',
          stageIndex: stgIdx,
          stageName: stgRow[0],
          stageOwner: stgRow[1],
          stageRole: stgRow[3],
          engine: eng.name,
          model: eng.model,
          effort: eng.effort,
          instruction: instr
        }).then(function(res) {
          const allThoughts = (res && Array.isArray(res.thoughts) && res.thoughts.length) ? res.thoughts : [
            { step: 1, ts: hm(), tag: eng.name.toUpperCase(), text: 'Executado via ' + eng.protocol },
            { step: 2, ts: hm(), tag: 'CONCLUÍDO', text: 'Artefato da etapa ' + stgRow[0] + ' atualizado no workspace.' }
          ];
          // Anima a entrada dos pensamentos para experiência em tempo real estilo Concierge
          let idx = 1;
          clearInterval(self.tThink);
          self.tThink = setInterval(function() {
            if (idx < allThoughts.length) {
              idx++;
              self.setState({ execThoughts: allThoughts.slice(0, idx) });
            } else {
              clearInterval(self.tThink);
              self.setState({
                execRunning: false,
                execThoughts: allThoughts,
                execSteps: (res && Array.isArray(res.steps)) ? res.steps : self.state.execSteps,
                execTokens: (res && res.tokens) || '2.840 tok',
                execElapsed: (res && res.elapsed) || '2,9 s',
                execCost: (res && res.cost) || 'US$ 0,04',
                extra: [[hm(), 'run', '[' + eng.name + '] Etapa ' + stgRow[0] + (instr ? (' · "' + instr.slice(0, 40) + '"') : ' executada com pensamento'), stgRow[1], (res && res.cost) || 'US$ 0,04', stgIdx + 1]].concat(self.state.extra || [])
              });
              if (ap) self.loadProjectTree(ap);
              app.toast('Execução concluída · ' + eng.name, 'Etapa ' + stgRow[0] + ' processada e artefato gravado na pasta do projeto.');
            }
          }, 260);
        }).catch(function() {
          self.setState({ execRunning: false });
          self.syncLiveThinkingState(ap, self.state.projTree, eng.name, eff, stgIdx);
        });
      } else {
        setTimeout(function() {
          self.setState({ execRunning: false });
          self.syncLiveThinkingState(ap, self.state.projTree, eng.name, eff, stgIdx);
          app.toast('Execução concluída · ' + eng.name, 'Pensamento finalizado na etapa ' + stgRow[0] + '.');
        }, 900);
      }
    };
    this.loadProjectTree = function(proj) {
      if (!proj) return;
      const tavir = getTavir();
      const key = proj.id || proj.local_path || proj.slug || proj.name;
      self.syncLiveThinkingState(proj, null);
      self.loadProjectChat(proj);
      if (tavir && tavir.projects && tavir.projects.inspectFolder) {
        tavir.projects.inspectFolder(key).then(function(info) {
          if (info) {
            self.setState({ projTree: info });
            self.syncLiveThinkingState(proj, info);
          }
        }).catch(function(err) {
          console.error('[TAVIR Factory] Erro ao ler estrutura da pasta:', err);
        });
      }
    };
    this.openProjectInExplorer = function(proj) {
      const target = proj || self.state.activeProject;
      if (!target) return;
      const app = self.props.app || NOOP;
      const tavir = getTavir();
      const key = target.local_path || target.id || target.slug;
      if (tavir && tavir.projects && tavir.projects.openInExplorer) {
        tavir.projects.openInExplorer(key).then(function(res) {
          app.toast('Pasta aberta no Windows Explorer', (res && res.path) || target.local_path || key);
        });
      } else {
        app.toast('Caminho da pasta', target.local_path || ('tavir-interno/' + (target.slug || 'projeto')));
      }
    };
    this.inspectTreeItem = function(item) {
      if (!item) return;
      const app = self.props.app || NOOP;
      const tavir = getTavir();
      if (tavir && tavir.projects && tavir.projects.readFile && item.fullPath) {
        tavir.projects.readFile(item.fullPath).then(function(res) {
          app.modal('evidence', {
            title: (item.isDir ? '📁 ' : '📄 ') + item.relPath,
            sc: 'Projeto Isolado',
            dom: (self.state.activeProject && self.state.activeProject.name) || 'Fábrica',
            src: item.fullPath,
            conf: 'observado',
            text: (res && res.content) || ('Caminho: ' + item.fullPath)
          });
        });
      } else {
        app.modal('evidence', {
          title: (item.isDir ? '📁 ' : '📄 ') + item.relPath,
          sc: 'Projeto Isolado',
          dom: (self.state.activeProject && self.state.activeProject.name) || 'Fábrica',
          src: item.fullPath || item.relPath,
          conf: 'observado',
          text: 'Caminho local: ' + (item.fullPath || item.relPath)
        });
      }
    };
    this.toggleProjectPause = function(proj, ev) {
      if (ev && ev.stopPropagation) ev.stopPropagation();
      if (!proj || !proj.id) return;
      const app = self.props.app || NOOP;
      const nextStatus = proj.status === 'paused' ? 'running' : 'paused';
      const tavir = getTavir();
      if (tavir && tavir.projects && tavir.projects.updateStatus) {
        tavir.projects.updateStatus(proj.id, nextStatus).catch(function() {});
      }
      const updatedList = (self.state.projects || []).map(function(x) {
        return x.id === proj.id ? Object.assign({}, x, { status: nextStatus }) : x;
      });
      self.saveLocalProjects(updatedList);
      const nextActive = self.state.activeProject && self.state.activeProject.id === proj.id
        ? Object.assign({}, self.state.activeProject, { status: nextStatus })
        : self.state.activeProject;
      self.setState({ projects: updatedList, activeProject: nextActive });
      app.toast(nextStatus === 'paused' ? 'Projeto pausado' : 'Projeto retomado', (proj.name || 'Projeto') + (nextStatus === 'paused' ? ' foi pausado com segurança.' : ' voltou a rodar na esteira.'));
    };
    this.deleteProject = function(proj, ev) {
      if (ev && ev.stopPropagation) ev.stopPropagation();
      if (!proj || !proj.id) return;
      const app = self.props.app || NOOP;
      const fallbackPath = proj.local_path || ((self.state.projTree && self.state.projTree.id === proj.id) ? self.state.projTree.rootPath : '') || ('tavir-interno/' + (proj.slug || 'projeto'));
      app.modal('factory-delete', {
        id: proj.id,
        name: proj.name || 'Projeto',
        slug: proj.slug || '',
        path: fallbackPath
      });
    };
    this.loadProjects = function() {
      const tavir = getTavir();
      let localList = [];
      try {
        const raw = localStorage.getItem('tavir_factory_projects');
        if (raw) localList = JSON.parse(raw) || [];
      } catch (e) {}
      if (tavir && tavir.projects && tavir.projects.list) {
        tavir.projects.list().then(function(rows) {
          const dbList = Array.isArray(rows) ? rows : [];
          self.saveLocalProjects(dbList);
          const nextActive = self.state.activeProject
            ? (dbList.find(function(x) { return x.id === self.state.activeProject.id; }) || self.state.activeProject)
            : null;
          self.setState({ projects: dbList, activeProject: nextActive });
          if (nextActive) self.loadProjectTree(nextActive);
        }).catch(function() {
          self.setState({ projects: localList });
        });
      } else {
        self.setState({ projects: localList });
      }
    };
    this.loadProjects();
    this.onProjCreated = function(ev) {
      self.loadProjects();
      if (ev && ev.detail && ev.detail.project) {
        self.loadProjectTree(ev.detail.project);
      }
      if (ev && ev.detail && ev.detail.openConsole) {
        self.setState({ activeProject: ev.detail.project || null, open: true, stage: 0, showTreePanel: false, showTreeModal: false, showThinkingPanel: false });
      }
    };
    this.onProjDeleted = function(ev) {
      const delId = ev && ev.detail && ev.detail.id;
      if (!delId) { self.loadProjects(); return; }
      const updatedList = (self.state.projects || []).filter(function(x) { return x.id !== delId; });
      self.saveLocalProjects(updatedList);
      const isClosingActive = self.state.activeProject && self.state.activeProject.id === delId;
      self.setState({
        projects: updatedList,
        activeProject: isClosingActive ? null : self.state.activeProject,
        projTree: isClosingActive ? null : self.state.projTree,
        open: isClosingActive ? false : self.state.open
      });
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('tavir:project-created', this.onProjCreated);
      window.addEventListener('tavir:project-deleted', this.onProjDeleted);
      try {
        if (window.parent && window.parent !== window) {
          window.parent.addEventListener('tavir:project-created', this.onProjCreated);
          window.parent.addEventListener('tavir:project-deleted', this.onProjDeleted);
        }
      } catch (e) {}
    }
  }
  componentWillUnmount() {
    clearTimeout(this.t1); clearTimeout(this.t2); clearTimeout(this.t3); clearInterval(this.tThink);
    if (typeof window !== 'undefined') {
      if (this.onProjCreated) window.removeEventListener('tavir:project-created', this.onProjCreated);
      if (this.onProjDeleted) window.removeEventListener('tavir:project-deleted', this.onProjDeleted);
      try {
        if (window.parent && window.parent !== window) {
          if (this.onProjCreated) window.parent.removeEventListener('tavir:project-created', this.onProjCreated);
          if (this.onProjDeleted) window.parent.removeEventListener('tavir:project-deleted', this.onProjDeleted);
        }
      } catch (e) {}
    }
  }`;
  fabHtml = fabHtml.replace(origFabUnmount, newFabLifecycle);

  // Atualiza métricas de Esteiras ativas para refletir a quantidade real
  fabHtml = fabHtml.replace(
    '<div class="metric"><span class="eyebrow">Esteiras ativas</span><strong>3</strong><small>2 criação · 1 manutenção</small></div>',
    '<div class="metric"><span class="eyebrow">Esteiras ativas</span><strong>{{activeLinesN}}</strong><small>{{activeLinesSub}}</small></div>'
  );

  // Unifica o cálculo de cur, pct e etapas no renderVals() do Console com o projeto ativo clicado
  fabHtml = fabHtml.replace(
    "const cur = s.signed ? 6 : 5;",
    `const ap = s.activeProject;
    const apTotal = ap ? Math.max(1, Number(ap.total_stages) || 9) : 9;
    const apDone = ap ? Math.min(apTotal, Math.max(0, Number(ap.stages_done) || 0)) : (s.signed ? 6 : 5);
    const apPct = ap ? Math.round((apDone / apTotal) * 100) : (s.signed ? 72 : 64);
    const apIsDone = ap ? (ap.status === 'done' || ap.status === 'completed' || apDone >= apTotal) : false;
    const apIsPaused = ap ? (ap.status === 'paused') : false;
    const cur = ap ? (apIsDone ? STG.length : Math.min(STG.length - 1, Math.floor((apDone / apTotal) * STG.length))) : (s.signed ? 6 : 5);
    const apStageN = ap ? (apIsDone ? apTotal : Math.min(apTotal, apDone + 1)) : (cur + 1);
    const pt = (s.projTree && (!ap || s.projTree.id === ap.id || s.projTree.slug === ap.slug)) ? s.projTree : null;
    const projFolderPath = (pt && pt.rootPath) || (ap && ap.local_path) || ('tavir-interno/' + ((ap && ap.slug) || 'projeto'));
    const projTreeList = (pt && Array.isArray(pt.tree)) ? pt.tree : [];`
  );

  // Atualiza o card "Agora" no Console do Projeto para refletir 100% concluído ou pausado
  const origNowBlock = `    const now = s.signed
      ? { t: 'Security em andamento', d: 'QA assinado às ' + s.signedAt + '. O Auditor confere headers, segredos e LGPD.', icon: IC.clock, bg: 'rgba(27,197,189,.08)', bd: 'rgba(27,197,189,.3)', ibg: 'rgba(27,197,189,.16)', ifg: '#1BC5BD', anim: 'none', btn: 'Abrir Security', btnCls: 'onink-sec', go: () => goStage(6) }
      : { t: 'Gate de QA · ' + pending + (pending === 1 ? ' critério aberto' : ' critérios abertos'), d: pending ? 'Prova em 390 px e assinatura de SEO seguram a entrega. O resto passou.' : 'Tudo verificado. Falta a sua assinatura.', icon: IC.shield, bg: 'rgba(230,177,90,.08)', bd: 'oklch(.80 .155 78 / .35)', ibg: 'oklch(.80 .155 78 / .18)', ifg: 'oklch(.80 .155 78)', anim: 'ringwarn 2s var(--ease) infinite', btn: pending ? 'Resolver gate' : 'Assinar gate', btnCls: 'onink', go: () => goStage(5, 'guard') };`;
  const newNowBlock = `    const now = apIsDone
      ? { t: 'Esteira 100% concluída', d: 'Todas as ' + apTotal + ' etapas foram finalizadas. Pacote e artefatos isolados na pasta do projeto.', icon: IC.check, bg: 'rgba(27,197,189,.08)', bd: 'rgba(27,197,189,.3)', ibg: 'rgba(27,197,189,.16)', ifg: '#1BC5BD', anim: 'none', btn: 'Ver Handoff', btnCls: 'onink-sec', go: () => goStage(STG.length - 1) }
      : apIsPaused
      ? { t: 'Esteira pausada pelo operador', d: 'Execução suspensa em ' + apPct + '% (etapa ' + apStageN + ' de ' + apTotal + '). Nenhum token consumido.', icon: IC.clock, bg: 'rgba(230,177,90,.08)', bd: 'oklch(.80 .155 78 / .35)', ibg: 'oklch(.80 .155 78 / .18)', ifg: 'oklch(.80 .155 78)', anim: 'none', btn: 'Retomar projeto', btnCls: 'onink', go: () => self.toggleProjectPause(ap) }
      : s.signed
      ? { t: 'Security em andamento', d: 'QA assinado às ' + s.signedAt + '. O Auditor confere headers, segredos e LGPD.', icon: IC.clock, bg: 'rgba(27,197,189,.08)', bd: 'rgba(27,197,189,.3)', ibg: 'rgba(27,197,189,.16)', ifg: '#1BC5BD', anim: 'none', btn: 'Abrir Security', btnCls: 'onink-sec', go: () => goStage(6) }
      : { t: 'Etapa ' + apStageN + ' de ' + apTotal + ' · ' + (STG[Math.min(STG.length - 1, cur)] || STG[0])[0], d: 'Responsável: ' + (STG[Math.min(STG.length - 1, cur)] || STG[0])[1] + '. Ambiente isolado (.tavir/isolation.json).', icon: IC.run, bg: 'rgba(27,197,189,.08)', bd: 'rgba(27,197,189,.3)', ibg: 'rgba(27,197,189,.16)', ifg: '#1BC5BD', anim: 'none', btn: 'Inspecionar etapa', btnCls: 'onink-sec', go: () => goStage(Math.min(STG.length - 1, cur)) };`;
  fabHtml = fabHtml.replace(origNowBlock, newNowBlock);

  // Substitui lines mockadas por mapeamento dinâmico de s.projects
  const origFabLinesIdx = fabHtml.indexOf('lines: [');
  if (origFabLinesIdx !== -1) {
    const origFabLinesEnd = fabHtml.indexOf('].map((l)', origFabLinesIdx);
    const dynamicLinesExpr = `absorbLine: () => app.modal('factory-absorb', { tpl: 'Sistemas', mode: 'Manutenção' }),
      activeLinesN: (s.projects || []).length,
      activeLinesSub: (s.projects || []).filter((p) => !String(p.template_code || '').endsWith('-m')).length + ' criação · ' + (s.projects || []).filter((p) => String(p.template_code || '').endsWith('-m')).length + ' manutenção',
      lines: (s.projects || []).map((p) => {
        const code = String(p.template_code || 'lp-c').toLowerCase();
        const catLabel = code.startsWith('of') ? 'Ofertas' : code.startsWith('sy') ? 'Sistemas' : 'Landing Pages';
        const modeLabel = code.endsWith('-m') ? 'Manutenção' : 'Criação';
        const total = Math.max(1, Number(p.total_stages) || 9);
        const done = Math.min(total, Math.max(0, Number(p.stages_done) || 0));
        const isDone = p.status === 'done' || p.status === 'completed' || done >= total;
        const isPaused = p.status === 'paused';
        const curIdx = isDone ? STG.length - 1 : Math.min(STG.length - 1, Math.floor((done / total) * STG.length));
        const pct = Math.round((done / total) * 100);
        const stg = STG[curIdx] || STG[0];
        const shortFolder = p.local_path ? ('📁 ' + String(p.local_path).split(/[\\\\/]/).slice(-2).join('/')) : ('📁 tavir-interno/' + (p.slug || 'projeto'));
        return {
          id: p.id,
          name: p.name || 'Projeto sem nome',
          kind: catLabel + ' · ' + modeLabel,
          client: p.company || p.client || 'TAVIR',
          due: (isDone ? 'concluída' : isPaused ? 'pausada' : 'ativa') + ' · ' + shortFolder,
          dueColor: isDone ? 'var(--flow)' : isPaused ? 'var(--warning)' : 'var(--text-muted)',
          n: Math.min(16, total),
          cur: isDone ? Math.min(16, total) : Math.min(Math.min(16, total) - 1, done),
          gate: done === 0 && !isDone && !isPaused,
          stage: isDone ? 'Concluído (Handoff)' : stg[0],
          owner: stg[1],
          motorBadge: (s.execEngine || 'Cursor') + ' · SDK',
          thoughtPreview: isDone
            ? ('[' + (s.execEngine || 'Cursor') + '] Esteira 100% concluída · artefatos validados na pasta isolada do projeto.')
            : isPaused
            ? ('[' + (s.execEngine || 'Cursor') + '] Execução pausada na etapa ' + stg[0] + ' · contexto preservado.')
            : ('[' + (s.execEngine || 'Cursor') + '] Raciocinando na etapa ' + stg[0] + ' com ' + stg[1] + ' (' + stg[3] + ')...'),
          pct: pct,
          cls: isDone ? 'flow' : isPaused ? 'warn' : 'flow',
          state: isDone ? 'concluída' : isPaused ? 'pausada' : 'rodando',
          pauseLabel: isPaused ? 'Retomar' : 'Pausar',
          togglePause: (ev) => self.toggleProjectPause(p, ev),
          del: (ev) => self.deleteProject(p, ev),
          open: () => {
            self.setState({ activeProject: p, stage: curIdx, open: true });
            self.loadProjectTree(p);
          }
        };
      }).map((l)`;
    fabHtml = fabHtml.slice(0, origFabLinesIdx) + dynamicLinesExpr + fabHtml.slice(origFabLinesEnd + 9);
    console.log('Linhas da Fábrica conectadas dinamicamente a s.projects com Pausar/Remover e Pasta!');
  }

  // Personaliza o cabeçalho, barra da pasta local, Painel de Execução ao Vivo & Pensamento (4 Motores) e Estrutura de Pastas no Console
  fabHtml = fabHtml.replace(
    '<span style="font-size: 14px; font-weight: 600">Meridian</span>',
    '<span style="font-size: 14px; font-weight: 600">{{projName}}</span>'
  );
  fabHtml = fabHtml.replace(
    '<button class="btn sm ghost" onClick="{{control}}">Controle do projeto</button>\n    <button class="btn sm secondary" onClick="{{askChange}}">Pedir alteração</button>',
    '<button class="btn sm primary" onClick="{{openChat}}">💬 Íris · Chat do Projeto</button>\n    <button class="btn sm secondary" onClick="{{absorbIntoProj}}">Absorver pasta (Product Lab)</button>\n    <button class="btn sm ghost" onClick="{{openProjExplorer}}">Abrir pasta</button>\n    <button class="btn sm ghost" onClick="{{togglePauseActive}}">{{activePauseLabel}}</button>\n    <button class="btn sm ghost" style="color: var(--danger)" onClick="{{deleteActive}}">Remover projeto</button>\n    <button class="btn sm ghost" onClick="{{control}}">Controle e Isolamento</button>\n    <button class="btn sm secondary" onClick="{{askChange}}">Pedir alteração</button>'
  );
  fabHtml = fabHtml.replace(
    '<span class="eyebrow">LP · Criação · Meridian Capital</span>',
    '<span class="eyebrow">{{projEyebrow}}</span>'
  );
  fabHtml = fabHtml.replace(
    '<h1 style="font-size: 30px; font-weight: 600; letter-spacing: -.03em; line-height: 1.1">Meridian — landing institucional</h1>',
    '<h1 style="font-size: 30px; font-weight: 600; letter-spacing: -.03em; line-height: 1.1">{{projTitle}}</h1>'
  );
  fabHtml = fabHtml.replace(
    '<div style="display: flex; gap: 8px; flex-wrap: wrap"><span class="badge">entrega 04/11 · faltam 6 dias</span><span class="badge flow">PRO-005 assinada</span><span class="badge">6 agentes</span></div>',
    `<div style="display: flex; gap: 8px; flex-wrap: wrap"><span class="badge {{projStateCls}}">{{projStateBadge}}</span><span class="badge flow">{{projIsolationBadge}}</span><span class="badge">{{projGitBadge}}</span><span class="badge flow">{{execModelBadge}}</span></div>
      <div style="margin-top: 4px; padding: 10px 14px; border-radius: 10px; background: rgba(7,13,24,.65); border: 1px solid var(--on-ink-line); display: flex; align-items: center; gap: 10px; flex-wrap: wrap">
        <span class="eyebrow" style="color: var(--teal); font-size: 10px">📁 Pasta do Projeto:</span>
        <code class="mono" style="font-size: 12px; color: #F4F6F2; word-break: break-all; flex: 1; min-width: 180px">{{projFolderPath}}</code>
        <button type="button" class="btn sm onink-sec" onClick="{{openProjExplorer}}" style="height: 28px; padding: 0 10px; font-size: 11.5px">Abrir no Explorer</button>
        <button type="button" class="btn sm onink-sec" onClick="{{openTreeModal}}" style="height: 28px; padding: 0 10px; font-size: 11.5px">📁 Estrutura</button>
      </div>`
  );

  // Bloco compacto de execução (pensamento colapsado) + modal de estrutura — sem poluir a tela
  fabHtml = fabHtml.replace(
    '  <!-- topologia -->',
    `  <!-- execução compacta · pensamento colapsável · workspace em modal -->
  <section class="card" style="padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; border: 1px solid var(--flow-subtle-line)">
    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap">
      <span style="width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; background: var(--flow-subtle); color: var(--flow); flex: none">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 3 5 14h6l-1 7 8-11h-6z"></path></svg>
      </span>
      <div class="grow" style="min-width: 200px">
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap">
          <span class="eyebrow" style="color: var(--flow)">Motor & execução</span>
          <span class="badge {{execStatusCls}}" style="font-size: 10px; height: 18px">{{execStatusBadge}}</span>
          <span class="badge flow" style="font-size: 10px; height: 18px">{{execModelBadge}}</span>
        </div>
        <div style="font-size: 13.5px; font-weight: 600; margin-top: 2px; line-height: 1.35">{{execNowHeadline}}</div>
      </div>
      <span class="mono muted" style="font-size: 11px">{{execTelemetry}}</span>
      <button type="button" class="btn sm primary" onClick="{{runStageNow}}" style="height: 32px">{{runStageBtnLabel}}</button>
      <button type="button" class="btn sm secondary" onClick="{{openChat}}" style="height: 32px">💬 Íris</button>
      <button type="button" class="btn sm ghost" onClick="{{toggleThinkingPanel}}" style="height: 32px">{{showThinkingBtnLabel}}</button>
      <button type="button" class="btn sm ghost" onClick="{{openTreeModal}}" style="height: 32px">📁 Pasta</button>
    </div>

    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding-top: 6px; border-top: 1px solid var(--line)">
      <span class="eyebrow" style="font-size: 9.5px">Motor ({{engineCount}}):</span>
      <div class="segs">
        <sc-for list="{{engineOpts}}" as="eo" hint-placeholder-count="4">
          <button type="button" class="seg {{eo.on}}" onClick="{{eo.pick}}" style="height: 26px; font-size: 11.5px">{{eo.label}}</button>
        </sc-for>
      </div>
      <span class="eyebrow" style="font-size: 9.5px">Modelo:</span>
      <div class="segs">
        <sc-for list="{{modelOpts}}" as="mo" hint-placeholder-count="4">
          <button type="button" class="seg {{mo.on}}" onClick="{{mo.pick}}" style="height: 26px; font-size: 11.5px">{{mo.label}}</button>
        </sc-for>
      </div>
      <sc-if value="{{showEffortPicker}}" hint-placeholder-val="{{true}}">
        <span class="eyebrow" style="font-size: 9.5px">Esforço:</span>
        <div class="segs">
          <sc-for list="{{effortOpts}}" as="ef" hint-placeholder-count="4">
            <button type="button" class="seg {{ef.on}}" onClick="{{ef.pick}}" style="height: 26px; font-size: 11.5px">{{ef.label}}</button>
          </sc-for>
        </div>
      </sc-if>
      <sc-if value="{{showAutoNote}}" hint-placeholder-val="{{false}}">
        <span class="muted" style="font-size: 11px">Auto não aplica Cost/Balance/Intelligence nesta instalação.</span>
      </sc-if>
    </div>

    <sc-if value="{{showThinkingPanel}}" hint-placeholder-val="{{false}}">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 10px; animation: rise 180ms var(--ease) both">
        <div style="border-radius: 10px; background: #070d18; border: 1px solid rgba(27,197,189,.28); padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; max-height: 220px">
          <div style="display: flex; align-items: center; gap: 8px">
            <span class="eyebrow" style="color: #1BC5BD; font-size: 10px">🧠 Pensamento · {{execEngine}}</span>
            <div class="grow"></div>
            <button type="button" class="btn sm ghost" onClick="{{toggleThinkingPanel}}" style="height: 24px; font-size: 11px; padding: 0 8px">Ocultar</button>
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px; overflow: auto">
            <sc-for list="{{execThoughtsList}}" as="th" hint-placeholder-count="3">
              <div style="font-family: var(--font-mono); font-size: 11.5px; line-height: 1.45; color: #E2E8F0; padding: 5px 8px; border-radius: 7px; background: rgba(15,23,41,.85); border-left: 2px solid #1BC5BD">
                <div style="display: flex; gap: 8px; font-size: 10px; color: #94A3B8; margin-bottom: 2px"><b style="color: #1BC5BD">[{{th.tag}}]</b><span>#{{th.step}}</span><div class="grow"></div><span>{{th.ts}}</span></div>
                <div>{{th.text}}</div>
              </div>
            </sc-for>
          </div>
        </div>
        <div style="border-radius: 10px; background: var(--surface-0); border: 1px solid var(--line); padding: 10px 12px; display: flex; flex-direction: column; gap: 8px">
          <div style="display: flex; align-items: center; gap: 8px">
            <span class="eyebrow" style="font-size: 10px">Passos</span>
            <div class="grow"></div>
            <span class="badge flow" style="font-size: 10px; height: 18px">{{execStepsCount}}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px; max-height: 120px; overflow: auto">
            <sc-for list="{{execStepsList}}" as="st" hint-placeholder-count="3">
              <div style="display: flex; align-items: center; gap: 8px; padding: 5px 8px; border-radius: 7px; background: var(--surface-1); border: 1px solid var(--line); font-size: 12px">
                <span class="mono" style="color: {{st.color}}; font-weight: 700">{{st.icon}}</span>
                <span class="grow" style="font-weight: 500">{{st.label}}</span>
                <span class="mono muted" style="font-size: 10.5px">{{st.meta}}</span>
              </div>
            </sc-for>
          </div>
          <div style="display: flex; gap: 8px; align-items: center; padding-top: 4px; border-top: 1px solid var(--line)">
            <input id="tavir-live-exec-input" class="input" style="height: 32px; font-size: 12px; flex: 1" value="{{execDraft}}" onInput="{{onExecDraft}}" onChange="{{onExecDraft}}" onKeyDown="{{onExecKey}}" placeholder="Instrução ao motor {{execEngine}}...">
            <button type="button" class="btn sm secondary" onClick="{{sendLiveInstruction}}" style="height: 32px; flex: none">Injetar</button>
          </div>
        </div>
      </div>
    </sc-if>
  </section>

  <sc-if value="{{showTreeModal}}" hint-placeholder-val="{{false}}">
    <div role="dialog" aria-modal="true" aria-label="Estrutura do workspace" style="position: fixed; inset: 0; z-index: 80; display: grid; place-items: center; background: rgba(7,13,24,.72); padding: 24px; animation: rise 160ms var(--ease) both">
      <div class="card" style="width: min(720px, 100%); max-height: min(78vh, 640px); display: flex; flex-direction: column; gap: 12px; padding: 16px 18px; border: 1px solid var(--flow-subtle-line); box-shadow: var(--shadow-elevated); pointer-events: auto">
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap">
          <div class="grow" style="min-width: 180px">
            <div class="eyebrow" style="color: var(--flow)">Workspace isolado</div>
            <h3 style="font-size: 16px; font-weight: 600; margin-top: 2px">{{projName}} — estrutura no disco</h3>
            <div class="mono muted" style="font-size: 11.5px; margin-top: 2px; word-break: break-all">{{projFolderPath}}</div>
          </div>
          <span class="badge flow">{{projDirCount}} pastas</span>
          <span class="badge">{{projFileCount}} arquivos</span>
          <button type="button" class="btn sm ghost" onClick="{{refreshProjTree}}" style="height: 30px">Atualizar</button>
          <button type="button" class="btn sm secondary" onClick="{{openProjExplorer}}" style="height: 30px">Explorer</button>
          <button type="button" class="btn sm primary" onClick="{{closeTreeModal}}" style="height: 30px; padding: 0 12px">Fechar</button>
        </div>
        <div style="flex: 1; min-height: 0; overflow: auto; border-radius: 10px; border: 1px solid var(--line); background: var(--surface-0); padding: 6px 10px">
          <sc-for list="{{projTreeItems}}" as="item" hint-placeholder-count="8">
            <div onClick="{{item.open}}" style="display: flex; align-items: center; gap: 10px; padding: 6px 8px; padding-left: {{item.padLeft}}px; border-bottom: 1px solid var(--line); cursor: pointer; font-size: 12.5px">
              <span class="mono" style="font-size: 12px; color: {{item.iconColor}}">{{item.icon}}</span>
              <b class="mono" style="font-weight: {{item.fw}}; color: {{item.textColor}}">{{item.relPath}}</b>
              <div class="grow"></div>
              <span class="badge {{item.badgeCls}}" style="font-size: 10px; height: 18px; padding: 0 6px">{{item.ext}}</span>
              <span class="mono muted" style="font-size: 10.5px; min-width: 56px; text-align: right">{{item.sizeLabel}}</span>
            </div>
          </sc-for>
          <sc-if value="{{projTreeEmpty}}" hint-placeholder-val="{{false}}">
            <div class="muted" style="padding: 16px; font-size: 13px">Carregando estrutura...</div>
          </sc-if>
        </div>
      </div>
    </div>
  </sc-if>

  <!-- topologia -->`
  );

  fabHtml = fabHtml.replace(
    '<div class="num" style="font-size: 28px; margin-top: 4px">{{stageN}}<span style="font-size: 14px; color: var(--on-ink-muted)"> / 9</span></div>',
    '<div class="num" style="font-size: 28px; margin-top: 4px">{{stageN}}<span style="font-size: 14px; color: var(--on-ink-muted)"> / {{totalStagesN}}</span></div>'
  );
  fabHtml = fabHtml.replace(
    '<div class="eyebrow">Etapa {{sel.n}} de 09 · {{sel.state}}</div>',
    '<div class="eyebrow">Etapa {{sel.n}} de {{totalStagesPad}} · {{sel.state}}</div>'
  );

  // Substitui o drawer do Chat do Projeto pelo Chat estilo Íris (Concierge) com os 4 motores + Pensamento visível
  const origChatDrawer = `<sc-if value="{{chatOpen}}" hint-placeholder-val="{{false}}">
  <section role="dialog" aria-label="Chat do projeto" style="position: fixed; right: 28px; bottom: 28px; z-index: 46; width: min(400px, calc(100vw - 32px)); height: min(560px, calc(100vh - 120px)); display: flex; flex-direction: column; background: var(--surface-1); border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow-elevated); overflow: hidden; animation: rise 220ms var(--ease) both">
    <div class="ink" style="border-radius: 0; border: 0; padding: 14px 16px; display: flex; gap: 12px; align-items: center">
      <div style="display: flex"><sc-for list="{{chatPeople}}" as="p" hint-placeholder-count="3"><span class="av" style="width: 28px; height: 28px; font-size: 9px; margin-right: -8px; border: 2px solid #0B1220">{{p.i}}</span></sc-for></div>
      <div class="grow" style="padding-left: 6px"><b style="font-size: 14px">Chat do projeto</b><div style="font-size: 12px; color: var(--on-ink-muted)">Meridian · 4 participantes</div></div>
      <button class="ibtn sm" onClick="{{closeChat}}" aria-label="Fechar chat" style="border-color: var(--on-ink-line); color: var(--on-ink-muted)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg></button>
    </div>
    <div style="padding: 8px 14px; border-bottom: 1px solid var(--line); display: flex; gap: 6px; align-items: center; flex-wrap: wrap"><span class="eyebrow" style="font-size: 10px">Contexto</span><span class="badge flow">etapa {{sel.label}}</span><span class="badge warn">não reabre a esteira</span></div>
    <div style="flex: 1; overflow: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px">
      <sc-for list="{{msgs}}" as="m" hint-placeholder-count="3"><div class="bubble {{m.cls}}" style="font-size: 13px; max-width: 86%"><div class="eyebrow" style="font-size: 9.5px; margin-bottom: 4px">{{m.who}}</div>{{m.t}}</div></sc-for>
      <sc-if value="{{typing}}" hint-placeholder-val="{{false}}"><div class="typing"><i></i><i></i><i></i></div></sc-if>
    </div>
    <div style="padding: 10px 14px 14px; border-top: 1px solid var(--line); display: flex; flex-direction: column; gap: 8px">
      <div class="segs noscroll" style="flex-wrap: nowrap; overflow-x: auto"><sc-for list="{{sugs}}" as="g" hint-placeholder-count="3"><button class="seg" onClick="{{g.pick}}" style="height: 28px; font-size: 12px; white-space: nowrap; flex: none">{{g.t}}</button></sc-for></div>
      <form onSubmit="{{send}}" style="display: flex; gap: 8px"><input class="input" style="border-radius: 999px; height: 40px" value="{{draft}}" onChange="{{onDraft}}" placeholder="Pedido para a esteira" aria-label="Pedido para a esteira"><button type="submit" class="ibtn" aria-label="Enviar" style="background: var(--action-bg); color: var(--action-fg); border: 0; flex: none"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12 20 4l-6 16-3-7z"></path></svg></button></form>
    </div>
  </section>
</sc-if>`;

  const newChatDrawer = `<sc-if value="{{chatOpen}}" hint-placeholder-val="{{false}}">
  <section role="dialog" aria-label="Íris · Chat do projeto" style="position: fixed; right: 24px; bottom: 24px; z-index: 50; width: min(440px, calc(100vw - 32px)); height: min(580px, calc(100vh - 96px)); display: flex; flex-direction: column; background: var(--surface-1); border: 1px solid var(--flow-subtle-line); border-radius: 18px; box-shadow: var(--shadow-elevated); overflow: hidden; animation: rise 220ms var(--ease) both">
    <div class="ink" style="border-radius: 0; border: 0; padding: 12px 14px; display: flex; gap: 10px; align-items: center">
      <span class="av" style="width: 32px; height: 32px; font-size: 11px; background: rgba(27,197,189,.2); color: #1BC5BD; border: 1px solid rgba(27,197,189,.45)">ÍR</span>
      <div class="grow" style="min-width: 0">
        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap">
          <b style="font-size: 13.5px">Íris</b>
          <span class="badge flow" style="font-size: 9.5px; height: 18px; padding: 0 6px">{{execModelBadge}}</span>
        </div>
        <div style="font-size: 11px; color: var(--on-ink-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{projName}} · etapa {{sel.label}}</div>
      </div>
      <button type="button" class="ibtn sm" onClick="{{closeChat}}" aria-label="Fechar chat" style="border-color: var(--on-ink-line); color: var(--on-ink-muted)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg></button>
    </div>
    <div style="padding: 8px 12px; border-bottom: 1px solid var(--line); background: var(--surface-0); display: flex; flex-direction: column; gap: 6px">
      <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap">
        <span class="eyebrow" style="font-size: 9.5px">Motor ({{engineCount}}):</span>
        <div class="segs">
          <sc-for list="{{engineOpts}}" as="eo" hint-placeholder-count="4">
            <button type="button" class="seg {{eo.on}}" onClick="{{eo.pick}}" style="height: 24px; font-size: 11px; padding: 0 8px">{{eo.label}}</button>
          </sc-for>
        </div>
      </div>
      <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap">
        <span class="eyebrow" style="font-size: 9.5px">Modelo:</span>
        <div class="segs">
          <sc-for list="{{modelOpts}}" as="mo" hint-placeholder-count="4">
            <button type="button" class="seg {{mo.on}}" onClick="{{mo.pick}}" style="height: 22px; font-size: 10.5px; padding: 0 7px">{{mo.label}}</button>
          </sc-for>
        </div>
      </div>
    </div>
    <div style="flex: 1; overflow: auto; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px">
      <sc-for list="{{msgs}}" as="m" hint-placeholder-count="3">
        <div class="bubble {{m.cls}}" style="font-size: 13px; max-width: 94%; display: flex; flex-direction: column; gap: 6px">
          <div style="display: flex; align-items: center; gap: 6px">
            <span class="eyebrow" style="font-size: 9.5px; color: var(--flow)">{{m.who}}</span>
            <sc-if value="{{m.showEngineBadge}}" hint-placeholder-val="{{false}}">
              <span class="badge" style="font-size: 9px; height: 16px; padding: 0 5px">{{m.engine}}</span>
            </sc-if>
            <div class="grow"></div>
            <span class="mono muted" style="font-size: 10px">{{m.ts}}</span>
          </div>
          <sc-if value="{{m.hasThoughts}}" hint-placeholder-val="{{false}}">
            <button type="button" class="btn sm ghost" onClick="{{m.toggleThoughts}}" style="height: 24px; font-size: 11px; align-self: flex-start; padding: 0 8px">{{m.thoughtToggleLabel}}</button>
            <sc-if value="{{m.thoughtsOpen}}" hint-placeholder-val="{{false}}">
              <div style="padding: 7px 9px; border-radius: 8px; background: rgba(7,13,24,.75); border-left: 2px solid #1BC5BD; font-family: var(--font-mono); font-size: 11px; color: #94A3B8; display: flex; flex-direction: column; gap: 3px">
                <sc-for list="{{m.thoughtItems}}" as="ti" hint-placeholder-count="2">
                  <div style="line-height: 1.4">• {{ti.t}}</div>
                </sc-for>
              </div>
            </sc-if>
          </sc-if>
          <div style="white-space: pre-line; line-height: 1.5">{{m.t}}</div>
        </div>
      </sc-for>
      <sc-if value="{{typing}}" hint-placeholder-val="{{false}}">
        <div class="bubble ag" style="font-size: 12px; display: flex; align-items: center; gap: 8px">
          <span class="mono" style="color: var(--flow)">Íris · {{execEngine}}...</span>
          <div class="typing"><i></i><i></i><i></i></div>
        </div>
      </sc-if>
    </div>
    <div style="padding: 10px 12px 12px; border-top: 1px solid var(--line); background: var(--surface-0); display: flex; flex-direction: column; gap: 8px">
      <div class="segs noscroll" style="flex-wrap: nowrap; overflow-x: auto; gap: 6px">
        <sc-for list="{{sugs}}" as="g" hint-placeholder-count="4">
          <button type="button" class="seg" onClick="{{g.pick}}" style="height: 26px; font-size: 11px; white-space: nowrap; flex: none">{{g.t}}</button>
        </sc-for>
      </div>
      <div style="display: flex; gap: 8px; align-items: center">
        <input id="tavir-iris-chat-input" class="input" style="border-radius: 999px; height: 38px; flex: 1" value="{{draft}}" onInput="{{onDraft}}" onChange="{{onDraft}}" onKeyDown="{{onDraftKey}}" placeholder="Pergunte à Íris..." aria-label="Conversar com a Íris">
        <button type="button" class="btn sm primary" onClick="{{sendBtn}}" aria-label="Enviar" style="height: 38px; padding: 0 14px; border-radius: 999px; flex: none">Enviar</button>
      </div>
    </div>
  </section>
</sc-if>`;

  if (fabHtml.includes(origChatDrawer)) {
    fabHtml = fabHtml.replace(origChatDrawer, newChatDrawer);
    console.log('Drawer da Íris (Chat do Projeto com 4 motores e pensamento) injetado!');
  }

  // Atualiza goStage para também sincronizar o pensamento da etapa clicada
  fabHtml = fabHtml.replace(
    "const goStage = (i, t) => { const tb = Object.assign({}, s.tabs); if (t) tb[i] = t; self.setState({ stage: i, tabs: tb, open: true }); };",
    "const goStage = (i, t) => { const tb = Object.assign({}, s.tabs); if (t) tb[i] = t; self.setState({ stage: i, tabs: tb, open: true, ptab: 'esteira' }); if (self.syncLiveThinkingState) self.syncLiveThinkingState(ap, pt, s.execEngineId || s.execEngine, s.execEffort, i); };"
  );

  // Clique em etapa/gate funciona em TODOS os projetos (não só Meridian)
  fabHtml = fabHtml.replace(
    "const stepPick = (i) => isM ? () => goStage(i) : () => self.setState({ ptab: 'esteira' });",
    "const stepPick = (i) => () => goStage(i);"
  );

  // gsteps: seleção visual + pick para inspecionar quem/o quê da etapa
  fabHtml = fabHtml.replace(
    "gsteps: P.stages.map((x, i) => { const k = stState(i); const Z = SS[k]; const isCur = i === P.done && P.status !== 'done'; const blockP = P.pends[0]; return { n: String(i + 1).padStart(2, '0'), t: x[0], who: x[1], skill: x[2], st: Z[0], cls: Z[1], bg: Z[2], fg: Z[3], bd: Z[4], tc: k === 'todo' ? 'var(--text-secondary)' : 'var(--text-primary)', rowBg: isCur ? 'var(--surface-3)' : 'transparent', when: ddmm(P.base, startOf(i)) + (x[3] > 1 ? ' → ' + ddmm(P.base, startOf(i) + x[3] - 1) : ''),\n        hasAct: isCur && P.status === 'run', actLbl: blockP ? 'Autorizar' : 'Concluir etapa', act: blockP ? blockP.act : conclude, dis: !!(blockP && blockP.busy) }; }),",
    `gsteps: P.stages.map((x, i) => { const k = stState(i); const Z = SS[k]; const isCur = i === P.done && P.status !== 'done'; const isSel = Number(s.stage) === i; const blockP = P.pends[0]; return { n: String(i + 1).padStart(2, '0'), t: x[0], who: x[1], skill: x[2], st: Z[0], cls: Z[1], bg: Z[2], fg: Z[3], bd: Z[4], tc: k === 'todo' ? 'var(--text-secondary)' : 'var(--text-primary)', rowBg: isSel ? 'var(--surface-3)' : (isCur ? 'var(--surface-3)' : 'transparent'), when: ddmm(P.base, startOf(i)) + (x[3] > 1 ? ' → ' + ddmm(P.base, startOf(i) + x[3] - 1) : ''),
        pick: stepPick(i), hasAct: isCur && P.status === 'run', actLbl: blockP ? 'Autorizar' : 'Concluir etapa', act: blockP ? blockP.act : conclude, dis: !!(blockP && blockP.busy) }; }),
      gSel: (function() {
        const idx = Math.max(0, Math.min(Number(s.stage) || 0, P.stages.length - 1));
        const st = P.stages[idx] || P.stages[0] || ['Etapa', '—', '—', 1];
        const k = stState(idx); const Z = SS[k];
        const ini = PEOPLE[st[1]] || (st[4] || String(st[1] || '—').slice(0, 2).toUpperCase());
        return {
          n: String(idx + 1).padStart(2, '0'),
          label: st[0],
          owner: st[1],
          ini: ini,
          skill: st[2],
          state: Z[0],
          cls: Z[1],
          when: ddmm(P.base, startOf(idx)) + (st[3] > 1 ? ' → ' + ddmm(P.base, startOf(idx) + st[3] - 1) : ''),
          note: k === 'done'
            ? 'Etapa concluída. Você pode inspecionar o responsável e o escopo; a esteira encerrada não reabre automaticamente.'
            : (k === 'gate' || k === 'paused')
              ? 'Gate/etapa sob sua atenção. Use Pedir alteração ou libere o responsável para seguir.'
              : (k === 'run' ? 'Etapa em andamento com ' + st[1] + '.' : 'Etapa planejada — ainda não começou.'),
          ask: function() {
            const txt = 'Quero trabalhar o gate/etapa \"' + st[0] + '\" (' + st[1] + '). Detalhe o que falta e prepare o handoff para Paula planejar.';
            self.setState({ chat: true, draft: txt, ptab: 'esteira' });
            if (self.sendIrisMessage) self.sendIrisMessage(txt, { asChangeRequest: !!(P.status === 'done' || P.alterations_open) });
          }
        };
      })(),`
  );

  // Esteira genérica: linhas clicáveis + painel da etapa selecionada
  fabHtml = fabHtml.replace(
    `  <!-- ESTEIRA (demais projetos) -->
  <sc-if value="{{pt.esteiraG}}" hint-placeholder-val="{{false}}">
    <section class="card" style="animation: fade 200ms var(--ease) both">
      <div class="card-h"><h3>Esteira {{P.line}} · {{P.n}} etapas</h3><div class="grow"></div><div class="legend"><span><i style="background: var(--flow)"></i>concluída</span><span><i style="background: var(--warning)"></i>agora</span><span><i style="background: var(--line-strong)"></i>a seguir</span></div></div>
      <div class="rows">
        <sc-for list="{{gsteps}}" as="v" hint-placeholder-count="10">
          <div class="row" style="cursor: default; gap: 14px; background: {{v.rowBg}}">
            <span class="fb-nb" style="background: {{v.bg}}; color: {{v.fg}}; border: 1px solid {{v.bd}}">{{v.n}}</span>
            <div class="grow" style="min-width: 0"><div class="t" style="font-size: 14px; color: {{v.tc}}">{{v.t}}</div><div class="m">{{v.who}} · <span class="mono" style="font-size: 11px">{{v.skill}}</span></div></div>
            <span class="num muted" style="font-size: 11px">{{v.when}}</span>
            <span class="badge {{v.cls}}"><i></i>{{v.st}}</span>
            <sc-if value="{{v.hasAct}}" hint-placeholder-val="{{false}}"><button class="btn sm secondary" onClick="{{v.act}}" disabled="{{v.dis}}">{{v.actLbl}}</button></sc-if>
          </div>
        </sc-for>
      </div>
    </section>
  </sc-if>`,
    `  <!-- ESTEIRA (demais projetos) -->
  <sc-if value="{{pt.esteiraG}}" hint-placeholder-val="{{false}}">
    <section class="card" style="animation: fade 200ms var(--ease) both">
      <div class="card-h"><h3>Esteira {{P.line}} · {{P.n}} etapas</h3><div class="grow"></div><div class="legend"><span><i style="background: var(--flow)"></i>concluída</span><span><i style="background: var(--warning)"></i>agora</span><span><i style="background: var(--line-strong)"></i>a seguir</span></div></div>
      <p class="muted" style="padding: 0 18px 10px; font-size: 12.5px; margin: 0">Clique numa etapa/gate para ver responsável, escopo e o que dá para pedir à Íris.</p>
      <div class="rows">
        <sc-for list="{{gsteps}}" as="v" hint-placeholder-count="10">
          <button type="button" class="row" onClick="{{v.pick}}" style="cursor: pointer; gap: 14px; background: {{v.rowBg}}; width: 100%; text-align: left; border: 0; color: inherit">
            <span class="fb-nb" style="background: {{v.bg}}; color: {{v.fg}}; border: 1px solid {{v.bd}}">{{v.n}}</span>
            <div class="grow" style="min-width: 0"><div class="t" style="font-size: 14px; color: {{v.tc}}">{{v.t}}</div><div class="m">{{v.who}} · <span class="mono" style="font-size: 11px">{{v.skill}}</span></div></div>
            <span class="num muted" style="font-size: 11px">{{v.when}}</span>
            <span class="badge {{v.cls}}"><i></i>{{v.st}}</span>
            <sc-if value="{{v.hasAct}}" hint-placeholder-val="{{false}}"><span class="btn sm secondary" style="pointer-events: none">{{v.actLbl}}</span></sc-if>
          </button>
        </sc-for>
      </div>
    </section>
    <section class="card" style="margin-top: 14px; animation: fade 200ms var(--ease) both; overflow: hidden">
      <div style="padding: 16px 18px; display: flex; gap: 14px; align-items: center; flex-wrap: wrap">
        <span class="av" style="width: 40px; height: 40px; font-size: 11px; flex: none">{{gSel.ini}}</span>
        <div class="grow" style="min-width: 200px">
          <div class="eyebrow">Etapa {{gSel.n}} · {{gSel.state}}</div>
          <h2 style="font-size: 20px; font-weight: 600; letter-spacing: -.02em; margin-top: 4px">{{gSel.label}}</h2>
          <div class="muted" style="font-size: 12.5px; margin-top: 4px">{{gSel.owner}} · {{gSel.skill}} · {{gSel.when}}</div>
        </div>
        <span class="badge {{gSel.cls}}"><i></i>{{gSel.state}}</span>
        <button type="button" class="btn sm secondary" onClick="{{gSel.ask}}">Pedir à Íris nesta etapa</button>
      </div>
      <div style="padding: 0 18px 16px; font-size: 13.5px; color: var(--text-secondary); line-height: 1.45">{{gSel.note}}</div>
    </section>
  </sc-if>`
  );

  const engMetaExpr = `const curEng = (typeof self.getEngineMeta === 'function')
      ? self.getEngineMeta(s.execEngineId || s.execEngine, s.execModel, s.execEffort)
      : { id: 'cursor', name: 'Cursor', model: s.execModel || 'auto-smart', modelLabel: s.execModelLabel || 'Auto', effort: s.execEffort || 'balanced', effortLabel: s.execEffortLabel || 'Balance', caption: 'Cursor · Auto', sdk: '~/.cursor', protocol: 'Cursor Agent CLI · ~/.cursor', models: [] };
    const curEngName = curEng.name;
    const curEngModel = curEng.modelLabel || curEng.model;
    const curEngCaption = curEng.caption || (curEngName + ' · ' + curEngModel);
    const curEngProtocol = curEng.protocol || 'Cursor Agent CLI · ~/.cursor';
    const catalogEngines = (Array.isArray(s.engineCatalog) && s.engineCatalog.length)
      ? s.engineCatalog
      : [{ id: curEng.id, label: curEngName, sdk: curEng.sdk || '~/.cursor', models: curEng.models || [] }];
    const currentModels = (catalogEngines.find(function(m) { return m.id === curEng.id; }) || catalogEngines[0] || {}).models || curEng.models || [];
    const currentEfforts = ((currentModels.find(function(m) { return m.id === curEng.model; }) || currentModels[0] || {}).efforts) || [];
    const showAutoNote = curEng.model === 'auto-smart';
    const fallbackThoughts = [
      { step: 1, ts: hm(), tag: curEngName.toUpperCase(), text: 'Conectado via ' + curEngProtocol + ' · ' + curEngCaption },
      { step: 2, ts: hm(), tag: 'WORKSPACE', text: 'Pasta isolada: ' + projFolderPath + ' (' + (pt ? pt.dirCount : 6) + ' pastas · ' + (pt ? pt.fileCount : 4) + ' arquivos · stack: ' + ((pt && pt.stacks) || (ap && ap.stack) || 'Sistemas / Fullstack') + ')' },
      { step: 3, ts: hm(), tag: 'ETAPA ATUAL', text: apIsDone ? 'Esteira 100% concluída. Artefatos auditados e prontos no diretório do projeto.' : apIsPaused ? ('Execução pausada na etapa ' + S[0] + ' (' + S[1] + ').') : ('Raciocinando (' + (curEng.effortLabel || s.execEffortLabel || 'Balance') + ') na etapa ' + S[0] + ' com ' + S[1] + ' (' + S[3] + ').') }
    ];
    const activeThoughts = (Array.isArray(s.execThoughts) && s.execThoughts.length) ? s.execThoughts : fallbackThoughts;
    const fallbackSteps = [
      { label: 'SDK local conectado: ' + curEngName, state: 'done', meta: curEngModel },
      { label: 'Leitura da estrutura física e .tavir/isolation.json', state: 'done', meta: (pt ? pt.dirCount : 6) + ' pastas · ' + (pt ? pt.fileCount : 4) + ' arq' },
      { label: apIsDone ? 'Esteira 100% finalizada (Handoff concluído)' : ('Etapa em foco: ' + S[0] + ' · ' + S[1]), state: apIsDone ? 'done' : apIsPaused ? 'paused' : 'running', meta: apIsDone ? '100%' : apIsPaused ? 'pausado' : 'ativo' }
    ];
    const activeSteps = (Array.isArray(s.execSteps) && s.execSteps.length) ? s.execSteps : fallbackSteps;`;

  fabHtml = fabHtml.replace(
    "const S = STG[s.stage];",
    "const S = STG[Math.min(STG.length - 1, Math.max(0, s.stage || 0))] || STG[0];\n    " + engMetaExpr
  );

  fabHtml = fabHtml.replace(
    "back: () => self.setState({ open: false }),\n      control: () => app.modal('control', { name: 'Meridian' }), askChange: () => app.modal('ai'),\n      pct: s.signed ? 72 : 64, stageN: cur + 1,",
    `projName: (ap && ap.name) || 'Projeto',
      projEyebrow: ap ? ((String(ap.template_code || 'sy-c').toUpperCase()) + ' · ' + (ap.company || ap.client || 'TAVIR')) : 'SY-C · TAVIR',
      projTitle: (ap && ap.name) || 'Projeto na esteira',
      projStateCls: apIsDone ? 'flow' : apIsPaused ? 'warn' : 'flow',
      projStateBadge: apIsDone ? '100% CONCLUÍDA' : apIsPaused ? 'PAUSADA' : 'EM EXECUÇÃO',
      projIsolationBadge: 'ISOLAMENTO GIT/.ENV ATIVO',
      projGitBadge: (ap && ap.description && ap.description.indexOf('Git:') >= 0) ? ap.description.split('·').pop().trim() : ('GIT: ' + ((ap && ap.company) || 'TAVIR')),
      projFolderPath: projFolderPath,
      projDirCount: pt ? pt.dirCount : 6,
      projFileCount: pt ? pt.fileCount : 4,
      projStacks: (pt && pt.stacks) || (ap && ap.stack) || 'Sistemas / Fullstack',
      execEngine: curEngName,
      execEngineUpper: curEngName.toUpperCase(),
      execModelBadge: curEngCaption,
      execProtocolLabel: curEngProtocol,
      engineCount: catalogEngines.length,
      engineCountPlural: catalogEngines.length === 1 ? '' : 's',
      showEffortPicker: currentEfforts.length > 0,
      showAutoNote: !!showAutoNote,
      execStatusCls: s.execRunning ? 'flow' : apIsPaused ? 'warn' : 'flow',
      execStatusBadge: s.execRunning ? 'EXECUTANDO PENSAMENTO AGORA' : apIsDone ? '100% CONCLUÍDO · MONITORANDO' : apIsPaused ? 'PAUSADO' : 'EM EXECUÇÃO · AO VIVO',
      execNowHeadline: s.execRunning
        ? ('Executando Etapa ' + apStageN + ' (' + S[0] + ') em ' + curEngCaption + '...')
        : apIsDone
        ? ('Esteira 100% Concluída · Monitorada por ' + curEngCaption)
        : apIsPaused
        ? ('Execução Pausada na Etapa ' + apStageN + ' (' + S[0] + ' · ' + S[1] + ')')
        : ('Executando Etapa ' + apStageN + ' de ' + apTotal + ': ' + S[0] + ' · Agente: ' + S[1] + ' (' + S[3] + ')'),
      execNowSub: 'Chamada: ' + curEngCaption + ' · Pasta isolada: ' + projFolderPath,
      execTelemetry: (s.execTokens || '2.480 tok') + ' · ' + (s.execElapsed || '3,2 s') + ' · ' + (s.execCost || 'US$ 0,04'),
      runStageBtnLabel: s.execRunning ? '⟳ Executando pensamento...' : ('▶ Executar etapa no ' + curEngName),
      runStageNow: () => { if (!s.execRunning && self.runStageWithEngine) self.runStageWithEngine(''); },
      showThinkingPanel: !!s.showThinkingPanel,
      showThinkingBtnLabel: s.showThinkingPanel ? 'Ocultar pensamento' : '🧠 Ver pensamento',
      toggleThinkingPanel: () => self.setState({ showThinkingPanel: !s.showThinkingPanel }),
      showTreeModal: !!s.showTreeModal,
      openTreeModal: () => { if (ap && self.loadProjectTree) self.loadProjectTree(ap); self.setState({ showTreeModal: true }); },
      closeTreeModal: () => self.setState({ showTreeModal: false }),
      stopTreeModalBubble: (e) => { try { e.stopPropagation(); } catch (err) {} },
      engineOpts: catalogEngines.map((m) => ({
        label: m.label,
        sdk: m.sdk,
        on: curEng.id === m.id ? 'on' : '',
        pick: () => {
          const firstModel = (m.models && m.models[0]) || { id: 'auto-smart', label: 'Auto', efforts: [{ id: 'balanced', label: 'Balance' }] };
          const firstEffort = (firstModel.efforts && firstModel.efforts[0]) || { id: 'balanced', label: 'Balance' };
          const nextModel = (m.models || []).find(function(item) { return item.id === s.execModel; }) || firstModel;
          const nextEffort = (nextModel.efforts || []).find(function(item) { return item.id === s.execEffort; }) || (nextModel.efforts && nextModel.efforts[0]) || firstEffort;
          self.applyEngineSelection(m.id, nextModel.id, nextEffort.id);
          if (self.syncLiveThinkingState) self.syncLiveThinkingState(ap, pt, m.id, nextEffort.id, s.stage);
        }
      })),
      modelOpts: currentModels.map((m) => ({
        label: m.label,
        on: curEng.model === m.id ? 'on' : '',
        pick: () => {
          const nextEffort = (m.efforts || []).find(function(item) { return item.id === s.execEffort; }) || (m.efforts && m.efforts[0]) || { id: 'balanced', label: 'Balance' };
          self.applyEngineSelection(curEng.id, m.id, nextEffort.id);
          if (self.syncLiveThinkingState) self.syncLiveThinkingState(ap, pt, curEng.id, nextEffort.id, s.stage);
        }
      })),
      effortOpts: currentEfforts.map((ef) => ({
        label: ef.label,
        on: curEng.effort === ef.id ? 'on' : '',
        pick: () => {
          self.applyEngineSelection(curEng.id, curEng.model, ef.id);
          if (self.syncLiveThinkingState) self.syncLiveThinkingState(ap, pt, curEng.id, ef.id, s.stage);
        }
      })),
      execThoughtsList: activeThoughts,
      execStepsCount: activeSteps.length,
      execStepsList: activeSteps.map((st) => ({
        label: st.label,
        meta: st.meta || '',
        icon: st.state === 'done' ? '✓' : st.state === 'paused' ? '⏸' : '⟳',
        color: st.state === 'done' ? 'var(--flow)' : st.state === 'paused' ? 'var(--warning)' : '#B7F34A'
      })),
      execDraft: s.execDraft || '',
      onExecDraft: (e) => self.setState({ execDraft: e.target.value }),
      onExecKey: (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = (e.target && e.target.value) || s.execDraft || '';
          if (val.trim() && self.runStageWithEngine) self.runStageWithEngine(val);
        }
      },
      sendLiveInstruction: () => {
        if (self.runStageWithEngine) self.runStageWithEngine(undefined);
      },
      showTreePanel: false,
      showTreeBtnLabel: '📁 Estrutura',
      toggleTreePanel: () => { if (ap && self.loadProjectTree) self.loadProjectTree(ap); self.setState({ showTreeModal: true }); },
      refreshProjTree: () => { if (ap) self.loadProjectTree(ap); },
      openProjExplorer: () => self.openProjectInExplorer(ap),
      projTreeEmpty: projTreeList.length === 0,
      projTreeItems: projTreeList.map((item) => ({
        relPath: item.relPath,
        name: item.name,
        ext: item.ext,
        sizeLabel: item.sizeLabel,
        padLeft: 10 + (item.indent || 0),
        icon: item.isDir ? '📁' : (item.name.startsWith('.env') || item.name === 'isolation.json') ? '🔒' : '📄',
        iconColor: item.isDir ? 'var(--flow)' : 'var(--text-secondary)',
        fw: item.isDir ? '600' : '400',
        textColor: item.isDir ? 'var(--text-primary)' : 'var(--text-secondary)',
        badgeCls: item.isDir ? 'flow' : (item.name.startsWith('.env') || item.name === 'isolation.json') ? 'warn' : '',
        open: () => self.inspectTreeItem(item)
      })),
      activePauseLabel: apIsPaused ? 'Retomar projeto' : 'Pausar projeto',
      togglePauseActive: () => { if (ap) self.toggleProjectPause(ap); },
      deleteActive: () => { if (ap) self.deleteProject(ap); },
      absorbIntoProj: () => app.modal('factory-absorb', { name: ap ? ap.name : '', tpl: 'Sistemas', mode: 'Manutenção', path: projFolderPath }),
      back: () => self.setState({ open: false }),
      control: () => app.modal('control', { name: (ap && ap.name) || 'Projeto', path: projFolderPath, company: (ap && ap.company) || 'TAVIR' }),
      askChange: () => app.modal('ai', { name: (ap && ap.name) || 'Projeto' }),
      pct: apPct, stageN: apStageN, totalStagesN: apTotal, totalStagesPad: String(apTotal).padStart(2, '0'),`
  );

  // Substitui a lógica antiga de chat na Fábrica pela lógica real da Íris com os 4 motores e pensamento
  const origChatLogic = `      // chat
      chatOpen: s.chat, chatClosed: !s.chat, hasUnread: s.unread > 0, unread: s.unread,
      openChat: () => self.setState({ chat: true, unread: 0 }), closeChat: () => self.setState({ chat: false }),
      chatPeople: ['PP', 'YU', 'VC', 'EE'].map((i) => ({ i: i })),
      msgs: s.msgs.map((m) => ({ who: m[0], t: m[1], cls: m[2] })), typing: s.typing, draft: s.draft,
      onDraft: (e) => self.setState({ draft: e.target.value }),
      sugs: (s.stage === 4 ? ['O que mudou no último build?', 'A prévia já está no ar?'] : s.stage === 5 ? ['Quem está bloqueando o QA?', 'Quanto falta para entregar?'] : ['Resuma esta etapa', 'Quanto falta para entregar?']).concat(['Mostre o que mudou hoje']).map((x) => ({ t: x, pick: () => self.setState({ draft: x }) })),
      send: (e) => {
        e.preventDefault(); const txt = s.draft.trim(); if (!txt) return;
        self.setState({ msgs: s.msgs.concat([['Carlos', txt, 'me']]), draft: '', typing: true });
        clearTimeout(self.t3);
        self.t3 = setTimeout(() => { const st = self.state; const left = GUARD.length - st.guard.filter(Boolean).length; const reply = st.signed ? 'QA assinado. Security deve fechar hoje e SEO amanhã. Entrega mantida para 04/11.' : left ? 'Faltam ' + left + ' critérios de QA. Depois vêm Security, SEO e Handoff. Com o gate assinado hoje, a entrega fica em 04/11.' : 'O Guard está verde. Só falta a sua assinatura para seguir para Security.'; self.setState({ msgs: st.msgs.concat([['Paula PM', reply, 'ag']]), typing: false }); }, 1200);
      },`;

  const newChatLogic = `      // chat (Íris · Inteligência do Projeto · 4 Motores)
      chatOpen: s.chat, chatClosed: !s.chat, hasUnread: s.unread > 0, unread: s.unread,
      openChat: () => {
        self.setState({ chat: true, unread: 0 });
        if ((!s.msgs || !s.msgs.length) && self.loadProjectChat) self.loadProjectChat(ap);
      },
      closeChat: () => self.setState({ chat: false }),
      chatPeople: ['ÍR', 'PP', 'AR', 'EN'].map((i) => ({ i: i })),
      msgs: ((Array.isArray(s.msgs) && s.msgs.length) ? s.msgs : [{
        id: 'default-iris',
        who: 'Íris · ' + curEngName,
        role: 'ag',
        engine: curEngName,
        ts: hm(),
        thoughts: [
          '[' + curEngCaption + '] Conectada à pasta ' + projFolderPath,
          '[Árvore] ' + (pt ? pt.dirCount : 6) + ' pastas e ' + (pt ? pt.fileCount : 4) + ' arquivos mapeados'
        ],
        t: 'Olá, Carlos! Sou a Íris neste projeto via ' + curEngCaption + '. Pergunte sobre arquivos, etapas ou peça ajustes.'
      }]).map((m, mi) => {
        const isArr = Array.isArray(m);
        const msgId = (!isArr && m.id) ? String(m.id) : ('idx-' + mi);
        const whoRaw = isArr ? m[0] : (m.who || 'Íris');
        const txt = isArr ? m[1] : (m.t || m.text || '');
        const cls = isArr ? m[2] : (m.role || m.cls || 'ag');
        const thArr = (!isArr && Array.isArray(m.thoughts)) ? m.thoughts : [];
        const engLabel = (!isArr && m.engine) ? String(m.engine) : curEngName;
        const expandedMap = s.expandedMsgThoughts || {};
        const thoughtsOpen = !!expandedMap[msgId];
        const whoClean = String(whoRaw).replace(/\\s*·\\s*(Cursor|Claude|Codex|Antigravity)\\s*$/i, '').trim() || whoRaw;
        return {
          who: cls === 'me' ? whoClean : ('Íris · ' + engLabel),
          t: txt,
          cls: cls,
          ts: (!isArr && m.ts) ? m.ts : hm(),
          engine: engLabel,
          showEngineBadge: false,
          hasThoughts: cls !== 'me' && thArr.length > 0,
          thoughtCount: thArr.length,
          thoughtsOpen: thoughtsOpen,
          thoughtToggleLabel: thoughtsOpen ? 'Ocultar pensamento (' + thArr.length + ')' : '🧠 Ver pensamento (' + thArr.length + ')',
          thoughtItems: thArr.map((x) => ({ t: String(x) })),
          toggleThoughts: () => {
            const next = Object.assign({}, self.state.expandedMsgThoughts || {});
            next[msgId] = !next[msgId];
            self.setState({ expandedMsgThoughts: next });
          }
        };
      }),
      typing: s.typing,
      draft: s.draft,
      onDraft: (e) => self.setState({ draft: e.target.value }),
      onDraftKey: (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = (e.target && e.target.value) || s.draft || '';
          if (self.sendIrisMessage) self.sendIrisMessage(val);
        }
      },
      sugs: [
        'O que está sendo executado agora?',
        'Qual a estrutura desta pasta e stacks?',
        'Resuma a etapa ' + S[0],
        'Como está o isolamento Git e .env?'
      ].map((x) => ({
        t: x,
        pick: () => {
          if (self.sendIrisMessage) self.sendIrisMessage(x);
        }
      })),
      sendBtn: () => {
        if (self.sendIrisMessage) self.sendIrisMessage(undefined);
      },
      send: (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (self.sendIrisMessage) self.sendIrisMessage(undefined);
      },`;

  if (fabHtml.includes(origChatLogic)) {
    fabHtml = fabHtml.replace(origChatLogic, newChatLogic);
    console.log('Lógica de conversação da Íris conectada com sucesso!');
  }

  fabHtml = fabHtml.replace("gateN: s.signed ? 0 : 1,", "gateN: (s.projects || []).filter((p) => p.status === 'running' && !p.stages_done).length,");
  fabHtml = fabHtml.replace("gateNote: s.signed ? 'nenhum gate aberto' : 'Meridian · QA',", "gateNote: (s.projects || []).length ? 'esteiras sincronizadas' : 'nenhum gate aberto',");

  manifest[fabUuid].data = zlib.gzipSync(Buffer.from(fabHtml, 'utf8')).toString('base64');
  console.log('Fábrica limpa e atualizada! (legado)');
  } // fim else !fabFromRef
}

// 1.2b Atualizar d4030abe (Sistema / Configurações: Motores de IA via SDK Local + Módulos em vez de Projetos)
const cfgUuid = 'd4030abe-7d50-46bc-9c56-a7466a8847e7';
if (manifest[cfgUuid] && manifest[cfgUuid].compressed) {
  const buf = Buffer.from(manifest[cfgUuid].data, 'base64');
  let cfgHtml = zlib.gunzipSync(buf).toString('utf8');

  // 1) Subtítulo e Aba: trocar Projetos (4) por Módulos (5) e Motores de IA (4)
  cfgHtml = cfgHtml.replace(
    '<p>Perfil, o que a Sala mostra, projetos, motores de IA, memória e o próprio escritório.</p>',
    '<p>Perfil, o que a Sala mostra, módulos, motores de IA (SDK local), memória e o próprio escritório.</p>'
  );
  cfgHtml = cfgHtml.replace(
    "const TABS = [['perfil', 'Perfil'], ['visao', 'Visão geral'], ['projetos', 'Projetos', 4], ['motores', 'Motores de IA', 3], ['memorias', 'Memórias'], ['sistema', 'Sistema'], ['aparencia', 'Aparência']];",
    "const TABS = [['perfil', 'Perfil'], ['visao', 'Visão geral'], ['projetos', 'Módulos', 5], ['motores', 'Motores de IA', 4], ['memorias', 'Memórias'], ['sistema', 'Sistema'], ['aparencia', 'Aparência']];"
  );

  // 2) Seção Módulos sob controle (substitui Projetos sob controle)
  cfgHtml = cfgHtml.replace(
    '<div style="display: flex; align-items: flex-end"><div class="grow"><h2 style="font-size: 20px; font-weight: 600">Projetos sob controle</h2><p class="muted" style="font-size: 13px; margin-top: 4px">Automação, SLA e o que fica manual em cada projeto.</p></div><button class="btn secondary" onClick="{{newProject}}">Novo projeto</button></div>',
    '<div style="display: flex; align-items: flex-end"><div class="grow"><h2 style="font-size: 20px; font-weight: 600">Módulos sob controle</h2><p class="muted" style="font-size: 13px; margin-top: 4px">Opções pertinentes a cada módulo: automação de gates, SLA, motor padrão e isolamento estrito de workspace/credenciais.</p></div><span class="badge flow">5 módulos</span></div>'
  );
  cfgHtml = cfgHtml.replace(
    "projects: [['Meridian', 'LP · entrega manual · SLA de gate 24 h', 'gate', 'warn'], ['Escritório', 'Sistema · este repositório · manutenção', 'ativo', 'flow'], ['Multiverso Paranoico', 'Studio · publicação passa por você', 'ativo', 'flow'], ['Atlas', 'LP · aguarda contra-assinatura', 'aguardando', '']].map((p) => ({ n: p[0], m: p[1], st: p[2], cls: p[3], ctl: () => app.modal('control', { name: p[0] }) })),",
    "projects: [['Fábrica', 'Esteiras de LP, Ofertas e Sistemas · Product Lab (absorção) · Isolamento Git/.env estrito', 'ativo', 'flow'], ['Raio-X', 'Diagnóstico e dossiê de evidências · Coleta isolada por pasta do cliente', 'ativo', 'flow'], ['Studio', 'Produção editorial multicanal · Mesa do Oráculo e checkpoints de publicação', 'ativo', 'flow'], ['Flow', 'Orquestração e automação entre esteiras e gatilhos operacionais', 'beta', 'warn'], ['Edição', 'Corte, legendagem, trilha e finalização audiovisual com QA', 'beta', 'warn']].map((p) => ({ n: p[0], m: p[1], st: p[2], cls: p[3], ctl: () => app.modal('module-control', { name: p[0] }) })),"
  );

  // 3) Motores de IA: Todos os 4 motores seguem o padrão SDK local na máquina (incluindo Antigravity)
  cfgHtml = cfgHtml.replace(
    '<p class="muted" style="font-size: 13px; margin-top: 4px">Login, chave e interruptor de cada motor. O padrão atende o chat e os jobs sem motor definido.</p>',
    '<p class="muted" style="font-size: 13px; margin-top: 4px">Detecção automática de SDK e instalação local na máquina (padrão principal). Chave de API disponível como fallback opcional.</p>'
  );
  cfgHtml = cfgHtml.replace(
    "mon: { Cursor: true, Claude: true, Codex: false, Antigravity: false }",
    "mon: { Cursor: true, Claude: true, Codex: true, Antigravity: true }, detectedMotors: null"
  );
  cfgHtml = cfgHtml.replace(
    "renderVals() {",
    `componentDidMount() {
    const self = this;
    const tavir = (typeof window !== 'undefined' && (window.tavir || (window.parent && window.parent.tavir))) || null;
    const nameToId = { Cursor: 'cursor', Claude: 'claude', Codex: 'codex', Antigravity: 'antigravity' };
    const idToName = { cursor: 'Cursor', claude: 'Claude', anthropic: 'Claude', codex: 'Codex', antigravity: 'Antigravity' };
    self.persistMotors = function(nextDef, nextMon, nextModel, nextEffort) {
      if (!tavir || !tavir.engines || !tavir.engines.updateSettings) return;
      const mon = nextMon || self.state.mon || {};
      tavir.engines.updateSettings({
        cursorEnabled: mon.Cursor !== false,
        claudeEnabled: mon.Claude !== false,
        anthropicEnabled: mon.Claude !== false,
        codexEnabled: mon.Codex !== false,
        antigravityEnabled: mon.Antigravity !== false,
        defaultEngine: nameToId[nextDef || self.state.def] || 'cursor',
        defaultModel: nextModel || self.state.defModel || 'auto-smart',
        defaultEffort: nextEffort || self.state.defEffort || 'balanced'
      }).then(function(saved) {
        if (!saved) return;
        const applySaved = function(engines) {
          self.setState({
            def: idToName[saved.defaultEngine] || self.state.def,
            defModel: saved.defaultModel,
            defEffort: saved.defaultEffort,
            mon: {
              Cursor: saved.cursorEnabled !== false,
              Claude: (saved.claudeEnabled !== false && saved.anthropicEnabled !== false),
              Codex: saved.codexEnabled !== false,
              Antigravity: saved.antigravityEnabled !== false
            },
            engineCatalog: engines || self.state.engineCatalog || []
          });
        };
        if (tavir.engines.getCatalog) {
          tavir.engines.getCatalog().then(function(cat) {
            applySaved((cat && cat.engines) || []);
          }).catch(function() { applySaved([]); });
        } else {
          applySaved([]);
        }
      }).catch(function() {});
    };
    if (tavir && tavir.engines) {
      const load = tavir.engines.getCatalog ? tavir.engines.getCatalog() : Promise.resolve(null);
      load.then(function(cat) {
        const settings = (cat && cat.settings) || null;
        const engines = (cat && cat.engines) || [];
        if (settings) {
          self.setState({
            def: idToName[settings.defaultEngine] || 'Cursor',
            defModel: settings.defaultModel || 'auto-smart',
            defEffort: settings.defaultEffort || 'balanced',
            mon: {
              Cursor: settings.cursorEnabled !== false,
              Claude: (settings.claudeEnabled !== false && settings.anthropicEnabled !== false),
              Codex: settings.codexEnabled !== false,
              Antigravity: settings.antigravityEnabled !== false
            },
            engineCatalog: engines
          });
        }
      }).catch(function() {});
      if (tavir.engines.detect) {
        tavir.engines.detect().then(function(list) {
          if (Array.isArray(list) && list.length) {
            self.setState({
              detectedMotors: list.map(function(e) {
                return [e.name, e.detail || 'SDK encontrado · Instalação local detectada', true];
              })
            });
          }
        }).catch(function() {});
      }
    }
  }
  renderVals() {`
  );
  cfgHtml = cfgHtml.replace(
    "const MO = [['Cursor', 'Login feito · SDK encontrado', true], ['Claude', 'Chave nesta máquina', true], ['Codex', 'Login feito', true], ['Antigravity', 'Instalação ausente', false]];",
    "const MO = s.detectedMotors || [['Cursor', 'SDK local detectado · ~/.cursor · Apontamento automático', true], ['Claude', 'SDK local detectado · ~/.claude · Apontamento automático', true], ['Codex', 'SDK local detectado · ~/.codex · Apontamento automático', true], ['Antigravity', 'SDK local detectado · ~/.gemini/antigravity · Apontamento automático', true]];"
  );
  cfgHtml = cfgHtml.replace(
    "btn: m[2] ? 'Chave e login' : 'Instalar'",
    "btn: m[2] ? 'Login e cofre' : 'Configurar'"
  );
  cfgHtml = cfgHtml.replace(
    "setDef: () => { self.setState({ def: m[0] }); app.toast('Motor padrão', m[0] + ' atende o chat a partir de agora.'); }, flip: () => { const mo = Object.assign({}, s.mon); mo[m[0]] = !mo[m[0]]; self.setState({ mon: mo }); }",
    "setDef: () => { self.setState({ def: m[0] }); if (self.persistMotors) self.persistMotors(m[0], s.mon); app.toast('Motor padrão', m[0] + ' atende o chat, a Fábrica e os jobs a partir de agora.'); }, flip: () => { const mo = Object.assign({}, s.mon); mo[m[0]] = !mo[m[0]]; const enabled = Object.keys(mo).filter(function(k) { return mo[k]; }); if (!enabled.length) { mo[m[0]] = true; app.toast('Motor', 'Mantenha ao menos um motor ligado.'); } let nextDef = s.def; if (!mo[nextDef]) nextDef = enabled[0] || m[0]; self.setState({ mon: mo, def: nextDef }); if (self.persistMotors) self.persistMotors(nextDef, mo); }"
  );
  cfgHtml = cfgHtml.replace(
    "motorsOk: MO.filter((m) => m[2]).length,",
    `motorsOk: Object.keys(s.mon || {}).filter(function(k) { return s.mon[k]; }).length,
      defModel: s.defModel || 'auto-smart',
      defEffort: s.defEffort || 'balanced',
      defModelOpts: (function() {
        const nameToId = { Cursor: 'cursor', Claude: 'claude', Codex: 'codex', Antigravity: 'antigravity' };
        const catalog = s.engineCatalog || [];
        const motor = catalog.find(function(e) { return e.id === nameToId[s.def]; }) || catalog[0];
        const models = (motor && motor.models) || [{ id: 'auto-smart', label: 'Auto', efforts: [{ id: 'balanced', label: 'Balance' }] }];
        return models.map(function(m) { return { id: m.id, label: m.label, selected: (s.defModel || models[0].id) === m.id }; });
      })(),
      defEffortOpts: (function() {
        const nameToId = { Cursor: 'cursor', Claude: 'claude', Codex: 'codex', Antigravity: 'antigravity' };
        const catalog = s.engineCatalog || [];
        const motor = catalog.find(function(e) { return e.id === nameToId[s.def]; }) || catalog[0];
        const models = (motor && motor.models) || [];
        const model = models.find(function(m) { return m.id === s.defModel; }) || models[0] || { efforts: [{ id: 'balanced', label: 'Balance' }] };
        return (model.efforts || []).map(function(e) { return { id: e.id, label: e.label, selected: (s.defEffort || (model.efforts[0] && model.efforts[0].id)) === e.id }; });
      })(),
      onDefModel: (e) => {
        const next = e.target.value;
        const nameToId = { Cursor: 'cursor', Claude: 'claude', Codex: 'codex', Antigravity: 'antigravity' };
        const catalog = s.engineCatalog || [];
        const motor = catalog.find(function(x) { return x.id === nameToId[s.def]; }) || catalog[0];
        const model = ((motor && motor.models) || []).find(function(x) { return x.id === next; }) || ((motor && motor.models) || [])[0];
        const effort = (model && model.efforts && model.efforts[0] && model.efforts[0].id) || 'balanced';
        self.setState({ defModel: next, defEffort: effort });
        if (self.persistMotors) self.persistMotors(s.def, s.mon, next, effort);
      },
      onDefEffort: (e) => {
        const next = e.target.value;
        self.setState({ defEffort: next });
        if (self.persistMotors) self.persistMotors(s.def, s.mon, s.defModel, next);
      },`
  );

  // Bloco Concierge: modelo e esforço padrão do motor selecionado
  if (!cfgHtml.includes('id="tavir-motor-defaults"')) {
    const defaultsBlock = `<div id="tavir-motor-defaults" class="card" style="padding: 14px; margin-top: 12px; background: var(--surface-0)">
          <div class="eyebrow">Padrão do motor selecionado</div>
          <p class="muted" style="font-size: 12.5px; margin: 6px 0 10px">Como no Concierge: escolha o modelo e a profundidade padrão. Na Fábrica só aparecem os motores ligados acima.</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px">
            <label style="display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 600">Modelo
              <select class="input" value="{{defModel}}" onChange="{{onDefModel}}" style="height: 36px">
                <sc-for list="{{defModelOpts}}" as="opt" hint-placeholder-count="4"><option value="{{opt.id}}" selected="{{opt.selected}}">{{opt.label}}</option></sc-for>
              </select>
            </label>
            <label style="display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 600">Esforço / profundidade
              <select class="input" value="{{defEffort}}" onChange="{{onDefEffort}}" style="height: 36px">
                <sc-for list="{{defEffortOpts}}" as="opt" hint-placeholder-count="4"><option value="{{opt.id}}" selected="{{opt.selected}}">{{opt.label}}</option></sc-for>
              </select>
            </label>
          </div>
        </div>`;
    const lockCard = '<div class="card" style="padding: 12px 14px; display: flex; gap: 10px; font-size: 13px; background: var(--surface-0)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--flow)" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3"></path></svg><span class="sec">Chaves ficam no cofre local desta máquina. Nunca vão para o livro-razão, o chat ou o pacote de entrega.</span></div>';
    if (cfgHtml.includes(lockCard)) {
      cfgHtml = cfgHtml.replace(lockCard, defaultsBlock + lockCard);
    } else {
      cfgHtml = cfgHtml.replace(
        'Chaves ficam no cofre local desta máquina. Nunca vão para o livro-razão, o chat ou o pacote de entrega.',
        'Chaves ficam no cofre local desta máquina. Nunca vão para o livro-razão, o chat ou o pacote de entrega.'
      );
      // fallback: insert before the lock sentence container
      cfgHtml = cfgHtml.replace(
        '<div class="card" style="padding: 12px 14px; display: flex; gap: 10px; font-size: 13px; background: var(--surface-0)">',
        defaultsBlock + '<div class="card" style="padding: 12px 14px; display: flex; gap: 10px; font-size: 13px; background: var(--surface-0)">'
      );
    }
  }

  manifest[cfgUuid].data = zlib.gzipSync(Buffer.from(cfgHtml, 'utf8')).toString('base64');
  console.log('Configurações (Módulos + Motores SDK local + Antigravity) atualizadas!');
}

// 1.3 Limpar 4de11384 (Social Inbox)
const socUuid = '4de11384-84d7-4565-aa6e-7c22c5e8ecbd';
if (manifest[socUuid] && manifest[socUuid].compressed) {
  const buf = Buffer.from(manifest[socUuid].data, 'base64');
  let socHtml = zlib.gunzipSync(buf).toString('utf8');

  const origSocMsgsIdx = socHtml.indexOf('const MSGS = [');
  if (origSocMsgsIdx !== -1) {
    const origSocMsgsEnd = socHtml.indexOf('];', origSocMsgsIdx);
    socHtml = socHtml.slice(0, origSocMsgsIdx) + 'const MSGS = [];' + socHtml.slice(origSocMsgsEnd + 2);
    console.log('MSGS limpas no Social Inbox!');
  }

  const origCurM = "const m = MSGS.find((x) => x.id === s.sel) || MSGS[0];";
  const safeCurM = "const m = MSGS.find((x) => x.id === s.sel) || MSGS[0] || { id: '', from: 'Nenhuma mensagem', ini: '—', ch: '—', contact: '—', t: '—', unread: false, tag: '', tagCls: '', why: '', msgs: [], reply: '' };";
  socHtml = socHtml.replace(origCurM, safeCurM);

  manifest[socUuid].data = zlib.gzipSync(Buffer.from(socHtml, 'utf8')).toString('base64');
  console.log('Social Inbox limpo e atualizado!');
}

// 1.4 Atualizar f2e28035 (Conhecimento: Cérebro, Memória e Biblioteca, Ideias — Indexação na Abertura Estilo Concierge)
const conUuid = 'f2e28035-05ac-4cf8-ab1f-521477ffc884';
if (manifest[conUuid] && manifest[conUuid].compressed) {
  const buf = Buffer.from(manifest[conUuid].data, 'base64');
  let conHtml = zlib.gunzipSync(buf).toString('utf8');

  // Adiciona pílula de status da Indexação na Abertura e botão Reindexar agora no cabeçalho
  conHtml = conHtml.replace(
    '<div class="phead"><div class="grow"><div class="eyebrow">Conhecimento</div><h1 style="margin-top: 8px">{{title}}</h1><p>{{lead}}</p></div></div>',
    '<div class="phead"><div class="grow"><div class="eyebrow">Conhecimento · Indexação na Abertura (Sincron Brain)</div><h1 style="margin-top: 8px">{{title}}</h1><p>{{lead}}</p></div><div class="actions" style="align-items: center"><span class="badge flow">{{totalIndexedN}} itens indexados · {{booksCount}} livros · {{skillsCount}} skills</span><button class="btn secondary" onClick="{{reindexNow}}">Reindexar agora</button></div></div>'
  );

  // Atualiza contador real no Grafo do Cérebro
  conHtml = conHtml.replace(
    '{{nodesN}} setores · 58 agentes · 1.204 notas',
    '{{nodesN}} setores · 58 agentes · {{totalIndexedN}} ativos indexados ({{booksCount}} livros · {{skillsCount}} skills)'
  );

  // Torna as linhas da tabela de Memória e Biblioteca clicáveis para ler o resumo/conteúdo indexado
  conHtml = conHtml.replace(
    '<tbody><sc-for list="{{mem}}" as="m" hint-placeholder-count="8"><tr><td><b>{{m.t}}</b></td><td class="sec">{{m.sc}}</td><td><span class="badge">{{m.d}}</span></td><td class="mono muted" style="font-size: 12px">{{m.src}}</td><td><span class="badge {{m.cls}}">{{m.conf}}</span></td><td class="num muted">{{m.when}}</td></tr></sc-for></tbody>',
    '<tbody><sc-for list="{{mem}}" as="m" hint-placeholder-count="8"><tr onClick="{{m.open}}" style="cursor: pointer" title="Clique para inspecionar o conteúdo indexado"><td><b>{{m.t}}</b></td><td class="sec">{{m.sc}}</td><td><span class="badge">{{m.d}}</span></td><td class="mono muted" style="font-size: 12px">{{m.src}}</td><td><span class="badge {{m.cls}}">{{m.conf}}</span></td><td class="num muted">{{m.when}}</td></tr></sc-for></tbody>'
  );

  // Substitui MEM estático pela base real indexada na abertura (Tier 1 Sincron Brain + 7 Domínios + Livros PDF + Skills + Projetos)
  const origMemIdx = conHtml.indexOf('const MEM = [');
  const origMemEnd = conHtml.indexOf('];', origMemIdx);
  if (origMemIdx !== -1 && origMemEnd !== -1) {
    const defaultCuratedMem = `const MEM = [
  ['[S1] Soul & Identidade TAVIR — Produtividade, Excelência e Receita Real', 'Casa', 'negócios', 'sincron-brain/seed_tier1.md#S1', 'alta', 'abertura', 'Diretriz Soberana: foco absoluto em geração de caixa no curto prazo, qualidade extrema sem retrabalho e operação local-first auditável.'],
  ['[U1] Perfil Operador: Carlos · Especialista TOTVS Protheus & RM + IA Comercial', 'Casa', 'negócios', 'sincron-brain/seed_tier1.md#U1', 'alta', 'abertura', 'Verticais prioritárias: Clínicas médicas/odontológicas, Advocacia, Contabilidade, Engenharia/Obras e Indústrias com ERP TOTVS.'],
  ['[P1] Foco em Receita Curto Prazo: Raio-X Digital + Landing Pages + Agentes WhatsApp', 'Casa', 'mercados', 'sincron-brain/seed_tier1.md#P1', 'alta', 'abertura', 'Priorizar entregas rápidas de alto valor percebido (Raio-X Digital, Páginas de Alta Conversão e Triagem Comercial).'],
  ['[P2] Gate Humano & Completion Guard antes de qualquer deploy ou envio externo', 'Casa', 'engenharia', 'sincron-brain/seed_tier1.md#P2', 'alta', 'abertura', 'Nenhuma entrega sai sem prova visual, validação de links/SEO e assinatura no gate humano.'],
  ['[P3] Isolamento Estrito por Projeto (.env.project e .git/config local)', 'Casa', 'engenharia', 'sincron-brain/seed_tier1.md#P3', 'alta', 'abertura', 'Cada projeto (Fábrica, Raio-X, Studio) opera confinado em sua pasta com credenciais e identidade Git isoladas (TAVIR vs Pessoal).'],
  ['$100M Offers — Equação de Valor & Grand Slam Offer (Alex Hormozi)', 'Biblioteca', 'negócios', 'conhecimento/negocios/hormozi-value-equation.md', 'alta', 'abertura', 'Maximizar Resultado Desejado × Probabilidade Percebida e minimizar Tempo de Espera × Esforço/Sacrifício.'],
  ['$100M Leads — Core Four & Geração de Demanda Previsível (Alex Hormozi)', 'Biblioteca', 'mercados', 'conhecimento/negocios/hormozi-core-four.md', 'alta', 'abertura', 'Warm Outreach, Cold Outreach, Conteúdo Orgânico e Tráfego Pago combinados com ímãs de alto valor (Raio-X gratuito).'],
  ['Rápido e Devagar — Sistema 1 vs Sistema 2 & Viés de Ancoragem (Daniel Kahneman)', 'Biblioteca', 'psicologia', 'conhecimento/psicologia/kahneman-ancoragem.md', 'alta', 'abertura', 'Ancorar o valor do problema e o ROI antes de apresentar o investimento nas propostas comerciais da TAVIR.'],
  ['As Armas da Persuasão — 7 Princípios de Influência (Robert Cialdini)', 'Biblioteca', 'psicologia', 'conhecimento/psicologia/cialdini-principios.md', 'alta', 'abertura', 'Reciprocidade (Raio-X), Autoridade, Prova Social, Compromisso, Afeição, Escassez e Unidade aplicados em LPs e vendas.'],
  ['Breakthrough Advertising — 5 Níveis de Consciência (Eugene Schwartz)', 'Biblioteca', 'copywriting', 'conhecimento/copywriting/schwartz-niveis-consciencia.md', 'alta', 'abertura', 'Inconsciente, Consciente do Problema, da Solução, do Produto e Totalmente Consciente: define a headline e o gancho.'],
  ['De Zero a Um — Monopólios Criativos & Segredos de Mercado (Peter Thiel)', 'Biblioteca', 'negócios', 'conhecimento/negocios/thiel-zero-to-one.md', 'alta', 'abertura', 'Dominar um nicho específico (ex.: clínicas e escritórios B2B) com vantagem tecnológica 10x superior antes de expandir.'],
  ['Jobs-to-Be-Done — O Progresso que o Cliente Contrata (Clayton Christensen)', 'Biblioteca', 'frameworks', 'conhecimento/frameworks/christensen-jtbd.md', 'alta', 'abertura', 'Clientes não compram software ou páginas; contratam previsibilidade de agenda, autoridade e redução de atrito operacional.'],
  ['Design System TAVIR — Contrato Híbrido Tinta Profunda & Lima Elétrico', 'Casa', 'design', 'conhecimento/design/tavir-design-system.md', 'alta', 'abertura', 'Rail 64px (#070d18), SubNav 236px (#0f1729), tokens semânticos e contraste mínimo 4.5:1 em toda interface.'],
  ['Catálogo Operacional — 80+ Skills Técnicas & Squads Especializados', 'Agente', 'engenharia', 'agentes/escopo/skills/_INDEX.md', 'alta', 'abertura', 'Skills de arquitetura, React, FastAPI, SQLite, auditoria OWASP, SEO técnico, copywriting e extração Product Lab.']
]`;
    conHtml = conHtml.slice(0, origMemIdx) + defaultCuratedMem + conHtml.slice(origMemEnd + 2);
  }

  // Conecta componentDidMount do Conhecimento ao window.tavir.vault (indexado na abertura)
  conHtml = conHtml.replace(
    "constructor(props) { super(props); this.state = { v: 'cerebro', node: 'eng', draft: '', notes: [], scope: 'Todos', dom: 'todos', mq: '', idea: '', ideas: [",
    "constructor(props) { super(props); this.state = { v: 'cerebro', node: 'eng', draft: '', notes: [], scope: 'Todos', dom: 'todos', mq: '', vaultItems: null, vaultStats: null, idea: '', ideas: ["
  );

  conHtml = conHtml.replace(
    '  renderVals() {',
    `  componentDidMount() {
    this.syncVault(false);
  }
  syncVault(forceReindex) {
    const self = this;
    const tavir = (typeof window !== 'undefined' && window.tavir) || null;
    if (tavir && tavir.vault) {
      const p = forceReindex && tavir.vault.reindex ? tavir.vault.reindex() : Promise.all([tavir.vault.list(), tavir.vault.stats()]);
      Promise.resolve(p).then(function(res) {
        if (forceReindex) {
          return Promise.all([tavir.vault.list(), tavir.vault.stats()]).then(function(r2) {
            self.applyVaultData(r2[0], r2[1], true);
          });
        } else {
          self.applyVaultData(res[0], res[1], false);
        }
      }).catch(function(err) {
        console.error('[TAVIR Vault] Erro ao ler índice de abertura:', err);
      });
    }
  }
  applyVaultData(items, stats, showToast) {
    if (!Array.isArray(items) || !items.length) return;
    const mapped = items.map(function(d) {
      return [
        d.title || d.id,
        d.scope || 'Biblioteca',
        d.domain || 'negócios',
        d.source || d.path || 'conhecimento',
        d.confidence || 'alta',
        d.updatedAt || 'abertura',
        d.summary || ''
      ];
    });
    this.setState({ vaultItems: mapped, vaultStats: stats || null });
    if (showToast && this.props.app && this.props.app.toast) {
      this.props.app.toast('Indexação concluída', mapped.length + ' ativos de conhecimento, memórias Tier 1, livros e skills sincronizados.');
    }
  }
  renderVals() {`
  );

  conHtml = conHtml.replace(
    "const mem = MEM.filter((m) => (s.scope === 'Todos' || m[1] === s.scope) && (s.dom === 'todos' || m[2] === s.dom) && (!mq || m[0].toLowerCase().indexOf(mq) >= 0));",
    "const allMem = (Array.isArray(s.vaultItems) && s.vaultItems.length) ? s.vaultItems : MEM;\n    const st = s.vaultStats || {};\n    const totalIndexedN = st.totalDocs || allMem.length;\n    const booksCount = st.booksCount || 20;\n    const skillsCount = st.skillsCount || 81;\n    const mem = allMem.filter((m) => (s.scope === 'Todos' || m[1] === s.scope) && (s.dom === 'todos' || m[2] === s.dom) && (!mq || (m[0] + ' ' + m[3] + ' ' + (m[6] || '')).toLowerCase().indexOf(mq) >= 0));"
  );

  conHtml = conHtml.replace(
    "notes: N[8] + s.notes.filter((x) => x.node === N[0]).length,",
    "notes: (st.byDomain ? (N[0] === 'eng' ? (st.byDomain.engenharia || 0) + skillsCount : N[0] === 'com' ? (st.byDomain['negócios'] || 0) + (st.byDomain.mercados || 0) : N[0] === 'con' ? (st.byDomain.copywriting || 0) + (st.byDomain.design || 0) : N[8]) : N[8]) + s.notes.filter((x) => x.node === N[0]).length,"
  );

  conHtml = conHtml.replace(
    "scopes: scopes.map((x) => ({ label: x, n: x === 'Todos' ? MEM.length : MEM.filter((m) => m[1] === x).length, on: s.scope === x ? 'on' : '', pick: () => self.setState({ scope: x }) })),",
    "totalIndexedN: totalIndexedN, booksCount: booksCount, skillsCount: skillsCount,\n      reindexNow: () => self.syncVault(true),\n      scopes: scopes.map((x) => ({ label: x, n: x === 'Todos' ? allMem.length : allMem.filter((m) => m[1] === x).length, on: s.scope === x ? 'on' : '', pick: () => self.setState({ scope: x }) })),"
  );

  conHtml = conHtml.replace(
    "mem: mem.map((m) => ({ t: m[0], sc: m[1], d: m[2], src: m[3], conf: m[4], cls: confCls[m[4]] || '', when: m[5] })), memEmpty: mem.length === 0,",
    "mem: mem.slice(0, 120).map((m) => ({ t: m[0], sc: m[1], d: m[2], src: m[3], conf: m[4], cls: confCls[m[4]] || '', when: m[5], open: () => A.modal('evidence', { title: m[0], sc: m[1], dom: m[2], src: m[3], conf: m[4], text: m[6] || m[0] }) })), memEmpty: mem.length === 0,"
  );

  manifest[conUuid].data = zlib.gzipSync(Buffer.from(conHtml, 'utf8')).toString('base64');
  console.log('Conhecimento (Cérebro + Memória e Biblioteca + Indexação na Abertura) atualizado!');
}

// ==========================================
// 2. LIMPAR PÁGINA RAIZ __bundler/template
// ==========================================
const templateRegex = /<script type="__bundler\/template">([\s\S]*?)<\/script>/i;
const templateMatch = templateRegex.exec(html);

if (!templateMatch) {
  throw new Error('Script __bundler/template não encontrado!');
}

let templateHtml = JSON.parse(templateMatch[1]);
console.log('Template HTML decodificado! Tamanho:', templateHtml.length);

// 2.1 Limpa os JOBS mockados
const origJobsIdx = templateHtml.indexOf('const JOBS = [');
if (origJobsIdx !== -1) {
  const origJobsEnd = templateHtml.indexOf('];', origJobsIdx);
  templateHtml = templateHtml.slice(0, origJobsIdx) + 'const JOBS = [];' + templateHtml.slice(origJobsEnd + 2);
  console.log('JOBS limpos com sucesso!');
}

// 2.2 Limpa as TASKS mockadas
const origTasksIdx = templateHtml.indexOf('const TASKS = [');
if (origTasksIdx !== -1) {
  const origTasksEnd = templateHtml.indexOf('];', origTasksIdx);
  templateHtml = templateHtml.slice(0, origTasksIdx) + 'const TASKS = [];' + templateHtml.slice(origTasksEnd + 2);
  console.log('TASKS limpas com sucesso!');
}

// 2.3 Limpa as APS (aprovações) mockadas
const origApsIdx = templateHtml.indexOf('const APS = [');
if (origApsIdx !== -1) {
  const origApsEnd = templateHtml.indexOf('];', origApsIdx);
  templateHtml = templateHtml.slice(0, origApsIdx) + 'const APS = [];' + templateHtml.slice(origApsEnd + 2);
  console.log('APS limpas com sucesso!');
}

// 2.4 Limpa activity mockada
const origActIdx = templateHtml.indexOf('activity: [');
if (origActIdx !== -1) {
  const origActEnd = templateHtml.indexOf(']', origActIdx);
  templateHtml = templateHtml.slice(0, origActIdx) + 'activity: []' + templateHtml.slice(origActEnd + 1);
  console.log('Activity limpa com sucesso!');
}

// 2.5 Limpa esteiras ao vivo na Sala de Operação
const origRoomLinesIdx = templateHtml.indexOf('lines: [');
if (origRoomLinesIdx !== -1) {
  const origRoomLinesEnd = templateHtml.indexOf('].map((l)', origRoomLinesIdx);
  if (origRoomLinesEnd !== -1) {
    templateHtml = templateHtml.slice(0, origRoomLinesIdx) + 'lines: [].map((l)' + templateHtml.slice(origRoomLinesEnd + 9);
    console.log('Linhas da Sala limpas com sucesso!');
  }
}

// 2.6 Limpa notificações pendentes mockadas
const origNotifsIdx = templateHtml.indexOf('const notifs = [');
if (origNotifsIdx !== -1) {
  const origNotifsEnd = templateHtml.indexOf('];', origNotifsIdx);
  templateHtml = templateHtml.slice(0, origNotifsIdx) + 'const notifs = [];' + templateHtml.slice(origNotifsEnd + 2);
  console.log('Notificações limpas com sucesso!');
}

// 2.7 Limpa histórico de chat mockado (referências a Meridian/Multiverso)
const origChatsIdx = templateHtml.indexOf('const CHATS = {');
if (origChatsIdx !== -1) {
  const origChatsEnd = templateHtml.indexOf('};', origChatsIdx);
  const cleanChats = `const CHATS = {
  'cv-paula': { agent: 'Paula PM', ini: 'PP', role: 'Orquestradora & Planejamento', model: 'claude-opus-4', title: 'Geral', time: nowHM(), busy: false, messages: [
    { role: 'agent', text: 'Olá, Carlos! Sou a Paula PM. Todos os motores e esteiras estão prontos para receber novas tarefas.' }
  ] },
  'cv-yuri': { agent: 'Yuri UX', ini: 'YU', role: 'UX Research & Prova Visual', model: 'claude-sonnet-4', title: 'Design & UX', time: nowHM(), busy: false, messages: [
    { role: 'agent', text: 'Pronto para conduzir provas visuais e validação de interfaces.' }
  ] }
};`;
  templateHtml = templateHtml.slice(0, origChatsIdx) + cleanChats + templateHtml.slice(origChatsEnd + 2);
  console.log('CHATS limpos com sucesso!');
}

// 2.8 Limpar referências iniciais de job e aprovação no state
templateHtml = templateHtml.replace("jobId: 'job-014',", "jobId: '',");
templateHtml = templateHtml.replace("approvalId: 'ap-02',", "approvalId: '',");

// 2.9 Fallbacks anti-crash para STATUS, jcur, dcur e tdT
const origStatus = "  paused: ['Pausado', 'warn', 'oklch(.80 .155 78)', 'warn']\n};";
const safeStatus = "  paused: ['Pausado', 'warn', 'oklch(.80 .155 78)', 'warn'],\n  cancelled: ['Cancelado', 'danger', 'oklch(.635 .185 27)', 'danger'],\n  canceled: ['Cancelado', 'danger', 'oklch(.635 .185 27)', 'danger'],\n  done: ['Concluído', 'flow', '#1BC5BD', ''],\n  active: ['Rodando', 'flow', '#1BC5BD', 'run']\n};";
templateHtml = templateHtml.replace(origStatus, safeStatus);
templateHtml = templateHtml.replace("const ST = STATUS[jcur.status];", "const ST = STATUS[jcur.status] || STATUS.completed;");
templateHtml = templateHtml.replace(
  "label: STATUS[j.status][0], color: STATUS[j.status][2], fillCls: STATUS[j.status][3],",
  "label: (STATUS[j.status] || STATUS.completed)[0], color: (STATUS[j.status] || STATUS.completed)[2], fillCls: (STATUS[j.status] || STATUS.completed)[3],"
);
templateHtml = templateHtml.replace(
  "fillCls: j ? STATUS[j.status][3] : '',",
  "fillCls: j ? (STATUS[j.status] || STATUS.completed)[3] : '',"
);

const origJcur = "const jcur = s.jobs.find((j) => j.id === s.jobId) || jlist[0] || s.jobs[0];";
const safeJcur = "const jcur = s.jobs.find((j) => j.id === s.jobId) || jlist[0] || s.jobs[0] || { id: '', title: 'Nenhum job ativo', who: '—', ini: '—', status: 'completed', progress: 0, model: '—', motor: '—', effort: '—', task: '—', cost: 0, ceiling: 0, started: '—', tokens: '0' };";
templateHtml = templateHtml.replace(origJcur, safeJcur);
templateHtml = templateHtml.replace(
  "isFailed: jcur.status === 'failed',",
  "isFailed: jcur.status === 'failed', failTitle: jcur.error ? 'A execução parou.' : 'O job parou antes do deploy.', failWhy: jcur.error || 'Variável obrigatória ausente: SUPABASE_URL. Nada foi publicado. O gate ap-02 espera sua decisão para registrar a variável e refazer.',"
);
const failBanner = '<b>O job parou antes do deploy.</b><p class="sec" style="margin-top: 4px; font-size: 13px">Variável obrigatória ausente: SUPABASE_URL. Nada foi publicado. O gate ap-02 espera sua decisão para registrar a variável e refazer.</p>';
if (templateHtml.includes(failBanner)) {
  templateHtml = templateHtml.replace(failBanner, '<b>{{job.failTitle}}</b><p class="sec" style="margin-top: 4px; font-size: 13px">{{job.failWhy}}</p>');
  console.log('Banner de falha da execução passou a usar o erro real do job.');
} else {
  console.log('Banner de falha não encontrado para troca.');
}

const origDcur = "const dcur = dlist.find((a) => a.id === s.approvalId) || dlist[0] || null;";
const safeDcur = "const dcur = dlist.find((a) => a.id === s.approvalId) || dlist[0] || { id: '', group: 'none', kind: 'none', title: 'Nenhuma decisão pendente', who: '—', ini: '—', type: '—', status: 'approved', impact: 'baixo', task: '—', age: '—', ageH: 0, reason: 'Tudo liberado. Nenhum bloqueio humano na sala.', question: 'Sem aprovações pendentes.', yes: [], no: [], more: [] };";
templateHtml = templateHtml.replace(origDcur, safeDcur);
templateHtml = templateHtml.replace(
  "const sl = slaOf(a), g = GRP[a.group], on = !!dcur && a.id === dcur.id && !jd;",
  "const sl = slaOf(a), g = GRP[a.group] || GRP.review, on = !!dcur && a.id === dcur.id && !jd;"
);
templateHtml = templateHtml.replace(
  "const steps = c[0] === 'approved' ? dcur.yes : c[0] === 'rejected' ? dcur.no : dcur.more;",
  "const steps = (c[0] === 'approved' ? dcur.yes : c[0] === 'rejected' ? dcur.no : dcur.more) || [];"
);

const origTdT = "const tdT = s.modal === 'taskdetail' ? (s.tasks.find((t) => t.id === (s.mdata && s.mdata.id)) || s.tasks[0]) : s.tasks[0];";
const safeTdT = "const tdT = (s.modal === 'taskdetail' ? (s.tasks.find((t) => t.id === (s.mdata && s.mdata.id)) || s.tasks[0]) : s.tasks[0]) || { seq: 0, title: 'Nenhuma tarefa', who: '—', sector: '—', prio: 'Normal', gate: false, job: null, status: 'to_plan' };";
templateHtml = templateHtml.replace(origTdT, safeTdT);
console.log('Fallbacks de segurança aplicados!');

// 2.10 Injeta sincronização IPC reativa + Indexação na Abertura (Estilo Concierge) no componentDidMount
const oldMount = 'componentDidMount() { this.timer = setInterval(() => this.tick(), 1800); }';
const newMount = `componentDidMount() {
    this.timer = setInterval(() => this.tick(), 1800);
    const self = this;
    if (typeof window !== 'undefined' && window.tavir) {
      console.log('[TAVIR IPC] Conectando ao backend Electron & SQLite + Indexação na Abertura...');
      Promise.all([
        window.tavir.jobs.list(),
        window.tavir.tasks.list(),
        window.tavir.approvals.list(),
        window.tavir.vault && window.tavir.vault.list ? window.tavir.vault.list() : Promise.resolve([]),
        window.tavir.vault && window.tavir.vault.stats ? window.tavir.vault.stats() : Promise.resolve(null)
      ]).then(function(res) {
        const u = {};
        if (Array.isArray(res[0])) u.jobs = res[0];
        if (Array.isArray(res[1])) u.tasks = res[1];
        if (Array.isArray(res[2])) u.approvals = res[2];
        if (Array.isArray(res[3])) u.vaultDocs = res[3];
        if (res[4]) u.vaultStats = res[4];
        console.log('[TAVIR IPC] Dados reais + Índice de Abertura aplicados:', {
          jobs: u.jobs ? u.jobs.length : 0,
          tasks: u.tasks ? u.tasks.length : 0,
          approvals: u.approvals ? u.approvals.length : 0,
          vaultDocs: u.vaultDocs ? u.vaultDocs.length : 0
        });
        self.setState(u);
        if (window.tavir.jobs.logs) {
          window.tavir.jobs.logs().then(function (logs) {
            if (logs && typeof logs === 'object') self.setState({ logs: Object.assign({}, logs, self.state.logs || {}) });
          }).catch(function () {});
        }
        if (res[4] && res[4].totalDocs) {
          self.log(
            'Sincron Brain',
            'Indexação na abertura concluída: ' + res[4].totalDocs + ' ativos (' + (res[4].booksCount || 0) + ' livros, ' + (res[4].skillsCount || 0) + ' skills, ' + (res[4].projectsCount || 0) + ' projetos)',
            '#1BC5BD'
          );
        }
      }).catch(function(err) {
        console.error('[TAVIR IPC] Erro ao sincronizar:', err);
      });
      window.tavir.onEvent(function(evt) {
        if (evt && evt.meta && evt.meta.track) {
          const list = (self.state.jobs || []).slice();
          let j = list.find(function(x) { return x.id === evt.runId; });
          const st = evt.meta.status || (evt.type === 'error' ? 'failed' : evt.type === 'done' ? 'completed' : 'running');
          if (!j) {
            j = {
              id: evt.runId,
              title: evt.meta.title || 'Trilho de alteração',
              who: evt.meta.owner || 'Trilho',
              ini: String(evt.meta.owner || 'TR').slice(0, 2).toUpperCase(),
              status: st,
              progress: evt.meta.progress || 12,
              model: evt.meta.model || 'auto',
              motor: evt.meta.motor || 'Cursor',
              effort: 'trilho',
              task: evt.meta.focus || 'trilho',
              cost: 0,
              ceiling: 0,
              started: 'agora',
              tokens: '0',
              error: evt.type === 'error' ? evt.content : ''
            };
            list.unshift(j);
          } else {
            j.status = st;
            j.progress = evt.meta.progress || j.progress;
            if (evt.meta.title) j.title = evt.meta.title;
            if (evt.type === 'error') j.error = evt.content;
            if (evt.type === 'done') j.error = '';
          }
          const logs = Object.assign({}, self.state.logs || {});
          const d = new Date();
          const ts = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
          const bad = evt.type === 'error';
          logs[evt.runId] = (logs[evt.runId] || []).concat([{ ts: ts, lvl: bad ? 'erro' : 'info', cls: bad ? 'err' : 'info', text: String(evt.content || '').slice(0, 400) }]).slice(-80);
          const patch = { jobs: list, logs: logs };
          if (!self.state.jobId) patch.jobId = evt.runId;
          self.setState(patch);
          return;
        }
        if (evt.type === 'tool_start' || evt.type === 'status' || evt.type === 'thought') {
          const list = (self.state.jobs || []).slice();
          const j = list.find(function(x) { return x.id === evt.runId; });
          if (j) {
            j.progress = Math.min(95, j.progress + 8);
            self.setState({ jobs: list });
          }
        }
      });
    }
  }`;

if (templateHtml.includes(oldMount)) {
  templateHtml = templateHtml.replace(oldMount, newMount);
  console.log('componentDidMount atualizado com IPC reativo + Indexação na Abertura!');
}

// 2.10b Enriquecer modal 'evidence' para exibir conteúdo de Conhecimento / Memória Tier 1 / Livros / Skills
const origEvidenceSpec = `      evidence: { title: 'Evidência', lead: 'Leitura do artefato, sem executar o job de novo.', size: 'lg', primary: 'Fechar', cancel: 'Copiar caminho', fields: [
        { k: 'c', type: 'code', text: 'status: observed\\nsource: workspace/meridian/qa.md\\nchecked_by: Edna E2E · 14:16\\n\\n- [x] Build sem erro\\n- [x] Links internos\\n- [ ] Prova visual em 390 px\\n- [ ] SEO assinado por Nina SEO' },
        { k: 'n', type: 'note', tone: 'info', text: 'Classificação: observado. Fonte local, verificável no workspace.' }] },`;
const newEvidenceSpec = `      evidence: { title: (d && d.title) || 'Evidência', eyebrow: (d && d.sc) ? (d.sc + ' · ' + (d.dom || 'conhecimento')) : 'Artefato Indexado', lead: (d && d.src) ? ('Fonte: ' + d.src) : 'Leitura do artefato, sem executar o job de novo.', size: 'lg', primary: 'Fechar', cancel: 'Fechar', fields: [
        { k: 'c', type: 'code', text: (d && d.text) ? ('fonte: ' + (d.src || 'local') + '\\nescopo: ' + (d.sc || 'Biblioteca') + ' | dominio: ' + (d.dom || 'geral') + ' | confianca: ' + (d.conf || 'alta') + '\\n\\n' + d.text) : 'status: observed\\nsource: workspace/meridian/qa.md\\nchecked_by: Edna E2E · 14:16\\n\\n- [x] Build sem erro\\n- [x] Links internos\\n- [ ] Prova visual em 390 px\\n- [ ] SEO assinado por Nina SEO' },
        { k: 'n', type: 'note', tone: 'info', text: (d && d.src) ? ('Indexado na abertura pelo Sincron Brain · Fonte verificável em ' + d.src) : 'Classificação: observado. Fonte local, verificável no workspace.' }] },`;
if (templateHtml.includes(origEvidenceSpec)) {
  templateHtml = templateHtml.replace(origEvidenceSpec, newEvidenceSpec);
  console.log("Modal 'evidence' enriquecido para leitura de itens indexados na abertura!");
}

// 2.10c Conectar Paleta Ctrl + K (hits) ao índice de abertura (s.vaultDocs)
const origPaletteRoster = "ROSTER.forEach((a) => hits.push({ k: 'Agente', t: a[0], m: a[1], fn: () => self.open('soul', { name: a[0], role: a[1], sector: a[2], ini: a[3], busy: a[4], model: 'claude-sonnet-4' }) }));";
const newPaletteRosterAndVault = `ROSTER.forEach((a) => hits.push({ k: 'Agente', t: a[0], m: a[1], fn: () => self.open('soul', { name: a[0], role: a[1], sector: a[2], ini: a[3], busy: a[4], model: 'claude-sonnet-4' }) }));
    (s.vaultDocs || []).forEach((vd) => hits.push({ k: vd.scope || 'Conhecimento', t: vd.title, m: (vd.domain || 'geral') + ' · ' + (vd.source || ''), fn: () => self.open('evidence', { title: vd.title, sc: vd.scope, dom: vd.domain, src: vd.source, conf: vd.confidence, text: vd.summary || vd.title }) }));`;
if (templateHtml.includes(origPaletteRoster)) {
  templateHtml = templateHtml.replace(origPaletteRoster, newPaletteRosterAndVault);
  console.log('Paleta Ctrl + K conectada ao índice de abertura (vaultDocs)!');
}

// 2.11 Conecta a ação de disparar job no wizard com window.tavir.jobs.start
const startMarker = "const nj = { id: id, title: s.jobTitle || 'Novo job da Sala', who: 'Paula PM', ini: 'PP', status: 'running', progress: 4, model: s.wzModel, motor: s.wzMotor, effort: ee[1], task: '#' + (s.tasks.length + 1), cost: 0, ceiling: parseFloat(s.jobCeiling) || 5, started: nowHM(), tokens: '0' };";
const startIpc = `const nj = { id: id, title: s.jobTitle || 'Novo job da Sala', who: 'Paula PM', ini: 'PP', status: 'running', progress: 4, model: s.wzModel, motor: s.wzMotor, effort: ee[1], task: '#' + (s.tasks.length + 1), cost: 0, ceiling: parseFloat(s.jobCeiling) || 5, started: nowHM(), tokens: '0' };
    if (typeof window !== 'undefined' && window.tavir && window.tavir.jobs && window.tavir.jobs.start) {
      window.tavir.jobs.start({
        title: s.jobTitle || 'Novo job da Sala',
        engine: s.wzMotor,
        model: s.wzModel,
        ceiling: parseFloat(s.jobCeiling) || 5
      });
    }`;

if (templateHtml.includes(startMarker)) {
  templateHtml = templateHtml.replace(startMarker, startIpc);
  console.log('startJob conectado com window.tavir.jobs.start!');
}

// 2.12 Remove o botão 'Iniciar job' do header
const origHeaderBtnRegex = /<button class="btn secondary \{\{sp\.jobbtn\}\}" sc-camel-on-click="\{\{openJob\}\}">[\s\S]*?Iniciar job\s*<\/button>/i;
if (origHeaderBtnRegex.test(templateHtml)) {
  templateHtml = templateHtml.replace(origHeaderBtnRegex, '');
  console.log("Botão 'Iniciar job' removido do header!");
}

// 2.13 Motores de IA no Wizard (todos os 4 com detecção de SDK local na máquina, incluindo Antigravity)
templateHtml = templateHtml.replace(
  "const MOTORS = [['Cursor', 'Padrão do chat · login feito', 'padrão', 'flow', false], ['Claude', 'Chave nesta máquina', 'conectado', '', false], ['Codex', 'Login feito', 'conectado', '', false], ['Antigravity', 'Instalação ausente', 'sem conexão', 'danger', true]];",
  "const MOTORS = [['Cursor', 'Padrão do chat · SDK local detectado', 'padrão', 'flow', false], ['Claude', 'SDK local detectado · ~/.claude', 'conectado', 'flow', false], ['Codex', 'SDK local detectado · ~/.codex', 'conectado', 'flow', false], ['Antigravity', 'SDK local detectado · ~/.gemini/antigravity', 'conectado', 'flow', false]];"
);

// 2.14 Atualizar modais: botão "Selecionar pasta no disco..." ao lado do campo de caminho, modal 'factory-delete' (perguntar se exclui arquivos ou mantém pasta), 'factory-new', 'factory-absorb' (Product Lab), 'control', 'module-control', 'motor', 'task-edit' e 'task-delete'
const origModalTextField = '<sc-if value="{{f.isText}}" hint-placeholder-val="{{true}}"><label class="field"><span>{{f.label}}</span><input class="input" type="{{f.itype}}" value="{{f.val}}" placeholder="{{f.ph}}" sc-camel-on-change="{{f.onInput}}"><sc-if value="{{f.err}}" hint-placeholder-val="{{false}}"><small style="color: var(--danger)">{{f.errText}}</small></sc-if><sc-if value="{{f.hasHelp}}" hint-placeholder-val="{{false}}"><small>{{f.help}}</small></sc-if></label></sc-if>';
const newModalTextField = '<sc-if value="{{f.isText}}" hint-placeholder-val="{{true}}"><div class="field"><span>{{f.label}}</span><div style="display: flex; gap: 8px; align-items: center"><input class="input" style="flex: 1" type="{{f.itype}}" value="{{f.val}}" placeholder="{{f.ph}}" sc-camel-on-input="{{f.onInput}}" sc-camel-on-change="{{f.onInput}}"><sc-if value="{{f.hasPick}}" hint-placeholder-val="{{false}}"><button type="button" class="btn secondary" style="height: 42px; padding: 0 14px; flex: none; border-color: var(--flow-subtle-line); color: var(--flow)" sc-camel-on-click="{{f.onPick}}">📁 {{f.pickLabel}}</button></sc-if></div><sc-if value="{{f.err}}" hint-placeholder-val="{{false}}"><small style="color: var(--danger)">{{f.errText}}</small></sc-if><sc-if value="{{f.hasHelp}}" hint-placeholder-val="{{false}}"><small>{{f.help}}</small></sc-if></div></sc-if>';
if (templateHtml.includes(origModalTextField)) {
  templateHtml = templateHtml.replace(origModalTextField, newModalTextField);
  console.log('Botão "Selecionar pasta no disco..." posicionado ao lado do input de caminho no modal!');
}
templateHtml = templateHtml.replace(
  '<textarea class="input" rows="{{f.rows}}" placeholder="{{f.ph}}" value="{{f.val}}" sc-camel-on-change="{{f.onInput}}"></textarea>',
  '<textarea class="input" rows="{{f.rows}}" placeholder="{{f.ph}}" value="{{f.val}}" sc-camel-on-input="{{f.onInput}}" sc-camel-on-change="{{f.onInput}}"></textarea>'
);

// 2.14a Adicionar botões Editar e Excluir diretamente nos cards do Kanban (Tasks) e no Drawer Detalhe da Task
const origKanbanCard = `        <sc-for list="{{c.cards}}" as="t" hint-placeholder-count="2">
          <button class="kcard {{t.gateCls}}" sc-camel-on-click="{{t.open}}">
            <div style="display: flex; align-items: center; gap: 8px"><span class="num muted" style="font-size: 12px">#{{t.seq}}</span><div class="grow"></div><span class="badge {{t.prioCls}}">{{t.prio}}</span></div>
            <b style="font-size: 14px; line-height: 1.35; font-weight: 600">{{t.title}}</b>
            <sc-if value="{{t.hasJob}}" hint-placeholder-val="{{false}}"><div style="display: flex; align-items: center; gap: 8px"><div class="track" style="height: 4px"><div class="fill {{t.fillCls}}" style="width: {{t.jobPct}}%"></div></div><span class="num muted" style="font-size: 11px">{{t.jobPct}}%</span></div></sc-if>
            <div style="display: flex; align-items: center; gap: 8px"><span class="av" style="width: 24px; height: 24px; font-size: 9px">{{t.ini}}</span><span class="muted" style="font-size: 12px">{{t.who}} · {{t.sector}}</span><div class="grow"></div>
              <sc-if value="{{t.gate}}" hint-placeholder-val="{{false}}"><span class="badge danger">gate</span></sc-if>
              <sc-if value="{{t.planning}}" hint-placeholder-val="{{false}}"><span class="badge warn">planejando</span></sc-if>
            </div>
          </button>
        </sc-for>`;

const newKanbanCard = `        <sc-for list="{{c.cards}}" as="t" hint-placeholder-count="2">
          <div class="kcard {{t.gateCls}}" sc-camel-on-click="{{t.open}}" style="cursor: pointer">
            <div style="display: flex; align-items: center; gap: 6px"><span class="num muted" style="font-size: 12px">#{{t.seq}}</span><span class="badge {{t.prioCls}}">{{t.prio}}</span><div class="grow"></div><button type="button" class="btn sm ghost" style="height: 24px; padding: 0 8px; font-size: 11px" sc-camel-on-click="{{t.edit}}" title="Editar task">Editar</button><button type="button" class="btn sm ghost" style="height: 24px; padding: 0 8px; font-size: 11px; color: var(--danger)" sc-camel-on-click="{{t.del}}" title="Excluir task">Excluir</button></div>
            <b style="font-size: 14px; line-height: 1.35; font-weight: 600">{{t.title}}</b>
            <sc-if value="{{t.hasDesc}}" hint-placeholder-val="{{false}}"><p class="muted" style="font-size: 12px; line-height: 1.4; margin: 0">{{t.desc}}</p></sc-if>
            <sc-if value="{{t.hasJob}}" hint-placeholder-val="{{false}}"><div style="display: flex; align-items: center; gap: 8px"><div class="track" style="height: 4px"><div class="fill {{t.fillCls}}" style="width: {{t.jobPct}}%"></div></div><span class="num muted" style="font-size: 11px">{{t.jobPct}}%</span></div></sc-if>
            <div style="display: flex; align-items: center; gap: 8px"><span class="av" style="width: 24px; height: 24px; font-size: 9px">{{t.ini}}</span><span class="muted" style="font-size: 12px">{{t.who}} · {{t.sector}}</span><div class="grow"></div>
              <sc-if value="{{t.gate}}" hint-placeholder-val="{{false}}"><span class="badge danger">gate</span></sc-if>
              <sc-if value="{{t.planning}}" hint-placeholder-val="{{false}}"><span class="badge warn">planejando</span></sc-if>
            </div>
          </div>
        </sc-for>`;

if (templateHtml.includes(origKanbanCard)) {
  templateHtml = templateHtml.replace(origKanbanCard, newKanbanCard);
  console.log('Botões Editar e Excluir adicionados aos cards de Tasks (Kanban)!');
}

const origTaskDrawerActions = `      <div class="actions"><button class="btn secondary" sc-camel-on-click="{{openPlan}}">Planejar com Paula</button><sc-if value="{{td.hasJob}}" hint-placeholder-val="{{false}}"><button class="btn primary" sc-camel-on-click="{{tdGoJob}}">Ver execução</button></sc-if></div>`;
const newTaskDrawerActions = `      <sc-if value="{{td.hasDesc}}" hint-placeholder-val="{{false}}"><div class="field"><span>Contexto / Descrição</span><p class="sec" style="font-size: 13.5px; line-height: 1.55">{{td.desc}}</p></div></sc-if>
      <div class="actions" style="flex-wrap: wrap; gap: 8px">
        <button type="button" class="btn secondary" sc-camel-on-click="{{tdEdit}}">Editar task</button>
        <button type="button" class="btn secondary" sc-camel-on-click="{{openPlan}}">Planejar com Paula</button>
        <sc-if value="{{td.hasJob}}" hint-placeholder-val="{{false}}"><button type="button" class="btn primary" sc-camel-on-click="{{tdGoJob}}">Ver execução</button></sc-if>
        <div class="grow"></div>
        <button type="button" class="btn ghost" style="color: var(--danger)" sc-camel-on-click="{{tdDelete}}">Excluir task</button>
      </div>`;
if (templateHtml.includes(origTaskDrawerActions)) {
  templateHtml = templateHtml.replace(origTaskDrawerActions, newTaskDrawerActions);
  console.log('Botões Editar task e Excluir task adicionados ao Drawer Detalhe da Task!');
}

const origTaskSpec = `      task: { title: 'Nova task', lead: 'Entra na coluna A planejar. A Paula sugere o plano.', primary: 'Criar task', fields: [
        { k: 'title', type: 'text', label: 'Título', ph: 'O que precisa acontecer', req: 'Dê um título à task.' },
        { k: 'desc', type: 'area', label: 'Contexto', ph: 'Critério de pronto, links, restrições', rows: 3 },
        { k: 'prio', type: 'segs', label: 'Prioridade', opts: ['Normal', 'Alta', 'Crítica'] },
        { k: 'sector', type: 'segs', label: 'Setor', opts: ['Estratégia', 'Engenharia', 'Comercial', 'Conteúdo'] }] },`;

const newTaskAndEditDeleteSpec = `      task: { title: 'Nova task', eyebrow: 'Kanban · SQLite', lead: 'Entra na coluna A planejar. A Paula sugere o plano.', primary: 'Criar task', fields: [
        { k: 'title', type: 'text', label: 'Título', ph: 'O que precisa acontecer', req: 'Dê um título à task.' },
        { k: 'desc', type: 'area', label: 'Contexto', ph: 'Critério de pronto, links, restrições', rows: 3 },
        { k: 'prio', type: 'segs', label: 'Prioridade', opts: ['Normal', 'Alta', 'Crítica'] },
        { k: 'sector', type: 'segs', label: 'Setor', opts: ['Estratégia', 'Engenharia', 'Comercial', 'Conteúdo', 'Operação'] },
        { k: 'who', type: 'text', label: 'Responsável (opcional)', val: 'Paula PM', ph: 'Ex.: Paula PM, Ari Arquiteto, Vitor Construtor' }] },
      'task-edit': { title: 'Editar task #' + ((d && d.seq) || ''), eyebrow: 'Kanban · Edição de Tarefa', lead: 'Altere o título, contexto, prioridade, setor, responsável ou coluna da tarefa.', size: 'lg', primary: 'Salvar alterações', fields: [
        { k: 'title', type: 'text', label: 'Título da task', val: (d && d.title) || '', ph: 'O que precisa acontecer', req: 'Dê um título à task.' },
        { k: 'desc', type: 'area', label: 'Contexto / Descrição', val: (d && d.desc) || '', ph: 'Critério de pronto, links, restrições', rows: 3 },
        { k: 'prio', type: 'segs', label: 'Prioridade', val: (d && d.prio) || 'Normal', opts: ['Normal', 'Alta', 'Crítica'] },
        { k: 'sector', type: 'segs', label: 'Setor', val: (d && d.sector) || 'Estratégia', opts: ['Estratégia', 'Engenharia', 'Comercial', 'Conteúdo', 'Operação'] },
        { k: 'who', type: 'text', label: 'Agente / Responsável', val: (d && d.who) || 'Paula PM', ph: 'Ex.: Paula PM, Ari Arquiteto, Vitor Construtor' },
        { k: 'col', type: 'segs', label: 'Coluna no Kanban', val: (d && d.colLabel) || 'A planejar', opts: ['A planejar', 'Planejado', 'Em execução', 'Concluído'] }] },
      'task-delete': { title: 'Excluir task #' + ((d && d.seq) || ''), eyebrow: 'Kanban · Exclusão de Tarefa', lead: 'Tem certeza que deseja excluir esta tarefa?', primary: 'Excluir definitivamente', primaryCls: 'danger', fields: [
        { k: 'n', type: 'note', tone: 'warn', text: 'A task #' + ((d && d.seq) || '') + ' ("' + ((d && d.title) || '') + '") será removida permanentemente do quadro Kanban e do banco SQLite.' }] },`;

if (templateHtml.includes(origTaskSpec)) {
  templateHtml = templateHtml.replace(origTaskSpec, newTaskAndEditDeleteSpec);
  console.log("Specs 'task', 'task-edit' e 'task-delete' configuradas!");
}

const origSubmitTask = `    if (id === 'task') {
      const t = { id: 't' + Date.now(), seq: 40 + s.tasks.length, title: v('title', ''), status: 'to_plan', who: 'Paula PM', ini: 'PP', prio: v('prio', 'Normal'), sector: v('sector', 'Estratégia'), planning: true };
      this.setState({ tasks: [t].concat(s.tasks), modal: null, screen: 'tasks' });
      this.log('Carlos', 'criou a task #' + t.seq + ' · ' + t.title);
      this.say('Task criada', '#' + t.seq + ' entrou em A planejar.');
      return;
    }`;

const newSubmitTask = `    if (id === 'task') {
      const self = this;
      const whoVal = String(v('who', 'Paula PM') || 'Paula PM').trim() || 'Paula PM';
      const iniVal = whoVal.split(/\\s+/).map(function(w) { return w[0] || ''; }).join('').slice(0, 2).toUpperCase() || 'PP';
      const maxSeq = (s.tasks || []).reduce(function(m, x) { return Math.max(m, Number(x.seq) || 0); }, 0);
      const t = {
        id: 't-' + Date.now(),
        seq: maxSeq + 1,
        title: v('title', ''),
        desc: v('desc', ''),
        status: 'to_plan',
        who: whoVal,
        ini: iniVal,
        prio: v('prio', 'Normal'),
        sector: v('sector', 'Estratégia'),
        planning: true
      };
      const tavir = (typeof window !== 'undefined' && window.tavir) || null;
      if (tavir && tavir.tasks && tavir.tasks.create) {
        tavir.tasks.create(t).then(function(created) {
          if (created && created.id) {
            self.setState(function(st) {
              return { tasks: (st.tasks || []).map(function(x) { return x.id === t.id ? Object.assign({}, t, created) : x; }) };
            });
          }
        }).catch(function() {});
      }
      this.setState({ tasks: [t].concat(s.tasks), modal: null, screen: 'tasks' });
      this.log('Carlos', 'criou a task #' + t.seq + ' · ' + t.title);
      this.say('Task criada', '#' + t.seq + ' entrou em A planejar.');
      return;
    }
    if (id === 'task-edit') {
      const d = s.mdata || {};
      const colMap = { 'A planejar': 'to_plan', 'Planejado': 'planned', 'Em execução': 'in_progress', 'Concluído': 'done' };
      const colChoice = v('col', d.colLabel || 'A planejar');
      const nextStatus = colMap[colChoice] || d.status || 'to_plan';
      const nextTitle = String(v('title', d.title || '')).trim() || d.title || 'Sem título';
      const nextDesc = String(v('desc', d.desc || ''));
      const nextPrio = v('prio', d.prio || 'Normal');
      const nextSector = v('sector', d.sector || 'Estratégia');
      const nextWho = String(v('who', d.who || 'Paula PM')).trim() || 'Paula PM';
      const nextIni = nextWho.split(/\\s+/).map(function(w) { return w[0] || ''; }).join('').slice(0, 2).toUpperCase() || 'PP';
      const patch = {
        title: nextTitle,
        desc: nextDesc,
        prio: nextPrio,
        sector: nextSector,
        who: nextWho,
        ini: nextIni,
        status: nextStatus,
        planning: nextStatus === 'to_plan'
      };
      const updatedTasks = (s.tasks || []).map(function(t) {
        return t.id === d.id ? Object.assign({}, t, patch) : t;
      });
      const tavir = (typeof window !== 'undefined' && window.tavir) || null;
      if (tavir && tavir.tasks && tavir.tasks.update) {
        tavir.tasks.update(d.id, patch).catch(function() {});
      }
      this.setState({ tasks: updatedTasks, modal: null, mdata: null });
      this.log('Carlos', 'editou a task #' + (d.seq || '') + ' · ' + nextTitle);
      this.say('Task atualizada', 'As alterações em #' + (d.seq || '') + ' foram salvas no SQLite.');
      return;
    }
    if (id === 'task-delete') {
      const d = s.mdata || {};
      const updatedTasks = (s.tasks || []).filter(function(t) { return t.id !== d.id; });
      const tavir = (typeof window !== 'undefined' && window.tavir) || null;
      if (tavir && tavir.tasks && tavir.tasks.delete) {
        tavir.tasks.delete(d.id).catch(function() {});
      }
      this.setState({ tasks: updatedTasks, modal: null, mdata: null });
      this.log('Carlos', 'excluiu a task #' + (d.seq || '') + ' · ' + (d.title || ''), 'oklch(.635 .185 27)');
      this.say('Task excluída', 'A task #' + (d.seq || '') + ' foi removida do quadro e do banco.');
      return;
    }`;

if (templateHtml.includes(origSubmitTask)) {
  templateHtml = templateHtml.replace(origSubmitTask, newSubmitTask);
  console.log('submitForm atualizado para criar, editar e excluir tasks no SQLite!');
}

const origTaskCardReturn = "return { seq: t.seq, title: t.title, who: t.who, ini: t.ini, sector: t.sector, prio: t.prio, prioCls: prioCls[t.prio] || '', gate: !!t.gate, gateCls: t.gate ? 'gate' : '', planning: !!t.planning, hasJob: !!j && t.status === 'in_progress', jobPct: j ? j.progress : 0, fillCls: j ? (STATUS[j.status] || STATUS.completed)[3] : '', open: () => self.open('taskdetail', { id: t.id }) };";
const newTaskCardReturn = `return {
            seq: t.seq,
            title: t.title,
            desc: t.desc || '',
            hasDesc: !!(t.desc && String(t.desc).trim()),
            who: t.who,
            ini: t.ini,
            sector: t.sector,
            prio: t.prio,
            prioCls: prioCls[t.prio] || '',
            gate: !!t.gate,
            gateCls: t.gate ? 'gate' : '',
            planning: !!t.planning,
            hasJob: !!j && t.status === 'in_progress',
            jobPct: j ? j.progress : 0,
            fillCls: j ? (STATUS[j.status] || STATUS.completed)[3] : '',
            open: () => self.open('taskdetail', { id: t.id }),
            edit: (e) => {
              if (e && e.stopPropagation) e.stopPropagation();
              self.open('task-edit', { id: t.id, seq: t.seq, title: t.title, desc: t.desc || '', prio: t.prio || 'Normal', sector: t.sector || 'Estratégia', who: t.who || 'Paula PM', status: t.status, colLabel: c[1] });
            },
            del: (e) => {
              if (e && e.stopPropagation) e.stopPropagation();
              self.open('task-delete', { id: t.id, seq: t.seq, title: t.title });
            }
          };`;
if (templateHtml.includes(origTaskCardReturn)) {
  templateHtml = templateHtml.replace(origTaskCardReturn, newTaskCardReturn);
  console.log('Callbacks t.edit e t.del conectados aos cards do Kanban!');
}

const origTdBlock = `    const td = {
      seq: tdT.seq, title: tdT.title, who: tdT.who, sector: tdT.sector, prio: tdT.prio, prioCls: prioCls[tdT.prio] || '', gate: !!tdT.gate, hasJob: !!tdT.job,
      moveHint: tdT.gate ? 'Com gate aberto, o card não sai de Em execução.' : 'Planejado → Em execução inicia o job ligado.',
      moves: COLS.map((c) => ({ label: c[1], on: tdT.status === c[0] ? 'on' : '', pick: () => {
        if (tdT.gate && c[0] !== 'in_progress') { self.say('Gate aberto', 'Decida em Decisões antes de mover o card.'); return; }
        self.setState({ tasks: s.tasks.map((t) => t.id === tdT.id ? Object.assign({}, t, { status: c[0], planning: c[0] === 'to_plan' ? t.planning : false }) : t) });
        self.log('Carlos', 'moveu #' + tdT.seq + ' para ' + c[1]);
        if (c[0] === 'in_progress' && tdT.job) { self.setState((st) => ({ jobs: st.jobs.map((j) => j.id === tdT.job && j.status !== 'running' ? Object.assign({}, j, { status: 'running', progress: Math.max(3, j.progress) }) : j) })); self.say('Job iniciado', tdT.job + ' começou a rodar.'); }
      } })),
      hist: [{ t: '09:10', text: 'Card criado por Paula PM' }, { t: '10:42', text: 'Plano aprovado · 5 passos' }, { t: '12:31', text: tdT.gate ? 'Gate aberto · aguardando decisão' : 'Job em execução' }]
    };`;

const newTdBlock = `    const tdColObj = COLS.find((c) => c[0] === tdT.status) || COLS[0];
    const td = {
      seq: tdT.seq, title: tdT.title, desc: tdT.desc || '', hasDesc: !!(tdT.desc && String(tdT.desc).trim()), who: tdT.who, sector: tdT.sector, prio: tdT.prio, prioCls: prioCls[tdT.prio] || '', gate: !!tdT.gate, hasJob: !!tdT.job,
      moveHint: tdT.gate ? 'Com gate aberto, o card não sai de Em execução.' : 'Planejado → Em execução inicia o job ligado.',
      moves: COLS.map((c) => ({ label: c[1], on: tdT.status === c[0] ? 'on' : '', pick: () => {
        if (tdT.gate && c[0] !== 'in_progress') { self.say('Gate aberto', 'Decida em Decisões antes de mover o card.'); return; }
        self.setState({ tasks: s.tasks.map((t) => t.id === tdT.id ? Object.assign({}, t, { status: c[0], planning: c[0] === 'to_plan' ? t.planning : false }) : t) });
        if (typeof window !== 'undefined' && window.tavir && window.tavir.tasks && window.tavir.tasks.updateStatus) {
          window.tavir.tasks.updateStatus(tdT.id, c[0]).catch(function() {});
        }
        self.log('Carlos', 'moveu #' + tdT.seq + ' para ' + c[1]);
        if (c[0] === 'in_progress' && tdT.job) { self.setState((st) => ({ jobs: st.jobs.map((j) => j.id === tdT.job && j.status !== 'running' ? Object.assign({}, j, { status: 'running', progress: Math.max(3, j.progress) }) : j) })); self.say('Job iniciado', tdT.job + ' começou a rodar.'); }
      } })),
      hist: [{ t: '09:10', text: 'Card criado por ' + (tdT.who || 'Paula PM') }, { t: '10:42', text: 'Coluna atual: ' + tdColObj[1] }, { t: '12:31', text: tdT.gate ? 'Gate aberto · aguardando decisão' : 'Registrado no banco SQLite' }]
    };`;

if (templateHtml.includes(origTdBlock)) {
  templateHtml = templateHtml.replace(origTdBlock, newTdBlock);
  console.log('Bloco td (Detalhe da Task) atualizado com sincronização SQLite!');
}

templateHtml = templateHtml.replace(
  "openPlan: () => self.open('plan', s.mdata), tdGoJob: () => self.go('exec', { jobId: tdT.job, jobFilter: 'all' }),",
  `openPlan: () => self.open('plan', s.mdata), tdGoJob: () => self.go('exec', { jobId: tdT.job, jobFilter: 'all' }),
      tdEdit: () => self.open('task-edit', { id: tdT.id, seq: tdT.seq, title: tdT.title, desc: tdT.desc || '', prio: tdT.prio || 'Normal', sector: tdT.sector || 'Estratégia', who: tdT.who || 'Paula PM', status: tdT.status, colLabel: tdColObj[1] }),
      tdDelete: () => self.open('task-delete', { id: tdT.id, seq: tdT.seq, title: tdT.title }),`
);

const origProjectSpec = `      project: { title: 'Novo projeto', lead: 'Nome, trilho e onde o workspace mora.', primary: 'Criar projeto', done: ['Projeto criado', 'Paula abre o primeiro planejamento.'], fields: [
        { k: 'name', type: 'text', label: 'Nome do projeto', ph: 'Ex.: Landing Atlas', req: 'Dê um nome ao projeto.' },
        { k: 'track', type: 'choice', label: 'Trilho', opts: [['Landing', 'Prova visual, construção, QA, SEO e handoff', 'até 16 etapas'], ['Oferta', 'Evidência de público, viabilidade e claims', '6–8 etapas'], ['Sistema', 'Especificação, construção e manutenção', '12–15 etapas']] },
        { k: 'path', type: 'text', label: 'Pasta do workspace', val: '~/tavir/workspaces/', help: 'Fica nesta máquina. O escritório só lê e escreve aqui dentro.' }] },`;
const newProjectSpec = `      project: { title: 'Novo projeto', lead: 'Nome, trilho e onde o workspace mora.', primary: 'Criar projeto', done: ['Projeto criado', 'Paula abre o primeiro planejamento.'], fields: [
        { k: 'name', type: 'text', label: 'Nome do projeto', ph: 'Ex.: Landing Atlas', req: 'Dê um nome ao projeto.' },
        { k: 'track', type: 'choice', label: 'Trilho', opts: [['Landing', 'Prova visual, construção, QA, SEO e handoff', 'até 16 etapas'], ['Oferta', 'Evidência de público, viabilidade e claims', '6–8 etapas'], ['Sistema', 'Especificação, construção e manutenção', '12–15 etapas']] },
        { k: 'path', type: 'text', label: 'Pasta do workspace', val: '~/tavir/workspaces/', pickFolder: true, pickLabel: 'Selecionar pasta no disco...', help: 'Fica nesta máquina. O escritório só lê e escreve aqui dentro.' }] },`;
if (templateHtml.includes(origProjectSpec)) {
  templateHtml = templateHtml.replace(origProjectSpec, newProjectSpec);
}

const origFactoryNewFull = `'factory-new': { title: 'Nova esteira', eyebrow: 'Fábrica', lead: 'Landing, oferta ou sistema. Criação ou manutenção.', primary: 'Abrir console', go: 'fabrica', done: ['Esteira criada', 'Etapa 1 · Entender já está com Paula.'], fields: [
        { k: 'name', type: 'text', label: 'Nome do projeto', ph: 'Ex.: Landing Atlas', req: 'Dê um nome à esteira.' },
        { k: 'tpl', type: 'choice', label: 'Template', opts: [['Landing Pages', 'Prova visual, comercial, construção, QA, SEO e handoff', 'até 16'], ['Ofertas', 'Evidência de público, viabilidade e claims', '6–8'], ['Sistemas', 'Do zero, com especificação, ou manutenção', '12–15']] },
        { k: 'mode', type: 'segs', label: 'Modo', opts: ['Criação', 'Manutenção'] }] },`;

const newFactoryNewAndAbsorbFull = `'factory-new': { title: 'Nova esteira · Isolamento Estrito', eyebrow: 'Fábrica · Product Lab', lead: 'Crie do zero ou absorva uma pasta existente (Git/Local) com credenciais, Git e deploy isolados.', size: 'lg', primary: 'Criar esteira', go: 'fabrica', done: ['Esteira criada com isolamento ativo', 'Workspace, estrutura de pastas, .env.project e Git local configurados.'], fields: [
        { k: 'name', type: 'text', label: 'Nome do projeto', val: (d && d.name) || '', ph: 'Ex.: Sistema ERP ou App Tavir', req: 'Dê um nome à esteira.' },
        { k: 'tpl', type: 'choice', label: 'Template da Esteira', val: (d && d.tpl) || 'Landing Pages', opts: [['Landing Pages', 'Prova visual, comercial, construção, QA, SEO e handoff', 'até 16'], ['Ofertas', 'Evidência de público, viabilidade e claims', '6–8'], ['Sistemas', 'Do zero, com especificação, ou manutenção / absorção (Product Lab)', '12–15']] },
        { k: 'mode', type: 'segs', label: 'Modo de Operação', val: (d && d.mode) || 'Criação', opts: ['Criação', 'Manutenção', 'Absorver Projeto (Product Lab)'] },
        { k: 'local_path', type: 'text', label: 'Pasta do Projeto Existente (Manutenção / Product Lab)', val: (d && d.path) || '', pickFolder: true, pickLabel: 'Selecionar pasta no disco...', ph: 'Clique em "Selecionar pasta no disco..." ao lado ou cole o caminho (ex.: C:/Projetos/meu-app)', help: 'Em Criação, uma nova estrutura de pastas isolada é criada automaticamente. Em Manutenção / Product Lab, o agente lê a pasta selecionada.' },
        { k: 'absorb_agent', type: 'choice', label: 'Agente Leitor / Absorvedor (Product Lab)', val: 'Squad Product Lab (Ari + Enzo + Dora)', opts: [['Squad Product Lab (Ari + Enzo + Dora)', 'Recomendado: Ari lê arquitetura/stacks/banco, Enzo extrai UI/telas e Dora + Sérgio mapeiam contrato, logins e .env', 'completo'], ['Ari Arquiteto', 'Líder Técnico de Sistemas: lê estrutura de pastas, backend, banco de dados, rotas, APIs e plano de refatoração', 'arquitetura'], ['Enzo Extrator', 'Especialista Visual & Frontend: extrai componentes, design tokens, CSS/Tailwind e fluxos de tela', 'interface'], ['Dora Descoberta + Sérgio Seg', 'Intake & Cofre: consolida contrato de negócio, audita variáveis .env, chaves de API e isola credenciais', 'contrato & seg']] },
        { k: 'company', type: 'text', label: 'Cliente / Empresa', val: (d && d.company) || 'TAVIR', ph: 'Ex.: TAVIR ou Nome do Cliente' },
        { k: 'ownership', type: 'segs', label: 'Escopo do Workspace', opts: ['Interno', 'Externo'] },
        { k: 'git_profile', type: 'segs', label: 'Identidade Git Isolada (commits e PRs apenas deste projeto)', opts: ['TAVIR (Empresa)', 'Pessoal (Carlos)'] },
        { k: 'repo_url', type: 'text', label: 'Repositório Git do Projeto (opcional)', ph: 'Ex.: https://github.com/tavir/meu-projeto.git', help: 'Gravado exclusivamente no .git/config local desta pasta. Nunca altera seu Git global.' },
        { k: 'deploy_target', type: 'segs', label: 'Deploy & Credenciais Isoladas (.env.project)', opts: ['Isolado local (.env.project)', 'Vercel (Conta isolada)', 'Netlify (Conta isolada)'] }] },
      'factory-absorb': { title: 'Absorver Projeto Existente · Product Lab', eyebrow: 'Fábrica · Sistemas & Manutenção', lead: 'Selecione a pasta do projeto (mesmo clonada do Git). O Squad lê toda a estrutura, stacks, arquitetura, logins, APIs e cria o cofre isolado.', size: 'lg', primary: 'Absorver e Diagnosticar', go: 'fabrica', done: ['Projeto absorvido no Product Lab', 'Diagnóstico, arquitetura, contrato e isolamento Git/.env gerados na pasta.'], fields: [
        { k: 'local_path', type: 'text', label: 'Pasta do Projeto na Máquina', val: (d && d.path) || '', pickFolder: true, pickLabel: 'Selecionar pasta no disco...', ph: 'Clique em "Selecionar pasta no disco..." ao lado ou cole o caminho da pasta', req: 'Selecione ou informe a pasta do projeto a absorver.', help: 'Todo o acesso de leitura, escrita, .env e Git ficará estritamente confinado a esta pasta.' },
        { k: 'name', type: 'text', label: 'Nome do Projeto', val: (d && d.name) || '', ph: 'Preenchido automaticamente ao escolher a pasta (ou digite aqui)' },
        { k: 'tpl', type: 'choice', label: 'Esteira de Destino', val: (d && d.tpl) || 'Sistemas', opts: [['Sistemas', 'Manutenção, evolução, refatoração e novas features em sistemas completos', '12 etapas'], ['Landing Pages', 'Manutenção e otimização de páginas e funis existentes', '8 etapas'], ['Ofertas', 'Revisão e manutenção de ofertas e páginas comerciais', '8 etapas']] },
        { k: 'absorb_agent', type: 'choice', label: 'Quem fará a leitura completa do projeto?', val: 'Squad Product Lab (Ari + Enzo + Dora)', opts: [['Squad Product Lab (Ari + Enzo + Dora)', 'Recomendado (Padrão Concierge Product Lab): Ari (Arquitetura/Stacks/APIs) + Enzo (Telas/UI) + Dora/Sérgio (Contrato e Cofre .env)', 'squad completo'], ['Ari Arquiteto', 'Foco em Sistemas, Backend, Rotas, Banco de Dados e Dívida Técnica', 'sistemas'], ['Enzo Extrator', 'Foco em Frontend, Design System, Componentes e Responsividade', 'frontend'], ['Dora Descoberta + Sérgio Seg', 'Foco em Regras de Negócio, Mapeamento de Logins/Senhas, .env e Segurança', 'segurança']] },
        { k: 'company', type: 'text', label: 'Cliente / Empresa', val: (d && d.company) || 'TAVIR', ph: 'Ex.: TAVIR' },
        { k: 'ownership', type: 'segs', label: 'Escopo do Workspace', opts: ['Interno', 'Externo'] },
        { k: 'git_profile', type: 'segs', label: 'Usuário Git para Commits e PRs deste Projeto', opts: ['TAVIR (Empresa)', 'Pessoal (Carlos)'] },
        { k: 'repo_url', type: 'text', label: 'URL do Repositório Git do Projeto (opcional)', ph: 'Ex.: https://github.com/sua-conta/repositorio.git' },
        { k: 'deploy_target', type: 'segs', label: 'Isolamento de Deploy (Vercel / Netlify / Local)', opts: ['Isolado local (.env.project)', 'Vercel (Conta isolada)', 'Netlify (Conta isolada)'] }] },
      'factory-delete': { title: 'Remover projeto · ' + ((d && d.name) || 'Projeto'), eyebrow: 'Fábrica · Exclusão de Projeto & Arquivos Locais', lead: 'Escolha se deseja excluir também a pasta e os arquivos locais do disco ou manter a pasta no computador.', size: 'lg', primary: 'Confirmar remoção', primaryCls: 'danger', go: 'fabrica', fields: [
        { k: 'n_path', type: 'note', tone: 'warn', text: 'Pasta do projeto no disco: ' + ((d && d.path) || ('tavir-interno/' + ((d && d.slug) || 'projeto'))) },
        { k: 'delete_mode', type: 'choice', label: 'Você quer excluir os arquivos locais ou manter a pasta no disco?', val: 'Manter a pasta e os arquivos locais no disco (remover apenas da esteira)', opts: [
          ['Manter a pasta e os arquivos locais no disco (remover apenas da esteira)', 'Remove o projeto da Fábrica e do banco SQLite, mas preserva a pasta e todos os arquivos intactos no computador.', 'manter pasta'],
          ['Excluir TUDO permanentemente (apagar pasta e arquivos locais do disco)', 'Remove o projeto da Fábrica E exclui definitivamente a pasta e todos os arquivos locais do disco.', 'excluir arquivos']
        ] }] },`;

if (templateHtml.includes(origFactoryNewFull)) {
  templateHtml = templateHtml.replace(origFactoryNewFull, newFactoryNewAndAbsorbFull);
  console.log("Specs 'factory-new', 'factory-absorb' e 'factory-delete' injetadas!");
}

const origControlAndMotor = `      control: { title: 'Controle do projeto', eyebrow: (d && d.name) || 'Meridian', lead: 'Automação, SLA e o que fica manual.', size: 'lg', primary: 'Salvar', done: ['Projeto salvo', 'As regras valem a partir do próximo card.'], fields: [
        { k: 't1', type: 'toggle', label: 'Entender sozinho', sub: 'A demanda sai do rascunho sem clique.', def: false },
        { k: 't2', type: 'toggle', label: 'Entregar sozinho', sub: 'Desligado, o pacote espera em Decisões.', def: false },
        { k: 't3', type: 'toggle', label: 'Demandas novas entram manuais', sub: 'Toda demanda passa por você primeiro.', def: true },
        { k: 'sla', type: 'segs', label: 'SLA de resposta do gate', opts: ['4 h', '24 h', '72 h'] }] },
      motor: { title: 'Motor ' + ((d && d.name) || ''), eyebrow: 'Integrações', lead: 'A chave fica só nesta máquina. Login abre o fluxo do próprio motor.', primary: 'Salvar motor', secondary: 'Entrar com login', done: ['Motor salvo', 'Disponível para novos jobs.'], fields: [{ k: 'key', type: 'text', itype: 'password', label: 'Chave de API', ph: 'Cole a chave', help: 'Guardada no cofre local. Nunca vai para o livro-razão.' }, { k: 'def', type: 'toggle', label: 'Tornar padrão do chat', sub: 'Novas conversas usam este motor.', def: false }] },`;

const newControlAndMotor = `      control: { title: 'Controle & Isolamento do Projeto', eyebrow: (d && d.name) || 'Projeto', lead: 'Isolamento estrito de pasta, identidade Git (Empresa vs Pessoal), credenciais (.env.project), deploy e automação.', size: 'lg', primary: 'Salvar isolamento e controle', done: ['Isolamento e controle salvos', 'Gravado exclusivamente em .tavir/isolation.json e .git/config local do projeto.'], fields: [
        { k: 'n_iso', type: 'note', text: 'Garantia de Isolamento: Credenciais (.env.project), usuário Git e tokens de deploy (Vercel/Netlify) ficam confinados à pasta deste projeto e nunca vazam para outros módulos ou projetos.' },
        { k: 'git_profile', type: 'segs', label: 'Identidade Git Local (commits, branches e PRs deste projeto)', opts: ['TAVIR (Empresa)', 'Pessoal (Carlos)'] },
        { k: 'deploy_target', type: 'segs', label: 'Alvo de Deploy & Ambiente Isolado', opts: ['Isolado local (.env.project)', 'Vercel (Token isolado)', 'Netlify (Token isolado)'] },
        { k: 't1', type: 'toggle', label: 'Entender sozinho (Intake automático)', sub: 'A demanda sai do rascunho sem clique manual.', def: false },
        { k: 't2', type: 'toggle', label: 'Entregar sozinho', sub: 'Desligado, o pacote espera sua assinatura em Decisões.', def: false },
        { k: 't3', type: 'toggle', label: 'Demandas novas entram manuais', sub: 'Toda demanda passa por você primeiro.', def: true },
        { k: 'sla', type: 'segs', label: 'SLA de resposta do gate', opts: ['4 h', '24 h', '72 h'] }] },
      'module-control': { title: 'Opções do Módulo · ' + ((d && d.name) || 'Módulo'), eyebrow: 'Sistema · Módulos sob controle', lead: 'Configure como este módulo opera, qual motor de IA prioriza e suas regras de isolamento por projeto.', size: 'lg', primary: 'Salvar opções do módulo', done: ['Módulo atualizado', 'Opções aplicadas ao módulo ' + ((d && d.name) || '') + '.'], fields: [
        { k: 'mod_engine', type: 'segs', label: 'Motor de IA padrão do módulo', opts: ['Padrão do Sistema', 'Cursor (SDK)', 'Claude (SDK)', 'Antigravity (SDK)', 'Codex (SDK)'] },
        { k: 'mod_isolation', type: 'toggle', label: 'Isolamento estrito por pasta de projeto (Estilo Concierge)', sub: 'Cada projeto do módulo possui seu próprio .env.project, .git/config e cofre de credenciais isolado.', def: true },
        { k: 'mod_git', type: 'segs', label: 'Identidade Git padrão para novos projetos do módulo', opts: ['TAVIR (Empresa)', 'Pessoal (Carlos)', 'Perguntar ao criar'] },
        { k: 'mod_gate', type: 'toggle', label: 'Exigir aprovação humana nos Gates do módulo', sub: 'Mantém o Completion Guard ativo antes de qualquer publicação ou deploy.', def: true },
        { k: 'mod_sla', type: 'segs', label: 'SLA padrão dos gates deste módulo', opts: ['4 h', '24 h', '72 h'] }] },
      motor: { title: 'Motor ' + ((d && d.name) || '') + ' · Login & Cofre', eyebrow: 'Motores de IA · Integrações', lead: 'Preferência: login do CLI na máquina. Alternativa: cole a chave de API — fica cifrada só neste computador.', size: 'lg', primary: 'Salvar no cofre', secondary: 'Entrar com login', done: ['Motor pronto', 'Login/chave disponíveis para a Íris e os jobs.'], fields: [
        { k: 'mode', type: 'segs', label: 'Modo de Conexão Principal', opts: ['SDK / Login Local na Máquina (Recomendado)', 'Chave de API Manual (Cofre)'] },
        { k: 'sdk_path', type: 'text', label: 'Apontamento da Instalação / SDK na Máquina', val: (d && d.name === 'Antigravity') ? '~/.gemini/antigravity' : (d && d.name === 'Claude') ? '~/.claude' : (d && d.name === 'Codex') ? '~/.codex' : '~/.cursor', help: 'Detectado automaticamente. O botão Entrar com login abre o fluxo oficial do motor.' },
        { k: 'key', type: 'text', itype: 'password', label: 'Chave de API (opcional se já fez login)', ph: 'Cole a chave para guardar no cofre', help: 'Guardada cifrada no cofre local. Nunca vai para o livro-razão, o chat ou o pacote de entrega.' },
        { k: 'base_url', type: 'text', label: 'Endereço da API (só Antigravity)', val: '', ph: 'https://api.exemplo.com/v1', help: 'Obrigatório apenas se for plugar Antigravity por chave.' },
        { k: 'def', type: 'toggle', label: 'Tornar motor padrão do escritório', sub: 'Atende o chat e os jobs quando nenhum motor específico é escolhido.', def: false }] },`;

if (templateHtml.includes(origControlAndMotor)) {
  templateHtml = templateHtml.replace(origControlAndMotor, newControlAndMotor);
  console.log("Specs 'control', 'module-control' e 'motor' atualizadas!");
}

// 2.14b Mapear hasPick / onPick em fm.fields e adicionar método pickFolderForField
const origFmFieldsMap = "onInput: (e) => setv(e.target.value),";
const newFmFieldsMap = "onInput: (e) => setv(e.target.value),\n            hasPick: !!f.pickFolder, pickLabel: f.pickLabel || 'Selecionar pasta no disco...', onPick: () => self.pickFolderForField(f.k),";
if (templateHtml.includes(origFmFieldsMap)) {
  templateHtml = templateHtml.replace(origFmFieldsMap, newFmFieldsMap);
  console.log('hasPick e onPick adicionados a fm.fields!');
}

const origCloseMethod = "close() { this.setState({ modal: null, mdata: null }); }";
const newCloseAndPickMethod = `close() { this.setState({ modal: null, mdata: null }); }
  pickFolderForField(fieldKey) {
    const self = this;
    const s = this.state;
    const tavir = (typeof window !== 'undefined' && window.tavir) || null;
    if (tavir && tavir.projects && tavir.projects.pickFolder) {
      self.say('Selecionar pasta...', 'Escolha a pasta do projeto na janela do Windows.');
      tavir.projects.pickFolder().then(function(res) {
        if (res && !res.canceled && res.path) {
          const folderName = res.path.replace(/[\\\\/]+$/, '').split(/[\\\\/]/).pop() || 'Projeto Absorvido';
          const nextForm = Object.assign({}, self.state.form, { [fieldKey || 'local_path']: res.path, local_path: res.path, path: res.path });
          if (!nextForm.name) nextForm.name = folderName;
          if (s.modal === 'factory-new' && (!nextForm.mode || nextForm.mode === 'Criação')) nextForm.mode = 'Absorver Projeto (Product Lab)';
          self.setState({ form: nextForm, formErr: {} });
          self.say('Pasta selecionada', res.path);
        }
      }).catch(function(err) {
        console.error('[TAVIR pickFolder error]', err);
        self.say('Informar caminho', 'Digite ou cole o caminho completo da pasta no campo correspondente.');
      });
    } else {
      self.say('Informar caminho', 'Digite ou cole o caminho completo da pasta no campo correspondente.');
    }
  }`;
if (templateHtml.includes(origCloseMethod)) {
  templateHtml = templateHtml.replace(origCloseMethod, newCloseAndPickMethod);
  console.log('Método pickFolderForField injetado no Root Component!');
}

// 2.15 Conectar botão secundário do modal (Selecionar pasta no disco... / Revalidar SDK)
const origFmSecondary = "fmSecondary: () => { self.say('Login do motor', 'O fluxo do motor abriria no navegador.'); self.close(); },";
const newFmSecondary = `fmSecondary: () => {
        if (s.modal === 'factory-new' || s.modal === 'factory-absorb' || s.modal === 'project') {
          self.pickFolderForField(s.modal === 'project' ? 'path' : 'local_path');
          return;
        }
        if (s.modal === 'motor') {
          const tavir = (typeof window !== 'undefined' && window.tavir) || null;
          const mName = (s.mdata && s.mdata.name) || 'Cursor';
          const nameToId = { Cursor: 'cursor', Claude: 'claude', Codex: 'codex', Antigravity: 'antigravity' };
          const engineId = nameToId[mName] || String(mName).toLowerCase();
          if (!tavir || !tavir.engines || !tavir.engines.login) {
            self.say('Login do motor', 'IPC de login indisponível. Reinicie o Escritório.');
            return;
          }
          self.say('Abrindo login…', 'Aguarde o fluxo do ' + mName + '.');
          tavir.engines.login(engineId).then(function(res) {
            if (res && res.loggedIn) {
              self.say('Login ok', mName + ' já autenticado nesta máquina.');
            } else if (res && res.url) {
              self.say('Login aberto', 'Confirme no navegador e volte para testar a Íris com ' + mName + '.');
            } else if (res && res.opened) {
              self.say('Login em andamento', (res && res.message) || ('Siga as instruções do ' + mName + '.'));
            } else {
              self.say('Login', (res && res.message) || ('Não consegui abrir o login do ' + mName + '.'));
            }
            if (tavir.engines.detect) {
              tavir.engines.detect().then(function(list) {
                if (Array.isArray(list) && list.length) {
                  self.setState({
                    detectedMotors: list.map(function(e) {
                      return [e.name, e.detail || '', !!e.installed];
                    })
                  });
                }
              }).catch(function() {});
            }
          }).catch(function(err) {
            self.say('Login falhou', String(err && err.message || err));
          });
          return;
        }
        self.say('Login do motor', 'Conectado via instalação e SDK local da máquina.');
        self.close();
      },`;
if (templateHtml.includes(origFmSecondary)) {
  templateHtml = templateHtml.replace(origFmSecondary, newFmSecondary);
  console.log('fmSecondary conectado ao login real dos motores e seletor de pastas!');
}

const origSubmitProject = "if (id === 'project') this.log('Carlos', 'criou o projeto ' + v('name', '') + ' · trilho ' + v('track', 'Landing'));";
const newSubmitProjectAndFactory = `if (id === 'factory-delete') {
      const d = s.mdata || {};
      const projId = d.id || d.slug || '';
      const projName = d.name || projId || 'Projeto';
      const projPath = d.path || '';
      const modeChoice = String(v('delete_mode', 'Manter a pasta e os arquivos locais no disco (remover apenas da esteira)'));
      const shouldDeleteFiles = modeChoice.toLowerCase().indexOf('excluir tudo') >= 0 || modeChoice.toLowerCase().indexOf('apagar pasta') >= 0;
      try {
        const curLocal = JSON.parse(localStorage.getItem('tavir_factory_projects') || '[]').filter(function(p) {
          return p.id !== projId && p.slug !== projId && p.name !== projName;
        });
        localStorage.setItem('tavir_factory_projects', JSON.stringify(curLocal));
      } catch (e) {}
      const tavir = (typeof window !== 'undefined' && window.tavir) || null;
      if (tavir && tavir.projects && tavir.projects.delete) {
        tavir.projects.delete(projId, shouldDeleteFiles, projPath).then(function(res) {
          window.dispatchEvent(new CustomEvent('tavir:project-deleted', { detail: { id: projId, name: projName, deletedFiles: shouldDeleteFiles, result: res } }));
        }).catch(function() {
          window.dispatchEvent(new CustomEvent('tavir:project-deleted', { detail: { id: projId, name: projName, deletedFiles: shouldDeleteFiles } }));
        });
      } else {
        window.dispatchEvent(new CustomEvent('tavir:project-deleted', { detail: { id: projId, name: projName, deletedFiles: shouldDeleteFiles } }));
      }
      this.close();
      this.log('Carlos', 'removeu o projeto ' + projName + (shouldDeleteFiles ? ' e excluiu os arquivos locais do disco' : ' (manteve a pasta local no disco)'), 'oklch(.635 .185 27)');
      this.say(
        shouldDeleteFiles ? 'Projeto e arquivos locais excluídos' : 'Projeto removido da esteira',
        shouldDeleteFiles ? ('A pasta e os arquivos locais de ' + projName + ' foram excluídos do disco.') : ('A pasta local de ' + projName + ' foi mantida intacta no disco.')
      );
      return;
    }
    if (id === 'project' || id === 'factory-new' || id === 'factory-absorb') {
      const pLocalPath = String(v('local_path', v('path', '')) || '').trim();
      const folderFallback = pLocalPath ? (pLocalPath.replace(/[\\\\/]+$/, '').split(/[\\\\/]/).pop() || 'Projeto Absorvido') : 'Novo Projeto';
      const pName = String(v('name', '') || '').trim() || folderFallback;
      const pTpl = (id === 'factory-new' || id === 'factory-absorb') ? v('tpl', (s.mdata && s.mdata.tpl) || (id === 'factory-absorb' ? 'Sistemas' : 'Landing Pages')) : v('track', 'Landing');
      const pMode = id === 'factory-absorb' ? 'Absorver Projeto (Product Lab)' : id === 'factory-new' ? v('mode', 'Criação') : 'Criação';
      const pCompany = v('company', 'TAVIR');
      const pOwnership = String(v('ownership', 'Interno')).toLowerCase() === 'externo' ? 'externo' : 'interno';
      const pGitProfile = v('git_profile', 'TAVIR (Empresa)');
      const pRepoUrl = v('repo_url', '');
      const pDeployTarget = v('deploy_target', 'Isolado local (.env.project)');
      const pAbsorbAgent = v('absorb_agent', 'Squad Product Lab (Ari + Enzo + Dora)');
      const cat = String(pTpl).toLowerCase().indexOf('oferta') >= 0 ? 'of' : String(pTpl).toLowerCase().indexOf('sistema') >= 0 ? 'sy' : 'lp';
      const isAbsorb = id === 'factory-absorb' || String(pMode).toLowerCase().indexOf('absorv') >= 0 || (pLocalPath && pLocalPath.indexOf('~') !== 0);
      const isMaint = isAbsorb || String(pMode).toLowerCase().indexOf('manuten') >= 0;
      const tplCode = cat + '-' + (isMaint ? 'm' : 'c');
      const totalStg = tplCode === 'sy-c' ? 15 : tplCode === 'sy-m' ? 12 : isMaint ? 8 : 12;
      const stagesDoneInit = isAbsorb ? 2 : 0;
      const gitLabel = String(pGitProfile).toLowerCase().indexOf('pessoal') >= 0 ? 'Carlos' : 'TAVIR';
      const fallbackProj = {
        id: 'proj-' + Date.now(),
        slug: pName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: pName,
        client: pCompany,
        company: pCompany,
        template_code: tplCode,
        stages_done: stagesDoneInit,
        total_stages: totalStg,
        status: 'running',
        local_path: pLocalPath || null,
        description: 'Escopo: ' + pOwnership + ' · Esteira: ' + tplCode + ' · ' + (isAbsorb ? 'Absorvido (Product Lab)' : isMaint ? 'Manutenção' : 'Criação') + ' · Git: ' + gitLabel
      };
      try {
        const curLocal = JSON.parse(localStorage.getItem('tavir_factory_projects') || '[]');
        curLocal.unshift(fallbackProj);
        localStorage.setItem('tavir_factory_projects', JSON.stringify(curLocal));
      } catch (e) {}
      const tavir = (typeof window !== 'undefined' && window.tavir) || null;
      const rpcMethod = (tavir && tavir.projects) ? (isAbsorb && tavir.projects.absorb ? tavir.projects.absorb : tavir.projects.create) : null;
      if (rpcMethod) {
        rpcMethod({
          name: pName,
          company: pCompany,
          ownership: pOwnership,
          template: pTpl,
          template_category: cat,
          mode: pMode,
          local_path: pLocalPath,
          absorb: isAbsorb,
          absorb_agent: pAbsorbAgent,
          git_profile: pGitProfile,
          repo_url: pRepoUrl,
          deploy_target: pDeployTarget
        }).then(function(created) {
          try {
            const curLocal = JSON.parse(localStorage.getItem('tavir_factory_projects') || '[]').filter(function(x) { return x.id !== fallbackProj.id; });
            curLocal.unshift(created || fallbackProj);
            localStorage.setItem('tavir_factory_projects', JSON.stringify(curLocal));
          } catch (e) {}
          window.dispatchEvent(new CustomEvent('tavir:project-created', { detail: { project: created || fallbackProj, openConsole: isAbsorb } }));
        }).catch(function(err) {
          console.error('[TAVIR IPC] Erro ao criar/absorver projeto:', err);
          window.dispatchEvent(new CustomEvent('tavir:project-created', { detail: { project: fallbackProj, openConsole: isAbsorb } }));
        });
      } else {
        window.dispatchEvent(new CustomEvent('tavir:project-created', { detail: { project: fallbackProj, openConsole: isAbsorb } }));
      }
      const taskOwner = isAbsorb ? pAbsorbAgent.split('(')[0].trim() : 'Paula PM';
      const newTask = { id: 't' + Date.now(), seq: 40 + s.tasks.length, title: (isAbsorb ? '[Product Lab] Absorver ' : '') + pName + ' · ' + pTpl + ' (Git: ' + gitLabel + ')', status: 'to_plan', who: taskOwner, ini: isAbsorb ? 'PL' : 'PP', prio: 'Alta', sector: 'Engenharia', planning: true };
      if (tavir && tavir.tasks && tavir.tasks.create) {
        tavir.tasks.create({ title: newTask.title, prio: 'Alta', sector: 'Engenharia' });
      }
      this.setState({ tasks: [newTask].concat(s.tasks) });
      this.log('Carlos', (isAbsorb ? 'absorveu o projeto ' : 'criou a esteira ') + pName + ' · Git isolado: ' + gitLabel, '#B7F34A');
    }`;
if (templateHtml.includes(origSubmitProject)) {
  templateHtml = templateHtml.replace(origSubmitProject, newSubmitProjectAndFactory);
  console.log("submitForm atualizado para criar/absorver esteira real e excluir projeto com opção de arquivos locais!");
}

const origMotorDone = "if (sp.done) this.say(sp.done[0], sp.done[1]);";
const newMotorDone = `if (id === 'motor') {
      const mName = (s.mdata && s.mdata.name) || 'Cursor';
      const nameToId = { Cursor: 'cursor', Claude: 'claude', Codex: 'codex', Antigravity: 'antigravity' };
      const engineId = nameToId[mName] || String(mName).toLowerCase();
      const apiKey = String(v('key', '') || '').trim();
      const baseUrl = String(v('base_url', '') || '').trim();
      const makeDefault = !!(self.state.form && (self.state.form.def === true || self.state.form.def === 'true'));
      const tavir = (typeof window !== 'undefined' && window.tavir) || null;
      const finishMotor = function(msgTitle, msgBody) {
        if (makeDefault && tavir && tavir.engines && tavir.engines.updateSettings) {
          tavir.engines.updateSettings({ defaultEngine: engineId }).catch(function() {});
        }
        if (sp.done) self.say(msgTitle || sp.done[0], msgBody || sp.done[1]);
        else self.say(msgTitle || 'Motor salvo', msgBody || mName);
        self.close();
      };
      if (apiKey && tavir && tavir.engines && tavir.engines.saveKey) {
        tavir.engines.saveKey({ engineId: engineId, apiKey: apiKey, baseUrl: baseUrl || undefined }).then(function(res) {
          finishMotor(res && res.ok ? 'Cofre atualizado' : 'Cofre', (res && res.message) || ('Chave do ' + mName + ' processada.'));
          if (tavir.engines.detect) {
            tavir.engines.detect().then(function(list) {
              if (Array.isArray(list) && list.length) {
                window.dispatchEvent(new CustomEvent('tavir:motors-updated', { detail: { list: list } }));
              }
            }).catch(function() {});
          }
        }).catch(function(err) {
          self.say('Cofre', String(err && err.message || err));
        });
        return;
      }
      finishMotor('Motor configurado', apiKey ? ('Chave do ' + mName + ' anotada.') : (mName + ' usa o login/SDK local. Use «Entrar com login» se ainda não autenticou.'));
      return;
    }
    if (sp.done) this.say(sp.done[0], sp.done[1]);`;
if (templateHtml.includes(origMotorDone)) {
  templateHtml = templateHtml.replace(origMotorDone, newMotorDone);
  console.log('submitForm do motor conectado ao cofre (engines:saveKey)!');
}

// ==========================================
// 3. RE-MONTAR ARQUIVO HTML FINAL
// ==========================================
const reencodedTemplate = JSON.stringify(templateHtml).replace(/<\/script>/gi, '<\\u002Fscript>');
const reencodedManifest = JSON.stringify(manifest).replace(/<\/script>/gi, '<\\u002Fscript>');

// Substitui template
let finalHtml = html.slice(0, templateMatch.index) +
  '<script type="__bundler/template">\n' + reencodedTemplate + '\n  </script>' +
  html.slice(templateMatch.index + templateMatch[0].length);

// Substitui manifest
const newManifestMatch = manifestRegex.exec(finalHtml);
finalHtml = finalHtml.slice(0, newManifestMatch.index) +
  '<script type="__bundler/manifest">\n' + reencodedManifest + '\n  </script>' +
  finalHtml.slice(newManifestMatch.index + newManifestMatch[0].length);

const outDir = path.resolve(__dirname, '../dist/renderer');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
const outPath = path.join(outDir, 'index.html');
fs.writeFileSync(outPath, finalHtml, 'utf8');

console.log('[TAVIR Build Completo] Sucesso total!');
console.log(' ->', outPath);
console.log(' -> Tamanho:', (finalHtml.length / 1024).toFixed(1), 'KB');
