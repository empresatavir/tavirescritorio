const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const refPath = 'C:/Users/carlo/Downloads/Referencias/novo/TAVIR-Escritorio-redesenho.html';
let html = fs.readFileSync(refPath, 'utf8');

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

// 1.2 Limpar 6dd69d42 (Fábrica: Esteiras)
const fabUuid = '6dd69d42-d13a-4290-9e3c-b0c4bc77a500';
if (manifest[fabUuid] && manifest[fabUuid].compressed) {
  const buf = Buffer.from(manifest[fabUuid].data, 'base64');
  let fabHtml = zlib.gunzipSync(buf).toString('utf8');

  const origFabLinesIdx = fabHtml.indexOf('lines: [');
  if (origFabLinesIdx !== -1) {
    const origFabLinesEnd = fabHtml.indexOf('].map((l)', origFabLinesIdx);
    fabHtml = fabHtml.slice(0, origFabLinesIdx) + 'lines: [].map((l)' + fabHtml.slice(origFabLinesEnd + 9);
    console.log('Linhas da Fábrica limpas!');
  }

  fabHtml = fabHtml.replace("gateN: s.signed ? 0 : 1,", "gateN: 0,");
  fabHtml = fabHtml.replace("gateNote: s.signed ? 'nenhum gate aberto' : 'Meridian · QA',", "gateNote: 'nenhum gate aberto',");

  manifest[fabUuid].data = zlib.gzipSync(Buffer.from(fabHtml, 'utf8')).toString('base64');
  console.log('Fábrica limpa e atualizada!');
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

// 2.9 Fallbacks anti-crash para jcur, dcur e tdT
const origJcur = "const jcur = s.jobs.find((j) => j.id === s.jobId) || jlist[0] || s.jobs[0];";
const safeJcur = "const jcur = s.jobs.find((j) => j.id === s.jobId) || jlist[0] || s.jobs[0] || { id: '', title: 'Nenhum job ativo', who: '—', ini: '—', status: 'completed', progress: 0, model: '—', motor: '—', effort: '—', task: '—', cost: 0, ceiling: 0, started: '—', tokens: '0' };";
templateHtml = templateHtml.replace(origJcur, safeJcur);

const origDcur = "const dcur = dlist.find((a) => a.id === s.approvalId) || dlist[0] || null;";
const safeDcur = "const dcur = dlist.find((a) => a.id === s.approvalId) || dlist[0] || { id: '', group: 'none', kind: 'none', title: 'Nenhuma decisão pendente', who: '—', ini: '—', type: '—', status: 'approved', impact: 'baixo', task: '—', age: '—', reason: 'Tudo liberado. Nenhum bloqueio humano na sala.', question: 'Sem aprovações pendentes.', yes: [], no: [] };";
templateHtml = templateHtml.replace(origDcur, safeDcur);

const origTdT = "const tdT = s.modal === 'taskdetail' ? (s.tasks.find((t) => t.id === (s.mdata && s.mdata.id)) || s.tasks[0]) : s.tasks[0];";
const safeTdT = "const tdT = (s.modal === 'taskdetail' ? (s.tasks.find((t) => t.id === (s.mdata && s.mdata.id)) || s.tasks[0]) : s.tasks[0]) || { seq: 0, title: 'Nenhuma tarefa', who: '—', sector: '—', prio: 'Normal', gate: false, job: null, status: 'to_plan' };";
templateHtml = templateHtml.replace(origTdT, safeTdT);
console.log('Fallbacks de segurança aplicados!');

// 2.10 Injeta sincronização IPC reativa no componentDidMount
const oldMount = 'componentDidMount() { this.timer = setInterval(() => this.tick(), 1800); }';
const newMount = `componentDidMount() {
    this.timer = setInterval(() => this.tick(), 1800);
    const self = this;
    if (typeof window !== 'undefined' && window.tavir) {
      console.log('[TAVIR IPC] Conectando ao backend Electron & SQLite...');
      Promise.all([
        window.tavir.jobs.list(),
        window.tavir.tasks.list(),
        window.tavir.approvals.list()
      ]).then(function(res) {
        const u = {};
        if (Array.isArray(res[0])) u.jobs = res[0];
        if (Array.isArray(res[1])) u.tasks = res[1];
        if (Array.isArray(res[2])) u.approvals = res[2];
        console.log('[TAVIR IPC] Dados reais aplicados:', {
          jobs: u.jobs ? u.jobs.length : 0,
          tasks: u.tasks ? u.tasks.length : 0,
          approvals: u.approvals ? u.approvals.length : 0
        });
        self.setState(u);
      }).catch(function(err) {
        console.error('[TAVIR IPC] Erro ao sincronizar:', err);
      });
      window.tavir.onEvent(function(evt) {
        if (evt.type === 'tool_start' || evt.type === 'status') {
          const list = (self.state.jobs || []).slice();
          const j = list.find(function(x) { return x.id === evt.runId; });
          if (j) {
            j.progress = Math.min(95, j.progress + 15);
            self.setState({ jobs: list });
          }
        }
      });
    }
  }`;

if (templateHtml.includes(oldMount)) {
  templateHtml = templateHtml.replace(oldMount, newMount);
  console.log('componentDidMount atualizado com IPC reativo!');
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
