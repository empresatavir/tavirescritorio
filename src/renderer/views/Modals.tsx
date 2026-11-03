import React, { useState } from 'react';
import { TvIcon } from '../components/TvIcon';

interface ModalsProps {
  modal: string | null;
  mdata?: any;
  onClose: () => void;
  onStartJob: (title: string, motor: string, model: string, ceiling: number) => void;
  onCreateTask: (title: string, prio: string, sector: string) => void;
  onCreateProject?: (params: {
    name: string;
    company?: string;
    template_category?: 'lp' | 'of' | 'sy';
    template?: string;
  }) => void;
  onNavigate: (screen: string, extra?: any) => void;
  tasks?: any[];
  onMoveTask?: (taskId: string, newStatus: string) => void;
}

export const Modals: React.FC<ModalsProps> = ({
  modal,
  mdata,
  onClose,
  onStartJob,
  onCreateTask,
  onCreateProject,
  onNavigate,
  tasks = [],
  onMoveTask
}) => {
  // Wizard State
  const [wzStep, setWzStep] = useState<number>(0);
  const [wzMotor, setWzMotor] = useState<string>('Cursor');
  const [wzModel, setWzModel] = useState<string>('claude-sonnet-4');
  const [wzEffort, setWzEffort] = useState<string>('Equilibrado');
  const [jobTitle, setJobTitle] = useState<string>('');
  const [jobCeiling, setJobCeiling] = useState<string>('5,00');

  // Task New State
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [taskPrio, setTaskPrio] = useState<string>('Normal');
  const [taskSector, setTaskSector] = useState<string>('Engenharia');

  // Factory New State (só Fábrica)
  const [projName, setProjName] = useState<string>('');
  const [projClient, setProjClient] = useState<string>('');
  const [projCat, setProjCat] = useState<'lp' | 'of' | 'sy'>('lp');

  // Palette State
  const [palQ, setPalQ] = useState<string>('');

  if (!modal) return null;

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(7, 13, 24, 0.78)',
        backdropFilter: 'blur(8px)',
        zIndex: 9990,
        display: 'grid',
        placeItems: 'center',
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* 1. WIZARD: INICIAR JOB */}
      {modal === 'wizard-job' && (
        <div
          className="card pad flex flex-col gap-5"
          style={{ width: '100%', maxWidth: '640px', background: 'var(--surface-1)' }}
        >
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
            <div>
              <span className="eyebrow text-[#B7F34A]">Passo {wzStep + 1} de 4</span>
              <h2 className="text-[20px] font-semibold">Iniciar Execução Autônoma</h2>
            </div>
            <button className="btn sm ghost" onClick={onClose}>
              <TvIcon name="x" size={16} />
            </button>
          </div>

          {/* Stepper */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { n: '01', l: 'Motor', v: wzMotor },
              { n: '02', l: 'Modelo', v: wzModel.split('-')[1] },
              { n: '03', l: 'Esforço', v: wzEffort },
              { n: '04', l: 'Teto', v: `US$ ${jobCeiling}` }
            ].map((st, i) => (
              <div
                key={st.n}
                onClick={() => setWzStep(i)}
                className={`card pad click text-center border ${
                  wzStep === i ? 'border-[#B7F34A] bg-[var(--surface-3)]' : 'border-[var(--line)]'
                }`}
              >
                <span className="mono text-[10px] muted">{st.n}</span>
                <strong className="block text-[12px]">{st.l}</strong>
                <span className="text-[11px] text-[#1BC5BD]">{st.v}</span>
              </div>
            ))}
          </div>

          {/* Passo 0: Motor */}
          {wzStep === 0 && (
            <div className="flex flex-col gap-3">
              <span className="eyebrow">Escolha o motor para executar este job</span>
              {[
                { id: 'Cursor', desc: 'Motor local nativo de edição de código e worktrees', badge: 'Recomendado' },
                { id: 'Claude', desc: 'Anthropic Claude Code SDK oficial na máquina', badge: 'Conectado' },
                { id: 'Codex', desc: 'OpenAI Codex para tarefas em sandbox', badge: 'Conectado' },
                { id: 'Antigravity', desc: 'Google Antigravity com janela de contexto expandida', badge: 'Local' }
              ].map((m) => (
                <div
                  key={m.id}
                  onClick={() => setWzMotor(m.id)}
                  className={`card pad click flex items-center justify-between border ${
                    wzMotor === m.id ? 'border-[#B7F34A] bg-[var(--surface-3)]' : 'border-[var(--line)]'
                  }`}
                >
                  <div>
                    <strong className="text-[14px]">{m.id}</strong>
                    <div className="muted text-[12px]">{m.desc}</div>
                  </div>
                  <span className="badge flow">{m.badge}</span>
                </div>
              ))}
            </div>
          )}

          {/* Passo 1: Modelo */}
          {wzStep === 1 && (
            <div className="flex flex-col gap-3">
              <span className="eyebrow">Selecione o modelo de linguagem</span>
              {[
                { id: 'claude-sonnet-4', desc: 'Equilíbrio ideal entre custo e alta qualidade de código', tag: '$$' },
                { id: 'claude-opus-4', desc: 'Raciocínio longo, arquitetura e planejamento de produto', tag: '$$$$' },
                { id: 'gpt-4o', desc: 'Leitura rápida, auditoria e conferência de regras', tag: '$$' }
              ].map((mod) => (
                <div
                  key={mod.id}
                  onClick={() => setWzModel(mod.id)}
                  className={`card pad click flex items-center justify-between border ${
                    wzModel === mod.id ? 'border-[#B7F34A] bg-[var(--surface-3)]' : 'border-[var(--line)]'
                  }`}
                >
                  <div>
                    <strong className="text-[14px]">{mod.id}</strong>
                    <div className="muted text-[12px]">{mod.desc}</div>
                  </div>
                  <span className="badge">{mod.tag}</span>
                </div>
              ))}
            </div>
          )}

          {/* Passo 2: Esforço */}
          {wzStep === 2 && (
            <div className="flex flex-col gap-3">
              <span className="eyebrow">Intensidade e profundidade de reflexão</span>
              {[
                { id: 'Rápido', desc: 'Execução direta com menos passos de conferência', mult: '×0,6' },
                { id: 'Equilibrado', desc: 'Plano inicial, execução atômica e uma revisão de QA', mult: '×1,0' },
                { id: 'Profundo', desc: 'Decomposição em sub-etapas e dupla verificação', mult: '×1,8' }
              ].map((eff) => (
                <div
                  key={eff.id}
                  onClick={() => setWzEffort(eff.id)}
                  className={`card pad click flex items-center justify-between border ${
                    wzEffort === eff.id ? 'border-[#B7F34A] bg-[var(--surface-3)]' : 'border-[var(--line)]'
                  }`}
                >
                  <div>
                    <strong className="text-[14px]">{eff.id}</strong>
                    <div className="muted text-[12px]">{eff.desc}</div>
                  </div>
                  <span className="mono text-[12px] muted">{eff.mult}</span>
                </div>
              ))}
            </div>
          )}

          {/* Passo 3: Teto & Título */}
          {wzStep === 3 && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[13px] font-semibold block mb-1">Título do Job</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="Ex: Auditoria de endpoints e hardening de headers"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[13px] font-semibold block mb-1">Teto Máximo de Gasto (US$)</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="Ex: 5,00"
                  value={jobCeiling}
                  onChange={(e) => setJobCeiling(e.target.value)}
                />
                <small className="muted text-[11px] mt-1 block">
                  Obrigatório: Se a execução atingir esse limite, o job para imediatamente e pede autorização.
                </small>
              </div>

              <div className="card pad bg-[#070d18] mono text-[12px] text-[#cbd3de]">
                <div className="text-[#1BC5BD] mb-1">resumo_planejamento:</div>
                <div>motor: {wzMotor} · modelo: {wzModel}</div>
                <div>esforço: {wzEffort} · teto_rigido: US$ {jobCeiling}</div>
                <div className="text-[#aeb7c4] mt-1">worktree: .work/wt-job-auto/ isolada</div>
              </div>
            </div>
          )}

          {/* Botões do Rodapé */}
          <div className="flex items-center justify-between border-t border-[var(--line)] pt-4 mt-2">
            <button
              className="btn secondary"
              onClick={() => {
                if (wzStep === 0) onClose();
                else setWzStep((p) => p - 1);
              }}
            >
              {wzStep === 0 ? 'Cancelar' : 'Voltar'}
            </button>

            {wzStep < 3 ? (
              <button className="btn primary" onClick={() => setWzStep((p) => p + 1)}>
                Continuar
              </button>
            ) : (
              <button
                className="btn primary"
                onClick={() => {
                  const ceil = parseFloat(jobCeiling.replace(',', '.')) || 5.0;
                  onStartJob(jobTitle || 'Novo Job Operacional', wzMotor, wzModel, ceil);
                }}
              >
                <TvIcon name="zap" size={16} /> Iniciar Job no Motor
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. PALETTE DE COMANDOS (CTRL+K) */}
      {modal === 'palette' && (
        <div
          className="card pad flex flex-col gap-3"
          style={{ width: '100%', maxWidth: '580px', background: 'var(--surface-1)' }}
        >
          <div className="search flex items-center gap-2 p-3 rounded-xl bg-[var(--surface-3)] border border-[var(--line)]">
            <TvIcon name="search" size={18} className="text-[#B7F34A]" />
            <input
              type="text"
              autoFocus
              className="bg-transparent border-0 outline-none text-[14px] w-full"
              placeholder="Buscar ou navegar... (digite para filtrar)"
              value={palQ}
              onChange={(e) => setPalQ(e.target.value)}
            />
            <span className="kbd">ESC</span>
          </div>

          <div className="flex flex-col gap-1 max-h-[360px] overflow-auto">
            {[
              { label: 'Sala de Operação', cat: 'Navegação', screen: 'room' },
              { label: 'Execuções (Jobs Ativos)', cat: 'Navegação', screen: 'exec' },
              { label: 'Tasks Kanban', cat: 'Navegação', screen: 'tasks' },
              { label: 'Decisões & Gates Soberanos', cat: 'Navegação', screen: 'decisions' },
              { label: 'Fábrica de Software', cat: 'Módulos', screen: 'fabrica' },
              { label: 'Studio de Conteúdo', cat: 'Módulos', screen: 'studio' },
              { label: 'Raio-X de Presença', cat: 'Módulos', screen: 'raiox' },
              { label: 'Funil & Comercial', cat: 'Comercial', screen: 'funil' },
              { label: 'Configurações de Motores', cat: 'Sistema', screen: 'config' },
              { label: 'Doctor & Telemetria', cat: 'Sistema', screen: 'doctor' }
            ]
              .filter((h) => h.label.toLowerCase().includes(palQ.toLowerCase()) || h.cat.toLowerCase().includes(palQ.toLowerCase()))
              .map((hit) => (
                <div
                  key={hit.label}
                  onClick={() => {
                    onNavigate(hit.screen);
                    onClose();
                  }}
                  className="card pad click flex items-center justify-between p-2.5 hover:bg-[var(--surface-3)]"
                >
                  <div className="flex items-center gap-2">
                    <TvIcon name="arrow" size={14} className="text-muted" />
                    <strong className="text-[13px]">{hit.label}</strong>
                  </div>
                  <span className="badge">{hit.cat}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 3. NOVA TASK */}
      {modal === 'task-new' && (
        <div
          className="card pad flex flex-col gap-4"
          style={{ width: '100%', maxWidth: '500px', background: 'var(--surface-1)' }}
        >
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
            <h2 className="text-[18px] font-semibold">Nova Task Operacional</h2>
            <button className="btn sm ghost" onClick={onClose}><TvIcon name="x" size={16} /></button>
          </div>

          <div>
            <label className="text-[13px] font-semibold block mb-1">Título da Demanda</label>
            <input
              type="text"
              className="input w-full"
              placeholder="O que precisa acontecer"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[13px] font-semibold block mb-1">Prioridade</label>
              <select
                className="input w-full"
                value={taskPrio}
                onChange={(e) => setTaskPrio(e.target.value)}
              >
                <option value="Normal">Normal</option>
                <option value="Alta">Alta</option>
                <option value="Crítica">Crítica</option>
              </select>
            </div>
            <div>
              <label className="text-[13px] font-semibold block mb-1">Setor</label>
              <select
                className="input w-full"
                value={taskSector}
                onChange={(e) => setTaskSector(e.target.value)}
              >
                <option value="Engenharia">Engenharia</option>
                <option value="Conteúdo">Conteúdo</option>
                <option value="Comercial">Comercial</option>
                <option value="Estratégia">Estratégia</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--line)]">
            <button className="btn secondary" onClick={onClose}>Cancelar</button>
            <button
              className="btn primary"
              disabled={!taskTitle.trim()}
              onClick={() => {
                onCreateTask(taskTitle, taskPrio, taskSector);
                onClose();
              }}
            >
              Criar Task em A Planejar
            </button>
          </div>
        </div>
      )}

      {/* 4. MODAL DE EVIDÊNCIA */}
      {modal === 'evidence' && (
        <div
          className="card pad flex flex-col gap-4"
          style={{ width: '100%', maxWidth: '600px', background: 'var(--surface-1)' }}
        >
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
            <div>
              <span className="eyebrow text-[#1BC5BD]">Leitura de Artefato</span>
              <h2 className="text-[18px] font-semibold">Evidência: Meridian QA</h2>
            </div>
            <button className="btn sm ghost" onClick={onClose}><TvIcon name="x" size={16} /></button>
          </div>

          <div className="card pad bg-[#070d18] mono text-[13px] text-[#cbd3de]">
            <div className="text-[#1BC5BD] mb-1">status: observed</div>
            <div className="muted mb-1">source: workspace/meridian/qa.md</div>
            <div className="muted mb-3">checked_by: Edna E2E · 14:16</div>
            <div className="text-[#1BC5BD]">- [x] Build sem erro Nuxt 3</div>
            <div className="text-[#1BC5BD]">- [x] Links internos íntegros</div>
            <div className="text-[#f59e0b]">- [ ] Prova visual em 390 px</div>
            <div className="text-[#f59e0b]">- [ ] Assinatura SEO por Nina SEO</div>
          </div>

          <div className="flex justify-end pt-2 border-t border-[var(--line)]">
            <button className="btn primary sm" onClick={onClose}>Fechar</button>
          </div>
        </div>
      )}

      {/* 5. NOVA ESTEIRA (Fábrica) */}
      {(modal === 'factory-new' || modal === 'project') && (
        <div
          className="card pad flex flex-col gap-4"
          style={{ width: '100%', maxWidth: '520px', background: 'var(--surface-1)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
            <div>
              <span className="eyebrow text-[#B7F34A]">Fábrica</span>
              <h2 className="text-[18px] font-semibold">Nova esteira</h2>
            </div>
            <button type="button" className="btn sm ghost" onClick={onClose}>
              <TvIcon name="x" size={16} />
            </button>
          </div>

          <label className="flex flex-col gap-1 text-[13px]">
            <span className="muted">Nome do projeto</span>
            <input
              value={projName}
              onChange={(e) => setProjName(e.target.value)}
              placeholder="Ex.: Landing do cliente"
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1 text-[13px]">
            <span className="muted">Cliente / empresa</span>
            <input
              value={projClient}
              onChange={(e) => setProjClient(e.target.value)}
              placeholder="Ex.: Nome do cliente"
            />
          </label>
          <label className="flex flex-col gap-1 text-[13px]">
            <span className="muted">Categoria</span>
            <select value={projCat} onChange={(e) => setProjCat(e.target.value as 'lp' | 'of' | 'sy')}>
              <option value="lp">Landing Pages</option>
              <option value="of">Ofertas</option>
              <option value="sy">Sistemas</option>
            </select>
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
            <button type="button" className="btn secondary sm" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn primary sm"
              disabled={!projName.trim() || !onCreateProject}
              onClick={() => {
                onCreateProject?.({
                  name: projName.trim(),
                  company: projClient.trim() || undefined,
                  template_category: projCat,
                  template: projCat === 'sy' ? 'SY-C1' : projCat === 'of' ? 'OF-C1' : 'LP-C1',
                });
                setProjName('');
                setProjClient('');
                setProjCat('lp');
              }}
            >
              Criar esteira
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
