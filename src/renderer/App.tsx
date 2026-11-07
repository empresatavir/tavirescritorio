import React, { useState, useEffect, useMemo } from 'react';
import { TvIcon } from './components/TvIcon';
import type { DomainId, JobItem, TaskItem, ApprovalItem, SessionState, EngineSettings, RunEvent, FactoryProjectItem, CreateFactoryProjectParams } from '../shared/types';
import { ENGINE_CATALOG, callCaption, fitCall, motorById, type MotorId } from '../shared/engineCatalog';

// Views Especializadas
import { FabricaView } from './views/FabricaView';
import { StudioView } from './views/StudioView';
import { RaioXView } from './views/RaioXView';
import { ModulosView } from './views/ModulosView';
import { ComercialView } from './views/ComercialView';
import { SocialView } from './views/SocialView';
import { ConhecimentoView } from './views/ConhecimentoView';
import { EstrategiaView } from './views/EstrategiaView';
import { SistemaView } from './views/SistemaView';
import { ChatView } from './views/ChatView';
import { Modals } from './views/Modals';

const DOMAINS = [
  { id: 'op', label: 'Operação', icon: 'gauge', items: [['room', 'Sala de Operação', 'gauge'], ['exec', 'Execuções', 'zap', 'jobs'], ['tasks', 'Tasks', 'kanban', 'tasks'], ['decisions', 'Decisões', 'shield', 'aps'], ['agents', 'Agentes', 'bot'], ['chat', 'Chat', 'msg']] },
  { id: 'mod', label: 'Módulos', icon: 'layers', items: [['modhub', 'Visão dos módulos', 'layers'], ['raiox', 'Raio-X', 'search'], ['studio', 'Studio', 'spark'], ['fabrica', 'Fábrica', 'factory', 'gate'], ['flow', 'Flow', 'flow', 'beta'], ['edicao', 'Edição', 'film', 'beta']] },
  { id: 'com', label: 'Comercial', icon: 'case', items: [['funil', 'Funil', 'filter'], ['propostas', 'Propostas', 'file', 'prop'], ['financas', 'Finanças', 'wallet'], ['personas', 'Personas', 'user']] },
  { id: 'soc', label: 'Social', icon: 'share', items: [['social', 'Perfis e calendário', 'share'], ['comms', 'Comunicações', 'inbox', 'comms']] },
  { id: 'kn', label: 'Conhecimento', icon: 'brain', items: [['cerebro', 'Cérebro', 'brain'], ['memoria', 'Memória e biblioteca', 'db'], ['ideias', 'Ideias', 'bulb']] },
  { id: 'est', label: 'Estratégia', icon: 'map', items: [['mission', 'Mission Control', 'target'], ['roadmap', 'Roadmap', 'mile'], ['mapa', 'Mapa operacional', 'map']] },
  { id: 'sys', label: 'Sistema', icon: 'pulse', items: [['analytics', 'Analytics', 'chart'], ['doctor', 'Doctor', 'pulse', 'doctor'], ['skills', 'Skills', 'spark'], ['org', 'Org Chart', 'net'], ['config', 'Configurações', 'sliders']] }
];

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [screen, setScreen] = useState<string>('room');
  const [session, setSession] = useState<SessionState>({
    authenticated: true,
    operatorName: 'Carlos',
    expiresAt: null,
    onboardingCompleted: true,
    theme: 'dark',
  });

  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [projects, setProjects] = useState<FactoryProjectItem[]>([]);
  const [engineSettings, setEngineSettings] = useState<EngineSettings>({
    anthropicEnabled: true,
    claudeEnabled: true,
    cursorEnabled: true,
    antigravityEnabled: true,
    codexEnabled: true,
    defaultEngine: 'cursor',
    defaultModel: 'auto-smart',
    defaultEffort: 'balanced',
  });
  const [engineCatalog, setEngineCatalog] = useState(ENGINE_CATALOG);
  const activeMotor = useMemo(
    () => motorById(engineSettings.defaultEngine),
    [engineSettings.defaultEngine],
  );
  const activeModel = useMemo(
    () => fitCall(engineSettings.defaultEngine, engineSettings.defaultModel, engineSettings.defaultEffort),
    [engineSettings.defaultEngine, engineSettings.defaultModel, engineSettings.defaultEffort],
  );
  const engineCaption = useMemo(
    () => callCaption(engineSettings.defaultEngine, engineSettings.defaultModel, engineSettings.defaultEffort),
    [engineSettings.defaultEngine, engineSettings.defaultModel, engineSettings.defaultEffort],
  );
  const enabledCount = useMemo(() => {
    let n = 0;
    if (engineSettings.cursorEnabled !== false) n += 1;
    if (engineSettings.claudeEnabled !== false && engineSettings.anthropicEnabled !== false) n += 1;
    if (engineSettings.codexEnabled !== false) n += 1;
    if (engineSettings.antigravityEnabled !== false) n += 1;
    return n || 1;
  }, [engineSettings]);

  const patchEngines = async (patch: Partial<EngineSettings>) => {
    if (!window.tavir?.engines?.updateSettings) {
      setEngineSettings((prev) => ({ ...prev, ...patch }));
      return;
    }
    const saved = await window.tavir.engines.updateSettings(patch);
    setEngineSettings(saved);
    if (window.tavir.engines.getCatalog) {
      const cat = await window.tavir.engines.getCatalog();
      if (cat?.engines?.length) {
        setEngineCatalog(
          cat.engines.map((e) => ({
            ...(motorById(e.id) as any),
            id: e.id as MotorId,
            label: e.label,
            sdk: e.sdk,
            models: e.models?.length ? e.models : motorById(e.id).models,
          })),
        );
      }
    }
  };

  const [activeJobId, setActiveJobId] = useState<string>('job-014');
  const [jobFilter, setJobFilter] = useState<string>('all');
  const [activeApprovalId, setActiveApprovalId] = useState<string>('ap-02');
  const [approvalChoice, setApprovalChoice] = useState<'approved' | 'rejected' | null>(null);
  const [modal, setModal] = useState<string | null>(null);
  const [modalData, setModalData] = useState<any>(null);
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null);

  // Carrega estado inicial e escuta IPC
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);

    if (window.tavir) {
      window.tavir.session.getState().then((s) => {
        if (s) {
          setSession(s);
          setTheme(s.theme || 'dark');
        }
      });
      window.tavir.jobs.list().then(setJobs);
      window.tavir.tasks.list().then(setTasks);
      window.tavir.approvals.list().then(setApprovals);
      if (window.tavir.projects) {
        window.tavir.projects.list().then(setProjects);
      }
      window.tavir.engines.getSettings().then(setEngineSettings);
      if (window.tavir.engines.getCatalog) {
        window.tavir.engines.getCatalog().then((cat) => {
          if (cat?.settings) setEngineSettings(cat.settings);
          if (cat?.engines?.length) {
            setEngineCatalog(
              cat.engines.map((e) => ({
                ...(motorById(e.id) as any),
                id: e.id as MotorId,
                label: e.label,
                sdk: e.sdk,
                models: e.models?.length ? e.models : motorById(e.id).models,
              })),
            );
          }
        });
      }

      const unbind = window.tavir.onEvent((evt: RunEvent) => {
        console.log('[TAVIR Live Event]', evt);
        if (evt.type === 'artifact' || evt.type === 'done') {
          window.tavir.jobs.list().then(setJobs);
        }
      });
      return unbind;
    }
  }, []);

  // Atalho global Ctrl+K para Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setModal((prev) => (prev === 'palette' ? null : 'palette'));
      }
      if (e.key === 'Escape') {
        setModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    if (window.tavir) window.tavir.session.setTheme(next);
  };

  const showToast = (title: string, message: string) => {
    setToast({ title, message });
    setTimeout(() => setToast(null), 3200);
  };

  // Metadados do domínio atual
  let currentDomain = DOMAINS[0];
  let currentItem = DOMAINS[0].items[0];
  for (const d of DOMAINS) {
    const it = d.items.find((x) => x[0] === screen);
    if (it) {
      currentDomain = d;
      currentItem = it;
      break;
    }
  }

  const pendingApprovals = approvals.filter((a) => a.status === 'pending');
  const runningJobs = jobs.filter((j) => j.status === 'running');
  const activeTasks = tasks.filter((t) => t.status !== 'done');

  const handleStartJob = async (title: string, motor: string, model: string, ceiling: number) => {
    if (window.tavir) {
      const nj = await window.tavir.jobs.start({ title, engine: motor.toLowerCase() as any, model, ceiling });
      setJobs((prev) => [nj, ...prev]);
      showToast('Job iniciado', `${nj.id} começou a rodar com o motor ${nj.motor}.`);
      setModal(null);
      setScreen('exec');
    }
  };

  const handleCreateTask = async (title: string, prio: string, sector: string) => {
    if (window.tavir) {
      const nt = await window.tavir.tasks.create({ title, prio, sector });
      setTasks((prev) => [nt, ...prev]);
      showToast('Task criada', `#${nt.seq} entrou na coluna A Planejar.`);
      setModal(null);
      setScreen('tasks');
    }
  };

  const handleCreateProject = async (params: CreateFactoryProjectParams) => {
    if (window.tavir && window.tavir.projects) {
      const created = await window.tavir.projects.create(params);
      setProjects((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
      const cat = params.template_category || params.template || 'lp';
      const nt = await window.tavir.tasks.create({
        title: `Esteira (${cat === 'sy' ? 'Sistemas' : cat === 'of' ? 'Ofertas' : 'Landing Pages'}): ${created.name}`,
        prio: 'alta',
        sector: 'Fábrica',
        project_id: created.id,
      } as any);
      setTasks((prev) => [nt, ...prev]);
      showToast('Esteira criada', `${created.name} iniciada no Gate 0.`);
      setModal(null);
      setScreen('fabrica');
    }
  };

  const handleApproval = async (id: string, decision: 'approved' | 'rejected') => {
    if (window.tavir) {
      await window.tavir.approvals.decide(id, decision);
      setApprovals((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: decision, decidedAt: 'agora' } : a))
      );
      showToast(
        decision === 'approved' ? 'Decisão aprovada' : 'Decisão recusada',
        `Carimbo auditável gravado no SQLite.`
      );
      setApprovalChoice(decision);
    }
  };

  const openModalWithName = (name: string, data?: any) => {
    setModalData(data || null);
    setModal(name);
  };

  const fabricaMode = screen === 'fabrica';

  return (
    <div className="tv" data-theme={theme} style={{ height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div className={`shell${fabricaMode ? ' shell--fabrica' : ''}`}>
        {/* COLUNA 1: RAIL (64px) */}
        <aside className="rail">
          <button className="rail-mark" onClick={() => setScreen('room')}>
            <TvIcon name="layers" size={26} className="text-[#B7F34A]" />
          </button>

          {DOMAINS.map((d) => {
            const isOn = d.id === currentDomain.id;
            const hasDot = d.id === 'op' && pendingApprovals.length > 0;
            return (
              <button
                key={d.id}
                className={`rail-btn ${isOn ? 'on' : ''}`}
                onClick={() => setScreen(d.items[0][0])}
                title={d.label}
              >
                <TvIcon name={d.icon} size={20} />
                {hasDot && <span className="dotc" />}
                <span className="rail-tip">{d.label}</span>
              </button>
            );
          })}

          <div className="rail-sep" />

          {/* Toggle de Tema Claro/Escuro */}
          <button className="rail-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}>
            <TvIcon name={theme === 'dark' ? 'sun' : 'moon'} size={20} />
            <span className="rail-tip">{theme === 'dark' ? 'Tema claro' : 'Tema escuro'}</span>
          </button>

          {/* Avatar do Operador */}
          <div className="avatar" style={{ marginTop: 'auto' }}>
            {session.operatorName.slice(0, 2).toUpperCase()}
          </div>
        </aside>

        {/* COLUNA 2: SUBNAV (236px) — omitida na Fábrica */}
        {!fabricaMode && (
          <nav className="sub">
          <div className="sub-brand">
            <span className="font-semibold text-[15px] tracking-tight">TAVIR</span>
            <small>Escritório</small>
          </div>

          <div className="sub-label">{currentDomain.label}</div>

          <div className="sub-nav">
            {currentDomain.items.map((it) => {
              const isOn = it[0] === screen;
              let badgeCount = '';
              if (it[3] === 'jobs') badgeCount = String(runningJobs.length);
              if (it[3] === 'tasks') badgeCount = String(activeTasks.length);
              if (it[3] === 'aps' && pendingApprovals.length) badgeCount = String(pendingApprovals.length);

              return (
                <button
                  key={it[0]}
                  className={`nav-item ${isOn ? 'on' : ''}`}
                  onClick={() => setScreen(it[0])}
                >
                  <TvIcon name={it[2]} size={18} />
                  <span>{it[1]}</span>
                  {badgeCount && <b className={it[3] === 'aps' ? 'hot' : ''}>{badgeCount}</b>}
                  {it[3] === 'beta' && <em>BETA</em>}
                </button>
              );
            })}
          </div>

          <div className="sub-foot">
            <div className="health">
              <span className="live-dot" />
              <span>Offline-First (Loopback)</span>
            </div>
            <button className="tour-cta" onClick={() => setScreen('config')}>
              <TvIcon name="sliders" size={16} />
              <div>
                <strong>Motores: {engineCaption}</strong>
                <small>{enabledCount} motor{enabledCount === 1 ? '' : 'es'} ativo{enabledCount === 1 ? '' : 's'}</small>
              </div>
            </button>
          </div>
        </nav>
        )}

        {/* COLUNA 3: MAIN (HEADER + CONTENT) */}
        <main className="main">
          {!fabricaMode && (
            <header className="top">
              <div className="crumbs">
                <span className="dim">{currentDomain.label}</span>
                <span className="sep">/</span>
                <strong>{currentItem[1]}</strong>
              </div>

              <div className="grow" />

              <button className="search" onClick={() => setModal('palette')}>
                <TvIcon name="search" size={16} />
                <span>Buscar ou navegar...</span>
                <span className="kbd">Ctrl K</span>
              </button>

              <button className="btn primary sm" onClick={() => setModal('wizard-job')}>
                <TvIcon name="plus" size={16} />
                <span>Iniciar job</span>
              </button>
            </header>
          )}

          {/* Área de Conteúdo */}
          <div className={`content${fabricaMode ? ' content--fabrica' : ''}`}>
            {/* 1. OPERAÇÃO: SALA DE OPERAÇÃO */}
            {screen === 'room' && (
              <div className="page screen">
                <div className="phead">
                  <div>
                    <h1>Sala de Operação</h1>
                    <p>Visão geral executiva com telemetria, jobs ativos e gates humanos soberanos.</p>
                  </div>
                </div>

                <div className="g4">
                  <div className="card pad click" onClick={() => setScreen('exec')}>
                    <div className="eyebrow">Jobs rodando</div>
                    <div className="text-[28px] font-semibold text-[#1BC5BD] my-1">{runningJobs.length}</div>
                    <div className="muted text-[12px]">Execuções autônomas ativas</div>
                  </div>
                  <div className="card pad click" onClick={() => setScreen('tasks')}>
                    <div className="eyebrow">Cards ativos</div>
                    <div className="text-[28px] font-semibold text-[#F4F6F2] my-1">{activeTasks.length}</div>
                    <div className="muted text-[12px]">Tarefas no pipeline</div>
                  </div>
                  <div className="card pad click" onClick={() => setScreen('decisions')}>
                    <div className="eyebrow">Decisões pendentes</div>
                    <div className="text-[28px] font-semibold text-[#B7F34A] my-1">{pendingApprovals.length}</div>
                    <div className="muted text-[12px]">Aprovações em aberto</div>
                  </div>
                  <div className="card pad click" onClick={() => setScreen('analytics')}>
                    <div className="eyebrow">Custo hoje</div>
                    <div className="text-[28px] font-semibold text-[#F4F6F2] my-1">US$ 8,40</div>
                    <div className="muted text-[12px]">Teto diário: US$ 12,00</div>
                  </div>
                </div>

                {/* Bloco 'O que pede você agora' */}
                <div className="card pad">
                  <div className="sec-title mb-4">
                    <TvIcon name="shield" size={18} />
                    <h2>O que pede você agora</h2>
                  </div>
                  {pendingApprovals.length === 0 ? (
                    <div className="muted text-[13px]">Nenhuma decisão humana bloqueando a operação no momento.</div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {pendingApprovals.map((ap) => (
                        <div key={ap.id} className="card pad flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="badge flow">{ap.impact.toUpperCase()}</span>
                              <strong className="text-[15px]">{ap.title}</strong>
                            </div>
                            <div className="muted text-[13px]">{ap.reason}</div>
                          </div>
                          <button className="btn primary sm" onClick={() => { setActiveApprovalId(ap.id); setScreen('decisions'); }}>
                            Ver e decidir
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. OPERAÇÃO: EXECUÇÕES (JOBS) */}
            {screen === 'exec' && (
              <div className="page screen split">
                <div className="split-side p-4">
                  <div className="sec-title mb-4">
                    <h2>Execuções ({jobs.length})</h2>
                  </div>
                  <div className="flex flex-col gap-2 overflow-auto">
                    {jobs.map((j) => (
                      <div
                        key={j.id}
                        className={`card pad click ${j.id === activeJobId ? 'border-[#1BC5BD]' : ''}`}
                        onClick={() => setActiveJobId(j.id)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="badge flow">{j.motor}</span>
                          <span className="num text-[12px] muted">{j.progress}%</span>
                        </div>
                        <strong className="text-[14px] block mb-1">{j.title}</strong>
                        <div className="muted text-[12px]">{j.who} · {j.started}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="split-main p-6">
                  {jobs.find((x) => x.id === activeJobId) ? (
                    (() => {
                      const j = jobs.find((x) => x.id === activeJobId)!;
                      return (
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="eyebrow">{j.id} · {j.motor}</span>
                              <h1 className="text-[24px] font-semibold">{j.title}</h1>
                            </div>
                            <span className="badge flow">{j.status.toUpperCase()}</span>
                          </div>
                          <div className="w-full bg-[var(--surface-3)] h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-[var(--teal)] fill ${j.status === 'running' ? 'run' : ''}`}
                              style={{ width: `${j.progress}%` }}
                            />
                          </div>
                          <div className="card pad mono text-[13px] bg-[#070d18] text-[#cbd3de] min-h-[300px] flex flex-col gap-2">
                            <div className="muted">[{j.started}] Job alocado no motor {j.motor} com modelo {j.model}</div>
                            <div className="muted">[{j.started}] Git Worktree atômica criada em .work/wt-{j.id}/</div>
                            <div className="text-[#1BC5BD]">[{j.started}] Execução em progresso. Teto de gasto: US$ {j.ceiling.toFixed(2)}</div>
                          </div>
                        </div>
                      );
                    })()
                  ) : null}
                </div>
              </div>
            )}

            {/* 3. OPERAÇÃO: TASKS (KANBAN) */}
            {screen === 'tasks' && (
              <div className="page screen">
                <div className="phead">
                  <div>
                    <h1>Tasks Kanban</h1>
                    <p>Pipeline de tarefas com isolamento em worktree, prioridades e gates de aprovação.</p>
                  </div>
                  <div className="grow" />
                  <button className="btn primary sm" onClick={() => setModal('task-new')}>
                    <TvIcon name="plus" size={16} /> Nova task
                  </button>
                </div>
                <div className="g4">
                  {['to_plan', 'planned', 'in_progress', 'done'].map((st) => (
                    <div key={st} className="card pad flex flex-col gap-3 min-h-[400px]">
                      <div className="sec-title justify-between">
                        <h3>{st.toUpperCase().replace('_', ' ')}</h3>
                        <span className="badge">{tasks.filter((t) => t.status === st).length}</span>
                      </div>
                      {tasks.filter((t) => t.status === st).map((t) => (
                        <div key={t.id} className="card pad click">
                          <div className="flex items-center justify-between mb-1">
                            <span className="eyebrow">#{t.seq}</span>
                            <span className="badge">{t.prio}</span>
                          </div>
                          <strong className="text-[13px] block mb-2">{t.title}</strong>
                          <div className="muted text-[12px]">{t.who} · {t.sector}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. OPERAÇÃO: DECISÕES (APPROVALS) */}
            {screen === 'decisions' && (
              <div className="page screen split">
                <div className="split-side p-4">
                  <div className="sec-title mb-4">
                    <h2>Decisões ({approvals.length})</h2>
                  </div>
                  <div className="flex flex-col gap-2 overflow-auto">
                    {approvals.map((a) => (
                      <div
                        key={a.id}
                        className={`card pad click ${a.id === activeApprovalId ? 'border-[#B7F34A]' : ''}`}
                        onClick={() => { setActiveApprovalId(a.id); setApprovalChoice(null); }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="badge flow">{a.kind}</span>
                          <span className="muted text-[12px]">{a.status}</span>
                        </div>
                        <strong className="text-[13px] block mb-1">{a.title}</strong>
                        <div className="muted text-[12px]">{a.who} · {a.age}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="split-main p-6">
                  {approvals.find((x) => x.id === activeApprovalId) ? (
                    (() => {
                      const a = approvals.find((x) => x.id === activeApprovalId)!;
                      return (
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="eyebrow">{a.id} · {a.group.toUpperCase()}</span>
                              <h1 className="text-[24px] font-semibold">{a.title}</h1>
                            </div>
                            <span className="badge flow">{a.status.toUpperCase()}</span>
                          </div>
                          <div className="card pad">
                            <div className="eyebrow mb-2">Contexto & Justificativa</div>
                            <p className="text-[15px] mb-4">{a.reason}</p>
                            <div className="eyebrow mb-2">Pergunta de Decisão</div>
                            <strong className="text-[16px] block text-[#B7F34A] mb-4">{a.question}</strong>
                            <div className="flex items-center gap-4">
                              <button className="btn primary" onClick={() => handleApproval(a.id, 'approved')}>
                                <TvIcon name="check" size={16} /> Aprovar e Liberar
                              </button>
                              <button className="btn danger" onClick={() => handleApproval(a.id, 'rejected')}>
                                <TvIcon name="x" size={16} /> Recusar
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : null}
                </div>
              </div>
            )}

            {/* 5. OPERAÇÃO: AGENTES & CHAT */}
            {screen === 'agents' && (
              <ChatView onOpenModal={openModalWithName} onNavigate={setScreen} chatId="cv-paula" />
            )}
            {screen === 'chat' && (
              <ChatView onOpenModal={openModalWithName} onNavigate={setScreen} chatId="cv-paula" />
            )}

            {/* MÓDULOS */}
            {screen === 'modhub' && <ModulosView onOpenModal={openModalWithName} onNavigate={setScreen} />}
            {screen === 'fabrica' && <FabricaView onOpenModal={openModalWithName} onNavigate={setScreen} projects={projects} />}
            {screen === 'studio' && <StudioView onOpenModal={openModalWithName} onNavigate={setScreen} />}
            {screen === 'raiox' && <RaioXView onOpenModal={openModalWithName} onNavigate={setScreen} />}
            {screen === 'flow' && <ModulosView onOpenModal={openModalWithName} onNavigate={setScreen} />}
            {screen === 'edicao' && <StudioView onOpenModal={openModalWithName} onNavigate={setScreen} />}

            {/* COMERCIAL */}
            {(screen === 'funil' || screen === 'propostas' || screen === 'financas' || screen === 'personas') && (
              <ComercialView
                onOpenModal={openModalWithName}
                onNavigate={setScreen}
                initialTab={screen as any}
              />
            )}

            {/* SOCIAL */}
            {(screen === 'social' || screen === 'comms') && (
              <SocialView
                onOpenModal={openModalWithName}
                onNavigate={setScreen}
                initialTab={screen === 'comms' ? 'comms' : 'perfis'}
              />
            )}

            {/* CONHECIMENTO */}
            {(screen === 'cerebro' || screen === 'memoria' || screen === 'ideias') && (
              <ConhecimentoView
                onOpenModal={openModalWithName}
                onNavigate={setScreen}
                initialTab={screen as any}
              />
            )}

            {/* ESTRATÉGIA */}
            {(screen === 'mission' || screen === 'roadmap' || screen === 'mapa') && (
              <EstrategiaView
                onOpenModal={openModalWithName}
                onNavigate={setScreen}
                initialTab={screen as any}
              />
            )}

            {/* SISTEMA */}
            {(screen === 'analytics' || screen === 'doctor' || screen === 'skills' || screen === 'org') && (
              <SistemaView
                onOpenModal={openModalWithName}
                onNavigate={setScreen}
                initialTab={screen as any}
              />
            )}

            {/* CONFIGURAÇÕES DE MOTORES */}
            {screen === 'config' && (
              <div className="page screen">
                <div className="phead">
                  <div>
                    <h1>Configurações & Motores de IA</h1>
                    <p>Multi-motor: ligue os SDKs locais, escolha o padrão e defina modelo + esforço (como no Concierge).</p>
                  </div>
                </div>
                <div className="g2">
                  <div className="card pad">
                    <div className="sec-title mb-4">
                      <TvIcon name="sliders" size={18} />
                      <h2>Hub de Motores Locais</h2>
                    </div>
                    <div className="flex flex-col gap-4">
                      {ENGINE_CATALOG.map((m) => {
                        const enabledKey =
                          m.id === 'cursor'
                            ? 'cursorEnabled'
                            : m.id === 'claude'
                              ? 'claudeEnabled'
                              : m.id === 'codex'
                                ? 'codexEnabled'
                                : 'antigravityEnabled';
                        const enabled = (engineSettings as any)[enabledKey] !== false;
                        const isDefault = engineSettings.defaultEngine === m.id || (m.id === 'claude' && engineSettings.defaultEngine === 'anthropic');
                        return (
                          <div key={m.id} className="flex items-center justify-between gap-3 p-3 border border-[var(--line)] rounded-xl">
                            <div className="grow">
                              <strong>{m.label}</strong>
                              <div className="muted text-[12px]">SDK local · {m.sdk}</div>
                            </div>
                            <label className="muted text-[12px] flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={enabled}
                                onChange={(e) => {
                                  const on = e.target.checked;
                                  const patch: Partial<EngineSettings> = { [enabledKey]: on } as any;
                                  if (m.id === 'claude') patch.anthropicEnabled = on;
                                  void patchEngines(patch).then(() =>
                                    showToast('Motor', on ? `${m.label} ligado` : `${m.label} desligado`),
                                  );
                                }}
                              />
                              Ativo
                            </label>
                            <button
                              className={`btn sm ${isDefault ? 'primary' : 'secondary'}`}
                              onClick={() => {
                                const fitted = fitCall(m.id, m.defaultModel, m.defaultEffort);
                                void patchEngines({
                                  defaultEngine: m.id as any,
                                  defaultModel: fitted.model.id,
                                  defaultEffort: fitted.effort.id,
                                  [enabledKey]: true,
                                  ...(m.id === 'claude' ? { anthropicEnabled: true, claudeEnabled: true } : {}),
                                }).then(() => showToast('Motor padrão', `${m.label} · ${fitted.model.label}`));
                              }}
                            >
                              {isDefault ? 'Padrão' : 'Tornar padrão'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="card pad">
                    <div className="sec-title mb-4">
                      <TvIcon name="spark" size={18} />
                      <h2>Padrão: modelo e esforço</h2>
                    </div>
                    <p className="muted text-[12.5px] mb-3">
                      Na Fábrica só aparecem os motores ativos. Padrão atual: <strong>{engineCaption}</strong>
                    </p>
                    <div className="flex flex-col gap-3">
                      <label className="flex flex-col gap-1 text-[12px] font-semibold">
                        Modelo ({activeMotor.label})
                        <select
                          className="input"
                          value={activeModel.model.id}
                          onChange={(e) => {
                            const fitted = fitCall(activeMotor.id, e.target.value, engineSettings.defaultEffort);
                            void patchEngines({
                              defaultModel: fitted.model.id,
                              defaultEffort: fitted.effort.id,
                            });
                          }}
                        >
                          {activeMotor.models.map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-[12px] font-semibold">
                        Esforço / profundidade
                        <select
                          className="input"
                          value={activeModel.effort.id}
                          onChange={(e) => {
                            void patchEngines({ defaultEffort: e.target.value });
                          }}
                        >
                          {activeModel.model.efforts.map((effort) => (
                            <option key={effort.id} value={effort.id}>
                              {effort.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      {activeModel.model.id === 'auto-smart' && (
                        <p className="muted text-[12px]">Auto não aplica Cost, Balance ou Intelligence nesta instalação.</p>
                      )}
                      <p className="muted text-[12px]">
                        Catálogo filtrado na Fábrica: {engineCatalog.map((e) => e.label).join(', ') || activeMotor.label}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modais Globais */}
      <Modals
        modal={modal}
        mdata={modalData}
        onClose={() => setModal(null)}
        onStartJob={handleStartJob}
        onCreateTask={handleCreateTask}
        onCreateProject={handleCreateProject}
        onNavigate={setScreen}
        tasks={tasks}
      />

      {/* Toast Flutuante */}
      {toast && (
        <div className="toast" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
          <div className="card pad bg-[var(--surface-3)] border-[var(--flow-subtle-line)] shadow-xl flex items-center gap-3">
            <TvIcon name="check" size={20} className="text-[#1BC5BD]" />
            <div>
              <strong className="block text-[14px]">{toast.title}</strong>
              <span className="muted text-[12px]">{toast.message}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
