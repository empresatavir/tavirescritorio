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
  for (const cand of fabRefCandidates) {
    try {
      fabHtml = fs.readFileSync(cand, 'utf8');
      console.log('Fábrica: layout de referência carregado de', cand);
      break;
    } catch {
      /* tenta próximo */
    }
  }
  if (!fabHtml) {
    // O fragmento legado do manifest simulava execução (tokens e custo fixos). Melhor falhar o build.
    throw new Error('Fábrica: src/renderer/fabrica-ref/Fabrica.dc.html não encontrado.');
  }

  {
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
      // Fonte única: o mesmo molde que o main usa para contar etapas e achar gates.
      const esteirasJs = path.resolve(__dirname, '../dist/shared/esteiras.js');
      if (!fs.existsSync(esteirasJs)) throw new Error('Rode npm run build:main antes: falta dist/shared/esteiras.js');
      delete require.cache[esteirasJs];
      const shared = require(esteirasJs).templateStagesForPanel();
      if (fabHtml.includes(tplMark)) {
        fabHtml = fabHtml.replace(
          tplMark,
          tplMark + '\nObject.keys(TPL_STAGES).forEach((k) => { delete TPL_STAGES[k]; }); Object.assign(TPL_STAGES, ' + JSON.stringify(shared) + ');',
        );
        console.log('Fábrica: TPL_STAGES vindo de src/shared/esteiras.ts');
      } else {
        throw new Error('Fábrica: não achei TPL_STAGES no Fabrica.dc.html para injetar os moldes.');
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
          let survey = {};
          try { survey = (JSON.parse(p.files || '{}') || {}).survey || {}; } catch (e) { survey = {}; }
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
            kind: ((typeof ESTEIRAS !== 'undefined' && ESTEIRAS.find(function(e) { return e[0] === code; })) || [0, 0, code])[2],
            client: p.company || p.client || '—',
            guard: st === 'done' || st === 'completed' || done >= total ? 8 : Math.min(7, Math.round((done / total) * 8)),
            base: [2026, 1, 1],
            pauseNote: 'Contexto preservado na pasta isolada.',
            tags: [['code', p.stack || 'Stack local']],
            stages: stages,
            pends: [],
            acts: [['agora', 'Sincronizado do SQLite', 'Sistema']],
            inv: [['O que é', survey.about || p.description || 'Levantamento ainda não rodou'], ['Linguagens', survey.languages || p.stack || '—'], ['Git', survey.git || '—'], ['Deploy', survey.deploy || '—'], ['Arquivos', survey.files != null ? String(survey.files) : '—']],
            env: [],
            target: survey.deploy || 'local · tavir',
            acc: survey.gitRemote ? [['Git', survey.gitRemote, 'remote', 'ok']] : [],
            people: [['CH', 'Carlos Henrique', 'CEO · aprovador', 'admin']],
            slug: relSlug,
            git: survey.gitRemote || survey.git || 'local',
            cost: [0, 25],
            disk: [Number(survey.dirs) || 0, Number(survey.files) || 0, survey.languages || 'pasta isolada'],
            tok0: [0, 0, 0],
            think: survey.about || p.description || (done >= total ? 'Esteira concluída' : 'Em execução'),
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
            const motors = Object.assign({}, self.state.motors || {});
            if (ctrl.engine && ctrl.engine.engine && typeof ENG !== 'undefined' && ENG[ctrl.engine.engine]) {
              const E = ENG[ctrl.engine.engine];
              const M = E.models.find(function(x) { return x[0] === ctrl.engine.model; }) || E.models[0];
              const effLabel = (function() {
                const ids = { low: 'Baixo', medium: 'Médio', high: 'Alto', xhigh: 'Máximo', cost: 'Cost', balanced: 'Balance', intelligence: 'Intelligence' };
                const want = ids[ctrl.engine.effort] || ctrl.engine.effort;
                return M[2].indexOf(want) >= 0 ? want : M[2][0];
              })();
              motors[proj.id] = { engine: ctrl.engine.engine, model: M[0], effort: effLabel };
            }
            self.setState({ absorbed: nextAbs, altOpen: altMap, altTrack: trackMap, motors: motors });
          }).catch(function() {});
          if (tavir.projects.getEsteira) {
            tavir.projects.getEsteira(key).then(function(res) {
              if (!res || !res.esteira) return;
              const map = Object.assign({}, self.state.esteiraById || {});
              map[proj.id] = res.esteira;
              self.setState({ esteiraById: map });
            }).catch(function() {});
          }
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
      const motorRow = (self.state.motors && self.state.motors[ap.id]) || (typeof DEFM !== 'undefined' ? DEFM : {});
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
  }
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

  // Contas e cofre: contas do GitHub (TAVIR e Pessoal) com token cifrado no cofre desta máquina.
  // A tela só recebe login, rótulo e prévia mascarada; o token fica no processo main (src/main/gitAccounts.ts).
  if (!cfgHtml.includes('id="tavir-contas"')) {
    cfgHtml = cfgHtml.replace("['motores', 'Motores de IA', 4], ", "['motores', 'Motores de IA', 4], ['contas', 'Contas e cofre'], ");
    const cardTpl = (list) => `<sc-for list="{{${list}}}" as="c" hint-placeholder-count="2">
            <article class="cfg-card {{c.cls}}">
              <header class="cfg-card-h"><span class="cfg-card-ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="{{c.ico}}"></path></svg></span><b class="grow">{{c.title}}</b><details class="cfg-help"><summary class="cfg-ibtn" title="Como gerar o token" aria-label="Como gerar o token de {{c.title}}"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01"></path></svg></summary><div class="cfg-pop" role="dialog" aria-label="Como gerar o token de {{c.title}}"><b>Como gerar o token</b><ol><sc-for list="{{c.steps}}" as="st" hint-placeholder-count="4"><li>{{st.t}}</li></sc-for></ol><button class="btn sm secondary" onClick="{{c.openToken}}">{{c.openLbl}} ↗</button></div></details><button class="cfg-ibtn" onClick="{{c.openToken}}" title="{{c.openLbl}}" aria-label="{{c.openLbl}}"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"></path></svg></button><span class="cfg-dot {{c.cls}}" role="img" aria-label="{{c.badge}}" title="{{c.badge}}"></span></header>
              <div class="cfg-card-sub">{{c.sub}}</div>
              <sc-if value="{{c.connected}}" hint-placeholder-val="{{false}}">
                <div class="cfg-card-who"><b>{{c.who}}</b><sc-if value="{{c.isDef}}" hint-placeholder-val="{{false}}"><span class="badge action">padrão</span></sc-if><sc-if value="{{c.canDef}}" hint-placeholder-val="{{false}}"><button class="cfg-link" onClick="{{c.setDef}}">tornar padrão</button></sc-if><sc-if value="{{c.noPush}}" hint-placeholder-val="{{false}}"><span class="badge warn">sem escopo repo</span></sc-if></div>
                <dl class="cfg-kv"><sc-for list="{{c.kv}}" as="k" hint-placeholder-count="3"><dt>{{k.k}}</dt><dd class="mono">{{k.v}}</dd></sc-for></dl>
              </sc-if>
              <sc-if value="{{c.showForm}}" hint-placeholder-val="{{true}}">
                <input class="input" type="password" autocomplete="off" spellcheck="false" placeholder="{{c.ph}}" value="{{c.token}}" onChange="{{c.onToken}}" aria-label="Token {{c.title}}">
              </sc-if>
              <sc-if value="{{c.hasMsg}}" hint-placeholder-val="{{false}}"><div class="cfg-card-msg" style="color: {{c.msgColor}}">{{c.msg}}</div></sc-if>
              <footer class="cfg-card-f">
                <sc-if value="{{c.showForm}}" hint-placeholder-val="{{true}}"><div class="grow"></div><sc-if value="{{c.editing}}" hint-placeholder-val="{{false}}"><button class="btn sm ghost" onClick="{{c.cancel}}">Cancelar</button></sc-if><button class="btn sm primary" onClick="{{c.save}}" disabled="{{c.busy}}">{{c.saveLbl}}</button></sc-if>
                <sc-if value="{{c.showActions}}" hint-placeholder-val="{{false}}"><button class="btn sm secondary" onClick="{{c.test}}" disabled="{{c.busy}}">{{c.testLbl}}</button><button class="btn sm secondary" onClick="{{c.edit}}">Trocar token</button><div class="grow"></div><button class="btn sm ghost" onClick="{{c.remove}}">Remover</button></sc-if>
              </footer>
            </article>
          </sc-for>`;
    const contasBlock = `<sc-if value="{{v.contas}}" hint-placeholder-val="{{false}}">
        <div id="tavir-contas" class="cfg-head"><div class="grow"><h2 class="cfg-h">Contas e cofre</h2><p class="cfg-lead">Credenciais do escritório: quem assina os commits, abre PR e faz deploy. Os segredos de cada projeto ficam no cofre do próprio projeto, na aba Acessos da Fábrica.</p></div><span class="badge flow">{{credCount}}</span></div>
        <div class="cfg-sec"><div class="eyebrow">GitHub · quem assina e publica</div><p>Os commits e o PR de um projeto saem com a conta do perfil git dele (TAVIR ou Pessoal). Sem par, vale a padrão.</p></div>
        <div class="cfg-cards two">${cardTpl('ghCards')}</div>
        <div class="cfg-sec"><div class="eyebrow">Deploy e dados</div><p>Ficam guardadas e conferidas, prontas para quando a Fábrica publicar os projetos.</p></div>
        <div class="cfg-cards">${cardTpl('provCards')}</div>
        <div class="card" style="padding: 12px 14px; display: flex; gap: 10px; font-size: 13px; background: var(--surface-0)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--flow)" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3"></path></svg><span class="sec">Cada token é conferido no provedor antes de entrar e fica cifrado (AES-256-GCM) no cofre desta máquina. Só o app usa, por variável de ambiente; nunca vai para tela, log, chat ou linha de comando.</span></div>
      </sc-if>

      `;
    cfgHtml = cfgHtml.replace('<sc-if value="{{v.aparencia}}"', contasBlock + '<sc-if value="{{v.aparencia}}"');
    cfgHtml = cfgHtml.replace(
      '    return {\n      v: v,',
      `    const tvAcc = (typeof window !== 'undefined' && (window.tavir || (window.parent && window.parent.tavir))) || null;
    const accApi = tvAcc && tvAcc.accounts;
    const credApi = tvAcc && tvAcc.creds;
    if (tvAcc && !s.accLoaded && !self._accLoading) {
      self._accLoading = true;
      Promise.all([accApi ? accApi.list() : null, credApi ? credApi.list() : null]).then(function(r) {
        self._accLoading = false;
        self.setState({ accLoaded: true, accList: (r[0] && r[0].accounts) || [], credList: (r[1] && r[1].credentials) || [] });
      }).catch(function() { self._accLoading = false; self.setState({ accLoaded: true }); });
    }
    if (typeof document !== 'undefined' && !window.__cfgHelpOn) {
      window.__cfgHelpOn = true;
      const closeAll = function(except) { document.querySelectorAll('details.cfg-help[open]').forEach(function(d) { if (d !== except) d.removeAttribute('open'); }); };
      document.addEventListener('click', function(e) { const own = e.target && e.target.closest ? e.target.closest('details.cfg-help') : null; closeAll(own); });
      document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeAll(null); });
    }
    const cs = s.cs || {};
    const setCard = function(key, patch) { const m = Object.assign({}, self.state.cs || {}); m[key] = Object.assign({}, m[key] || {}, patch); self.setState({ cs: m }); };
    const done = function(key, res, okMsg, extra) {
      const patch = { busy: false, msg: '', err: false };
      if (res && res.ok === false) { patch.msg = res.error || 'Não deu certo.'; patch.err = true; }
      else { patch.msg = okMsg || ''; patch.token = ''; patch.edit = false; }
      const top = Object.assign({}, extra || {});
      if (res && Array.isArray(res.accounts)) top.accList = res.accounts;
      if (res && Array.isArray(res.credentials)) top.credList = res.credentials;
      const m = Object.assign({}, self.state.cs || {}); m[key] = Object.assign({}, m[key] || {}, patch); top.cs = m;
      self.setState(top);
    };
    const fail = function(key) { return function(e) { setCard(key, { busy: false, msg: String((e && e.message) || e), err: true }); }; };
    const day = function(iso) { const t = String(iso || ''); return t ? t.slice(8, 10) + '/' + t.slice(5, 7) + '/' + t.slice(0, 4) : ''; };
    const baseCard = function(key, connected, extra) {
      const st = cs[key] || {};
      const editing = !!st.edit;
      return Object.assign({
        cls: connected ? 'on' : '',
        connected: connected,
        editing: connected && editing,
        showForm: !connected || editing,
        showActions: connected && !editing,
        token: st.token || '',
        onToken: function(e) { setCard(key, { token: e.target.value }); },
        busy: !!st.busy,
        saveLbl: st.busy ? 'Conferindo…' : connected ? 'Trocar' : 'Conectar',
        testLbl: st.busy ? 'Conferindo…' : 'Testar',
        hasMsg: !!st.msg,
        msg: st.msg || '',
        msgColor: st.err ? 'var(--danger, #e5484d)' : 'var(--text-secondary)',
        edit: function() { setCard(key, { edit: true, msg: '' }); },
        cancel: function() { setCard(key, { edit: false, token: '', msg: '' }); },
        stepsOpen: !connected,
        badge: connected ? 'conectada' : 'sem token',
        badgeCls: connected ? 'flow' : '',
      }, extra);
    };
    const accList = s.accList || [];
    const GH_ICO = 'M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a9 9 0 0 1-9 9';
    const ghSteps = function(quem) {
      return [
        'Entre no GitHub com ' + quem + '. Se outra conta estiver aberta, saia dela ou use uma janela anônima.',
        'Clique em "Abrir GitHub": a página do token já vem com o nome e os escopos repo, workflow e read:org marcados.',
        'Em Expiration, escolha 90 dias e clique em Generate token, no fim da página.',
        'Copie o token (começa com ghp_). O GitHub mostra uma vez só.',
        'Cole no campo abaixo e clique em Conectar. Se a organização usar SSO, autorize o token em Configure SSO.',
      ].map(function(t) { return { t: t }; });
    };
    const ghCards = [['TAVIR', 'TAVIR (empresa)', 'Projetos com perfil git da TAVIR', 'a conta da TAVIR'], ['Pessoal', 'Pessoal', 'Projetos com perfil git pessoal', 'a sua conta pessoal']].map(function(L) {
      const key = 'gh-' + L[0];
      const a = accList.filter(function(x) { return x.label === L[0]; })[0] || null;
      return baseCard(key, !!a, {
        title: L[1], sub: L[2], ico: GH_ICO, ph: 'ghp_… ou github_pat_…', openLbl: 'Abrir GitHub', steps: ghSteps(L[3]),
        who: a ? (a.name && a.name !== a.login ? a.name + ' · @' + a.login : '@' + a.login) : '',
        isDef: !!(a && a.is_default), canDef: !!(a && !a.is_default), noPush: !!(a && !a.canPush),
        kv: a ? [
          { k: 'Assina commits como', v: a.commitEmail ? a.commitName + ' <' + a.commitEmail + '>' : 'reabra esta tela ou clique em Testar para completar' },
          { k: 'Escopos', v: a.scopes && a.scopes.length ? a.scopes.join(', ') : 'token fine-grained' },
          { k: 'Token', v: a.preview + ' · conferido em ' + day(a.updated_at) },
        ] : [],
        openToken: function() { if (accApi) accApi.openTokenPage(); },
        save: function() {
          const token = String((cs[key] || {}).token || '').trim();
          if (!accApi) { setCard(key, { msg: 'Disponível só no app desktop.', err: true }); return; }
          if (!token) { setCard(key, { msg: 'Cole o token do GitHub.', err: true }); return; }
          setCard(key, { busy: true, msg: 'Conferindo o token no GitHub…', err: false });
          accApi.add({ label: L[0], token: token }).then(function(r) { done(key, r, r && r.account ? '@' + r.account.login + ' conectada.' : ''); }).catch(fail(key));
        },
        test: function() { if (!accApi || !a) return; setCard(key, { busy: true, msg: '', err: false }); accApi.test(a.id).then(function(r) { done(key, r, 'Token válido.'); }).catch(fail(key)); },
        setDef: function() { if (!accApi || !a) return; accApi.setDefault(a.id).then(function(r) { done(key, r, '@' + a.login + ' é a conta padrão.'); }); },
        remove: function() { if (!accApi || !a) return; if (typeof window !== 'undefined' && window.confirm && !window.confirm('Remover @' + a.login + ' (' + L[1] + ') do cofre?')) return; accApi.remove(a.id).then(function(r) { done(key, r, 'Conta removida do cofre.'); }); },
      });
    });
    const PROV_ICO = { vercel: 'M12 4l9 16H3z', supabase: 'M13 3L4 14h8l-1 7 9-11h-8z', netlify: 'M12 2l10 10-10 10L2 12z' };
    const PROV_PH = { vercel: 'Token da Vercel', supabase: 'sbp_…', netlify: 'Token pessoal da Netlify' };
    const PROV_STEPS = {
      vercel: [
        'Clique em "Abrir Vercel" e entre na conta.',
        'Em Create Token, dê o nome TAVIR Escritório e escolha o escopo: sua conta ou o time da TAVIR.',
        'Escolha a validade (90 dias, por exemplo) e clique em Create.',
        'Copie o token, cole no campo abaixo e clique em Conectar.',
      ],
      supabase: [
        'Clique em "Abrir Supabase" e entre na conta.',
        'Clique em Generate new token e dê o nome TAVIR Escritório.',
        'Copie o token (começa com sbp_). Ele aparece uma vez só.',
        'Cole no campo abaixo e clique em Conectar.',
      ],
      netlify: [
        'Clique em "Abrir Netlify" e entre na conta.',
        'Em Personal access tokens, clique em New access token e dê o nome TAVIR Escritório.',
        'Escolha a validade e clique em Generate token.',
        'Copie o token, cole no campo abaixo e clique em Conectar.',
      ],
    };
    const credList = s.credList && s.credList.length ? s.credList : [
      { provider: 'vercel', name: 'Vercel', hint: 'Deploy de LPs, ofertas e apps web.', connected: false },
      { provider: 'supabase', name: 'Supabase', hint: 'Banco, autenticação e funções dos projetos.', connected: false },
      { provider: 'netlify', name: 'Netlify', hint: 'Deploy de sites estáticos.', connected: false },
    ];
    const provCards = credList.map(function(c) {
      const key = 'cr-' + c.provider;
      return baseCard(key, !!c.connected, {
        title: c.name, sub: c.hint, ico: PROV_ICO[c.provider] || PROV_ICO.vercel, ph: PROV_PH[c.provider] || 'Token',
        openLbl: 'Abrir ' + c.name, steps: (PROV_STEPS[c.provider] || []).map(function(t) { return { t: t }; }),
        who: c.connected ? (c.account && c.account !== c.login ? c.account + ' · ' + c.login : c.login) : '',
        isDef: false, canDef: false, noPush: false,
        kv: c.connected ? [{ k: 'Conta', v: c.detail || '—' }, { k: 'Token', v: c.preview + ' · conferido em ' + day(c.updated_at) }] : [],
        openToken: function() { if (credApi) credApi.openTokenPage(c.provider); },
        save: function() {
          const token = String((cs[key] || {}).token || '').trim();
          if (!credApi) { setCard(key, { msg: 'Disponível só no app desktop.', err: true }); return; }
          if (!token) { setCard(key, { msg: 'Cole o token.', err: true }); return; }
          setCard(key, { busy: true, msg: 'Conferindo o token na ' + c.name + '…', err: false });
          credApi.save(c.provider, token).then(function(r) { done(key, r, c.name + ' conectada.'); }).catch(fail(key));
        },
        test: function() { if (!credApi) return; setCard(key, { busy: true, msg: '', err: false }); credApi.test(c.provider).then(function(r) { done(key, r, 'Token válido.'); }).catch(fail(key)); },
        setDef: function() {},
        remove: function() { if (!credApi) return; if (typeof window !== 'undefined' && window.confirm && !window.confirm('Remover o token da ' + c.name + ' do cofre?')) return; credApi.remove(c.provider).then(function(r) { done(key, r, 'Token removido do cofre.'); }); },
      });
    });
    const connectedN = ghCards.filter(function(c) { return c.connected; }).length + provCards.filter(function(c) { return c.connected; }).length;
    return {
      ghCards: ghCards,
      provCards: provCards,
      credCount: connectedN + ' de ' + (ghCards.length + provCards.length) + ' conectadas',
      v: v,`
    );
  }

  // Layout: menu agrupado com ícones, cabeçalho único por seção, listas em moldura e textos curtos.
  if (!cfgHtml.includes('class="cfg-wrap"')) {
    const cfgCss = `<style>body{margin:0}
.cfg-wrap{display:grid;grid-template-columns:232px minmax(0,1fr);gap:28px;align-items:start;max-width:1180px}
.cfg-nav{position:sticky;top:16px;display:flex;flex-direction:column;gap:2px;padding:10px;border:1px solid var(--line);border-radius:14px;background:var(--surface-0)}
.cfg-grp{font-family:var(--font-mono,'IBM Plex Mono',monospace);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-secondary);opacity:.8;padding:12px 10px 6px}
.cfg-grp:first-child{padding-top:4px}
.cfg-tab{display:flex;align-items:center;gap:10px;width:100%;min-height:38px;padding:8px 10px;border:0;border-radius:9px;background:transparent;color:var(--text-secondary);font:inherit;font-size:13.5px;text-align:left;cursor:pointer;white-space:nowrap;transition:background .15s,color .15s}
.cfg-tab:hover{background:var(--surface-2,rgba(127,127,127,.08));color:var(--text-primary)}
.cfg-tab.on{background:var(--flow-subtle);color:var(--text-primary);font-weight:600}
.cfg-tab svg{flex:none;opacity:.75}
.cfg-tab.on svg{opacity:1;stroke:var(--flow)}
.cfg-tab .cfg-l{flex:1;overflow:hidden;text-overflow:ellipsis}
.cfg-n{flex:none;min-width:22px;height:20px;padding:0 7px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-family:var(--font-mono,'IBM Plex Mono',monospace);font-size:11px;font-weight:500;background:var(--surface-2,rgba(127,127,127,.12));color:var(--text-secondary)}
.cfg-tab.on .cfg-n{background:var(--flow);color:#0B1220}
.cfg-body{min-width:0;padding:28px 30px 30px;display:flex;flex-direction:column;gap:20px;animation:fade 200ms var(--ease) both}
.cfg-head{display:flex;align-items:flex-start;gap:16px;padding-bottom:18px;border-bottom:1px solid var(--line)}
.cfg-head .badge{margin-top:4px;flex:none}
.cfg-h{font-size:20px;font-weight:600;margin:0;line-height:1.25}
.cfg-lead{font-size:13px;margin:6px 0 0;color:var(--text-secondary);max-width:62ch;line-height:1.5}
.cfg-list{border:1px solid var(--line);border-radius:12px;padding:0 16px;background:var(--surface-0)}
.cfg-list .setrow:last-child{border-bottom:0}
.cfg-body .rows.card{border-radius:12px}
.cfg-body .actions{flex-wrap:wrap;gap:8px}
.cfg-body .g2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
.cfg-sec{display:flex;flex-direction:column;gap:4px;margin-top:4px}
.cfg-sec p{margin:0;font-size:12.5px;color:var(--text-secondary);line-height:1.5}
.cfg-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}
.cfg-cards.two{grid-template-columns:repeat(2,minmax(0,1fr))}
.cfg-card{display:flex;flex-direction:column;gap:12px;padding:16px;border:1px solid var(--line);border-radius:14px;background:var(--surface-0);min-width:0}
.cfg-card.on{border-color:color-mix(in oklab,var(--flow) 45%,var(--line))}
.cfg-card-h{display:flex;align-items:center;gap:10px;min-width:0}
.cfg-card-h b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cfg-card-h b{font-size:14.5px}
.cfg-card-ico{flex:none;width:34px;height:34px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;background:var(--surface-2,rgba(127,127,127,.12));color:var(--text-secondary)}
.cfg-card.on .cfg-card-ico{background:var(--flow-subtle);color:var(--flow)}
.cfg-card-sub{font-size:12.5px;color:var(--text-secondary);margin-top:-4px;line-height:1.45;min-height:2.9em}
.cfg-dot{flex:none;width:9px;height:9px;border-radius:50%;background:var(--line-strong,rgba(127,127,127,.5))}
.cfg-dot.on{background:var(--flow);box-shadow:0 0 0 3px var(--flow-subtle)}
.cfg-card-who{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:13.5px}
.cfg-kv{display:flex;flex-direction:column;gap:2px;margin:0;font-size:12px}
.cfg-kv dt{color:var(--text-secondary);font-size:11px;margin-top:6px}
.cfg-kv dt:first-child{margin-top:0}
.cfg-kv dd{margin:0;overflow-wrap:anywhere;line-height:1.45}
.cfg-card .input{height:38px}
.cfg-card-msg{font-size:12px;line-height:1.4}
.cfg-card-f{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:auto}
.cfg-card{position:relative}
.cfg-card-h{gap:4px}
.cfg-card-h .cfg-card-ico{margin-right:6px}
.cfg-card-h .cfg-dot{margin-left:4px}
.cfg-ibtn{flex:none;width:26px;height:26px;border-radius:8px;border:1px solid transparent;background:transparent;color:var(--text-secondary);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;list-style:none;transition:background .15s,color .15s,border-color .15s}
.cfg-ibtn::-webkit-details-marker{display:none}
.cfg-ibtn:hover,.cfg-help[open] .cfg-ibtn{background:var(--surface-2,rgba(127,127,127,.12));color:var(--text-primary);border-color:var(--line)}
.cfg-ibtn:focus-visible{outline:2px solid var(--flow);outline-offset:2px}
.cfg-help{position:static}
.cfg-pop{position:absolute;z-index:20;left:12px;right:12px;top:58px;padding:14px 16px;border-radius:12px;border:1px solid var(--line-strong,var(--line));background:var(--surface-1,var(--surface-0));box-shadow:0 12px 32px rgba(0,0,0,.28);font-size:12.5px;animation:fade 150ms var(--ease) both}
.cfg-pop::before{content:'';position:absolute;top:-6px;right:60px;width:10px;height:10px;transform:rotate(45deg);background:inherit;border-left:1px solid var(--line-strong,var(--line));border-top:1px solid var(--line-strong,var(--line))}
.cfg-pop b{display:block;font-size:13px;margin-bottom:8px}
.cfg-pop ol{margin:0 0 12px;padding-left:18px;display:flex;flex-direction:column;gap:6px;color:var(--text-secondary);line-height:1.45}
.cfg-link{border:0;background:transparent;padding:0 2px;font:inherit;font-size:12px;color:var(--flow);cursor:pointer;text-decoration:underline;text-underline-offset:2px}
@media (max-width:1100px){.cfg-cards.two{grid-template-columns:1fr}}
@media (max-width:980px){.cfg-wrap{grid-template-columns:1fr}.cfg-nav{position:static;flex-direction:row;flex-wrap:wrap}.cfg-grp{display:none}.cfg-tab{width:auto}}
</style>`;
    cfgHtml = cfgHtml.replace('<style>body{margin:0}</style>', cfgCss);
    cfgHtml = cfgHtml.replace(
      /<p>Perfil, o que a Sala mostra[^<]*<\/p>/,
      '<p>Seu perfil, o que a Sala mostra, módulos, motores de IA, contas do GitHub e a própria máquina.</p>'
    );
    cfgHtml = cfgHtml.replace('<div style="display: flex; gap: 24px; flex-wrap: wrap; align-items: flex-start">', '<div class="cfg-wrap">');
    cfgHtml = cfgHtml.replace(
      /<nav style="flex: 0 1 220px;[\s\S]*?<\/nav>/,
      '<nav class="cfg-nav" aria-label="Seções"><sc-for list="{{tabs}}" as="t" hint-placeholder-count="8"><sc-if value="{{t.hasGrp}}" hint-placeholder-val="{{false}}"><div class="cfg-grp">{{t.grp}}</div></sc-if><button class="cfg-tab {{t.on}}" onClick="{{t.pick}}" aria-current="{{t.cur}}"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="{{t.ico}}"></path></svg><span class="cfg-l">{{t.label}}</span><sc-if value="{{t.hasN}}" hint-placeholder-val="{{false}}"><span class="cfg-n">{{t.n}}</span></sc-if></button></sc-for></nav>'
    );
    cfgHtml = cfgHtml.replace(/<section class="card" style="flex: 999 1 560px;[^"]*">/, '<section class="card cfg-body">');
    // Cabeçalhos de seção num formato só
    cfgHtml = cfgHtml.split('<h2 style="font-size: 20px; font-weight: 600">').join('<h2 class="cfg-h">');
    cfgHtml = cfgHtml.split('<p class="muted" style="font-size: 13px; margin-top: 4px">').join('<p class="cfg-lead">');
    cfgHtml = cfgHtml.replace(/<div><h2 class="cfg-h">([^<]*)<\/h2><p class="cfg-lead">([^<]*)<\/p><\/div>/g, '<div class="cfg-head"><div class="grow"><h2 class="cfg-h">$1</h2><p class="cfg-lead">$2</p></div></div>');
    cfgHtml = cfgHtml.split('<div style="display: flex; align-items: flex-end"><div class="grow"><h2 class="cfg-h">').join('<div class="cfg-head"><div class="grow"><h2 class="cfg-h">');
    cfgHtml = cfgHtml.replace('<div id="tavir-contas" style="display: flex; align-items: flex-end">', '<div id="tavir-contas" class="cfg-head">');
    // Textos mais curtos
    cfgHtml = cfgHtml.replace(/<p class="cfg-lead">Opções pertinentes a cada módulo[^<]*<\/p>/, '<p class="cfg-lead">Automação de gates, SLA, motor padrão e isolamento de cada módulo.</p>');
    cfgHtml = cfgHtml.replace(/<p class="cfg-lead">Detecção automática de SDK[^<]*<\/p>/, '<p class="cfg-lead">Os motores rodam pelo CLI instalado nesta máquina. A chave de API é opcional, só como reserva.</p>');
    cfgHtml = cfgHtml.replace(/Como no Concierge: escolha o modelo e a profundidade padrão\. Na Fábrica só aparecem os motores ligados acima\./, 'Modelo e profundidade do motor padrão no chat, na Fábrica e nos jobs. Só os motores ligados aparecem na Fábrica.');
    // Listas de interruptores na mesma moldura das outras listas
    cfgHtml = cfgHtml.replace('<div><sc-for list="{{blocks}}"', '<div class="cfg-list"><sc-for list="{{blocks}}"');
    cfgHtml = cfgHtml.replace('<div><sc-for list="{{scopes}}"', '<div class="cfg-list"><sc-for list="{{scopes}}"');
    // Ações do Sistema como botões de verdade
    cfgHtml = cfgHtml.replace('<button class="btn ghost" onClick="{{goDoctor}}">', '<button class="btn secondary" onClick="{{goDoctor}}">');
    cfgHtml = cfgHtml.replace('<button class="btn ghost" onClick="{{exportLedger}}">', '<button class="btn secondary" onClick="{{exportLedger}}">');
    // Ordem e grupos do menu: [id, rótulo, contador, grupo, ícone]
    cfgHtml = cfgHtml.replace(
      /const TABS = \[[^\n]*\];/,
      "const TABS = [" +
        "['perfil', 'Perfil', 0, 'Você', 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0'], " +
        "['aparencia', 'Aparência', 0, 'Você', 'M12 3a9 9 0 1 0 0 18zM12 3a9 9 0 0 1 0 18'], " +
        "['visao', 'Sala de Operação', 0, 'Escritório', 'M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z'], " +
        "['projetos', 'Módulos', 5, 'Escritório', 'M12 2l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5'], " +
        "['memorias', 'Memórias', 0, 'Escritório', 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3'], " +
        "['motores', 'Motores de IA', 4, 'IA e acesso', 'M6 6h12v12H6zM9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3'], " +
        "['contas', 'Contas e cofre', 0, 'IA e acesso', 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3'], " +
        "['sistema', 'Sistema', 0, 'Máquina', 'M4 5h16v10H4zM8 19h8M12 15v4']" +
      "];"
    );
    cfgHtml = cfgHtml.replace(
      /tabs: TABS\.map\(\(t\) => \(\{[^\n]*\}\)\),/,
      "tabs: TABS.map((t, i) => { const n = t[0] === 'contas' ? ((s.accList || []).length + (s.credList || []).filter(function (c) { return c.connected; }).length) : (t[2] || 0); return { label: t[1], hasN: !!n, n: n || '', grp: t[3], hasGrp: i === 0 || TABS[i - 1][3] !== t[3], ico: t[4], on: s.tab === t[0] ? 'on' : '', cur: s.tab === t[0] ? 'page' : 'false', pick: () => self.setState({ tab: t[0] }) }; }),"
    );
  }

  // Versão em uso no topo de Sistema: versão, commit, branch e data do build (dist/build-info.json).
  if (!cfgHtml.includes('class="cfg-ver"')) {
    const verCard = `<div class="cfg-ver">
          <div class="cfg-ver-main"><div class="eyebrow">Versão em uso</div><div class="cfg-ver-n">{{ver.version}}</div><div class="cfg-ver-sub">{{ver.sub}}</div></div>
          <dl class="cfg-ver-kv"><sc-for list="{{ver.kv}}" as="k" hint-placeholder-count="4"><div><dt>{{k.k}}</dt><dd class="mono">{{k.v}}</dd></div></sc-for></dl>
          <div class="cfg-ver-act"><sc-if value="{{ver.dirty}}" hint-placeholder-val="{{false}}"><span class="badge warn" title="{{ver.dirtyTip}}">alterações locais</span></sc-if><sc-if value="{{ver.released}}" hint-placeholder-val="{{false}}"><span class="badge flow">versão publicada</span></sc-if><div class="grow"></div><button class="btn sm secondary" onClick="{{ver.copy}}">{{ver.copyLbl}}</button></div>
        </div>
        `;
    cfgHtml = cfgHtml.replace(
      'Portas oficiais, caminhos e serviços do escritório.</p></div></div>\n        ',
      'Versão em uso, portas, caminhos e serviços do escritório.</p></div></div>\n        ' + verCard
    );
    cfgHtml = cfgHtml.replace(
      '    const cs = s.cs || {};',
      `    const tvVer = (typeof window !== 'undefined' && (window.tavir || (window.parent && window.parent.tavir))) || null;
    if (tvVer && tvVer.app && tvVer.app.buildInfo && !s.build && !self._buildLoading) {
      self._buildLoading = true;
      tvVer.app.buildInfo().then(function(b) { self.setState({ build: b || null }); }).catch(function() {});
    }
    const b = s.build || null;
    const when = function(iso) { const t = String(iso || ''); return t ? new Date(t).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'; };
    const verText = b ? ['TAVIR Escritório v' + b.version, 'commit ' + (b.commitFull || b.commit || '—'), 'branch ' + (b.branch || '—'), 'build ' + (b.builtAt || '—'), b.tag ? 'tag ' + b.tag : 'sem tag', b.dirty ? 'alterações locais: ' + b.dirtyFiles.join(', ') : 'sem alterações locais'].join('\\n') : '';
    const ver = b ? {
      version: 'v' + b.version,
      sub: !b.known ? 'Build sem ficha de versão. Rode npm run build para gravar o commit e a data.' : b.tag ? 'Build da versão publicada ' + b.tag + '.' : b.lastTag ? b.commitsSinceTag + ' commit(s) depois de ' + b.lastTag + ', ainda sem versão nova.' : 'Nenhuma versão publicada ainda. A primeira sai com npm run release.',
      kv: [
        { k: 'Commit', v: b.commit ? b.commit + ' · ' + b.commitSubject : '—' },
        { k: 'Branch', v: b.branch || '—' },
        { k: 'Build', v: when(b.builtAt) },
        { k: 'Commit feito em', v: when(b.commitDate) },
      ],
      dirty: !!b.dirty,
      dirtyTip: b.dirty ? 'Build feito com arquivos sem commit: ' + b.dirtyFiles.join(', ') : '',
      released: !!b.tag,
      copyLbl: s.verCopied ? 'Copiado' : 'Copiar dados da versão',
      copy: function() {
        const done = function() { self.setState({ verCopied: true }); setTimeout(function() { self.setState({ verCopied: false }); }, 1800); };
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(verText).then(done).catch(function() {}); return; }
        } catch (e) {}
        try { const ta = document.createElement('textarea'); ta.value = verText; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); done(); } catch (e) {}
      },
    } : { version: '…', sub: 'Lendo a ficha do build…', kv: [], dirty: false, dirtyTip: '', released: false, copyLbl: 'Copiar dados da versão', copy: function() {} };
    const cs = s.cs || {};`
    );
    cfgHtml = cfgHtml.replace('      ghCards: ghCards,', '      ver: ver,\n      ghCards: ghCards,');
    cfgHtml = cfgHtml.replace(
      '.cfg-sec{',
      `.cfg-ver{display:grid;grid-template-columns:minmax(180px,auto) 1fr;gap:16px 24px;padding:18px 20px;border:1px solid color-mix(in oklab,var(--flow) 40%,var(--line));border-radius:14px;background:var(--surface-0)}
.cfg-ver-n{font-family:var(--font-mono,'IBM Plex Mono',monospace);font-size:28px;font-weight:600;letter-spacing:-.01em;margin-top:6px;color:var(--text-primary)}
.cfg-ver-sub{font-size:12.5px;color:var(--text-secondary);margin-top:6px;max-width:34ch;line-height:1.45}
.cfg-ver-kv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 18px;margin:0;align-content:start}
.cfg-ver-kv dt{font-size:11px;color:var(--text-secondary)}
.cfg-ver-kv dd{margin:3px 0 0;font-size:12.5px;overflow-wrap:anywhere;line-height:1.45}
.cfg-ver-act{grid-column:1/-1;display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding-top:12px;border-top:1px solid var(--line)}
.cfg-sec{`
    );
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
templateHtml = templateHtml.replace(
  '.log{font-family:var(--font-mono);font-size:12px;line-height:1.7;padding:14px 18px;display:flex;flex-direction:column;gap:2px;max-height:300px;overflow:auto}',
  '.log{font-family:var(--font-mono);font-size:12px;line-height:1.7;padding:14px 18px;display:flex;flex-direction:column;gap:8px;max-height:560px;overflow:auto}'
);
templateHtml = templateHtml.replace(
  '.log div{animation:fade 300ms var(--ease) both;display:flex;gap:12px}',
  '.log div{animation:fade 300ms var(--ease) both;display:flex;gap:12px;align-items:flex-start}.log div > span:last-child{white-space:pre-wrap;overflow-wrap:anywhere;min-width:0;flex:1}'
);

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
          const text = String(evt.content || '');
          const bucket = (logs[evt.runId] || []).slice();
          const prev = bucket[bucket.length - 1];
          const entry = { ts: ts, lvl: bad ? 'erro' : 'info', cls: bad ? 'err' : 'info', text: text };
          if (prev && text && String(prev.text || '').length && text.startsWith(String(prev.text).slice(0, Math.min(String(prev.text).length, 120))) && text.length >= String(prev.text).length) bucket[bucket.length - 1] = entry;
          else bucket.push(entry);
          logs[evt.runId] = bucket;
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

// Rodapé: a linha "office.py · SQLite" era do backend antigo. Passa a mostrar a versão do build
// (dist/build-info.json via tavir.app.buildInfo); o título traz commit, branch e data.
const oldHealth = '<div class="health" style="margin-top: 4px"><i class="live-dot"></i>office.py · SQLite</div>';
if (templateHtml.includes(oldHealth)) {
  templateHtml = templateHtml.replace(
    oldHealth,
    '<div class="health" data-tv-build="" style="margin-top: 4px" title="Versão do Escritório"><i class="live-dot"></i><span data-tv-build-label="">TAVIR Escritório</span></div>'
  );
  const buildScript = `<script>
(function () {
  var info = null, queued = false;
  function apply() {
    queued = false;
    if (!info) return;
    var tip = 'TAVIR Escritório v' + info.version + (info.commit ? ' · commit ' + info.commit : '') + (info.branch ? ' · ' + info.branch : '') +
      (info.builtAt ? ' · build ' + new Date(info.builtAt).toLocaleString('pt-BR') : '') + (info.dirty ? ' · com alterações locais' : '') + ' · detalhes em Configurações › Sistema';
    document.querySelectorAll('[data-tv-build-label]').forEach(function (el) { if (el.textContent !== info.label) el.textContent = info.label; });
    document.querySelectorAll('[data-tv-build]').forEach(function (el) { if (el.title !== tip) el.title = tip; });
  }
  function schedule() { if (!queued) { queued = true; requestAnimationFrame(apply); } }
  function load(tries) {
    var tv = window.tavir;
    if (!tv || !tv.app || !tv.app.buildInfo) { if (tries < 40) setTimeout(function () { load(tries + 1); }, 250); return; }
    tv.app.buildInfo().then(function (i) {
      info = i; schedule();
      new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    }).catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { load(0); }); else load(0);
})();
</script>`;
  templateHtml = templateHtml.replace(/<\/body>(?![\s\S]*<\/body>)/, buildScript + '\n</body>');
  console.log('Rodapé com a versão do build!');
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
