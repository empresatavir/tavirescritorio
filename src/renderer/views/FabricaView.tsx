import React, { useState } from 'react';
import { TvIcon } from '../components/TvIcon';

interface FabricaViewProps {
  onOpenModal?: (name: string, data?: any) => void;
  onNavigate?: (screen: string, extra?: any) => void;
}

export const FabricaView: React.FC<FabricaViewProps> = ({ onOpenModal, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'esteiras' | 'console'>('console');
  const [activeStage, setActiveStage] = useState<number>(6); // Etapa 6: QA
  const [stageTab, setStageTab] = useState<string>('qa');

  const lines = [
    {
      id: 'meridian',
      name: 'Meridian — landing institucional',
      kind: 'Landing Pages',
      client: 'Meridian Capital',
      due: 'entrega 04/11 · faltam 6 dias',
      dueColor: 'var(--text-secondary)',
      pct: 68,
      state: 'no gate',
      cls: 'warn',
      stage: 'etapa 6 de 9 · QA',
      owner: 'Edna E2E',
      nodes: [
        { label: 'Entender', size: 14, bg: 'var(--flow)', bd: 'transparent', done: true },
        { label: 'Pesquisa', size: 14, bg: 'var(--flow)', bd: 'transparent', done: true },
        { label: 'Prova', size: 14, bg: 'var(--flow)', bd: 'transparent', done: true },
        { label: 'Comercial', size: 14, bg: 'var(--flow)', bd: 'transparent', done: true },
        { label: 'Construção', size: 14, bg: 'var(--flow)', bd: 'transparent', done: true },
        { label: 'QA', size: 20, bg: 'var(--warning)', bd: 'var(--surface-0)', done: false, anim: 'pulse 2s infinite' },
        { label: 'SEO', size: 14, bg: 'var(--line)', bd: 'transparent', done: false },
        { label: 'Handoff', size: 14, bg: 'var(--line)', bd: 'transparent', done: false },
        { label: 'Guarda', size: 14, bg: 'var(--line)', bd: 'transparent', done: false },
      ]
    },
    {
      id: 'multiverso',
      name: 'Multiverso Paranoico — Oferta ep. 14',
      kind: 'Ofertas',
      client: 'Canal Multiverso',
      due: 'entrega 01/11 · hoje',
      dueColor: 'var(--warning)',
      pct: 42,
      state: 'rodando',
      cls: 'flow',
      stage: 'etapa 3 de 5 · Arte',
      owner: 'Adriano Arte',
      nodes: [
        { label: 'Pauta', size: 14, bg: 'var(--flow)', bd: 'transparent', done: true },
        { label: 'Roteiro', size: 14, bg: 'var(--flow)', bd: 'transparent', done: true },
        { label: 'Arte', size: 20, bg: 'var(--flow)', bd: 'var(--surface-0)', done: false, anim: 'pulse 2s infinite' },
        { label: 'Revisão', size: 14, bg: 'var(--line)', bd: 'transparent', done: false },
        { label: 'Publicar', size: 14, bg: 'var(--line)', bd: 'transparent', done: false }
      ]
    }
  ];

  const stagesList = [
    { n: '01', label: 'Entender', meta: 'Paula PM', owner: 'Paula PM', role: 'Orquestradora & Planejamento', icon: 'compass', ini: 'PP', dur: '45 min', cost: 'US$ 0,80', files: 4 },
    { n: '02', label: 'Pesquisa', meta: 'Dora Descoberta', owner: 'Dora Descoberta', role: 'Gate 0 & Intake Descoberta', icon: 'search', ini: 'DD', dur: '1h 20m', cost: 'US$ 1,40', files: 8 },
    { n: '03', label: 'Prova visual', meta: 'Yuri UX', owner: 'Yuri UX', role: 'UX Research & Prova Visual', icon: 'spark', ini: 'YU', dur: '2h 10m', cost: 'US$ 2,10', files: 12 },
    { n: '04', label: 'Comercial', meta: 'Cléber Closer', owner: 'Cléber Closer', role: 'Fechamento Comercial', icon: 'case', ini: 'CC', dur: '1h 05m', cost: 'US$ 0,90', files: 3 },
    { n: '05', label: 'Construção', meta: 'Vitor Construtor', owner: 'Vitor Construtor', role: 'Dev Frontend Sênior', icon: 'factory', ini: 'VC', dur: '4h 15m', cost: 'US$ 4,50', files: 24 },
    { n: '06', label: 'QA & Regressão', meta: 'Edna E2E', owner: 'Edna E2E', role: 'QA End-to-End & Regressão', icon: 'shield', ini: 'EE', dur: '1h 40m', cost: 'US$ 1,60', files: 7, inGate: true },
    { n: '07', label: 'SEO Técnico', meta: 'Nina SEO', owner: 'Nina SEO', role: 'SEO Técnico & Distribuição', icon: 'target', ini: 'NS', dur: '—', cost: '—', files: 0, waiting: true },
    { n: '08', label: 'Handoff', meta: 'Théo Tech Lead', owner: 'Théo Tech Lead', role: 'Liderança Técnica & Padrões', icon: 'net', ini: 'TT', dur: '—', cost: '—', files: 0, waiting: true },
    { n: '09', label: 'Completion Guard', meta: 'Auditoria Final', owner: 'Completion Guard', role: 'Guarda Automática de Critério', icon: 'lock', ini: 'CG', dur: '—', cost: '—', files: 0, waiting: true }
  ];

  const currentStage = stagesList[activeStage - 1] || stagesList[5];

  return (
    <div className="page" style={{ maxWidth: '1520px', gap: '20px', paddingBottom: '80px' }}>
      {/* SELETOR DE MODO: LISTA OU CONSOLE */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          className={`btn sm ${activeTab === 'esteiras' ? 'primary' : 'ghost'}`}
          onClick={() => setActiveTab('esteiras')}
        >
          Visão Geral das Esteiras
        </button>
        <button
          className={`btn sm ${activeTab === 'console' ? 'primary' : 'ghost'}`}
          onClick={() => setActiveTab('console')}
        >
          Console: Meridian Capital
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn sm secondary" onClick={() => onOpenModal?.('factory-new')}>
          <TvIcon name="plus" size={16} /> Nova esteira
        </button>
      </div>

      {activeTab === 'esteiras' ? (
        <>
          <div className="phead">
            <div>
              <span className="eyebrow">Módulos · Vender</span>
              <h1 style={{ marginTop: '8px' }}>Fábrica de Software</h1>
              <p>Landing, oferta e sistema em esteiras atômicas. Cada etapa tem dono, artefatos verificáveis e critério de pronto rigoroso.</p>
            </div>
          </div>

          <div className="g4">
            <div className="card pad">
              <span className="eyebrow">Esteiras ativas</span>
              <div className="text-[26px] font-semibold my-1">3</div>
              <small className="muted">2 criação · 1 manutenção</small>
            </div>
            <div className="card pad">
              <span className="eyebrow">No gate</span>
              <div className="text-[26px] font-semibold text-[#B7F34A] my-1">1</div>
              <small className="muted">QA Meridian (variável / viewport 390px)</small>
            </div>
            <div className="card pad">
              <span className="eyebrow">Entregues em 30d</span>
              <div className="text-[26px] font-semibold text-[#1BC5BD] my-1">4</div>
              <small className="muted">100% de aprovação na 1ª rodada</small>
            </div>
            <div className="card pad">
              <span className="eyebrow">Lead time médio</span>
              <div className="text-[26px] font-semibold my-1">4,2 dias</div>
              <small className="muted">Meta: &lt; 4 dias</small>
            </div>
          </div>

          <section className="card pad">
            <div className="sec-title mb-4">
              <h3>Esteiras ao Vivo</h3>
              <div style={{ flex: 1 }} />
              <div className="legend flex items-center gap-4 text-[12px] muted">
                <span className="flex items-center gap-1.5"><i style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--flow)' }} /> concluída</span>
                <span className="flex items-center gap-1.5"><i style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)' }} /> agora</span>
                <span className="flex items-center gap-1.5"><i style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--line-strong)' }} /> a seguir</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {lines.map((l) => (
                <div
                  key={l.id}
                  className="card pad click flex items-center justify-between"
                  onClick={() => setActiveTab('console')}
                >
                  <div style={{ flex: '0 0 240px' }}>
                    <strong className="text-[15px] block">{l.name}</strong>
                    <div className="muted text-[12px]">{l.kind} · {l.client}</div>
                    <div className="mono text-[11px] text-[#B7F34A] mt-1">{l.due}</div>
                  </div>

                  <div style={{ flex: 1, padding: '0 24px' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] muted">Agora: <b>{l.stage}</b> ({l.owner})</span>
                      <span className="badge flow">{l.pct}%</span>
                    </div>
                    {/* Barra nós da esteira */}
                    <div className="flex items-center w-full">
                      {l.nodes.map((n, i) => (
                        <React.Fragment key={i}>
                          <div
                            style={{
                              width: n.size,
                              height: n.size,
                              borderRadius: '50%',
                              background: n.bg,
                              border: `2px solid ${n.bd}`,
                              animation: n.anim
                            }}
                          />
                          {i < l.nodes.length - 1 && (
                            <div style={{ flex: 1, height: 2, background: 'var(--line)' }} />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  <span className="badge flow">{l.state.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        /* CONSOLE DA ESTEIRA ATIVA */
        <div className="flex flex-col gap-4">
          <section className="ink p-6 rounded-2xl flex gap-6 flex-wrap items-stretch" style={{ background: 'var(--surface-ink)' }}>
            <div style={{ flex: '2 1 340px' }} className="flex flex-col gap-3">
              <span className="eyebrow text-[#B7F34A]">LP · Criação · Meridian Capital</span>
              <h1 className="text-[28px] font-semibold text-[#F4F6F2] leading-tight">Meridian — landing institucional</h1>
              <div className="flex gap-2 flex-wrap">
                <span className="badge">entrega 04/11 · faltam 6 dias</span>
                <span className="badge flow">PRO-005 assinada</span>
                <span className="badge">6 agentes dedicados</span>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-auto pt-4">
                <div>
                  <div className="eyebrow text-[11px]">Progresso</div>
                  <div className="num text-[28px] text-[#B7F34A]">68%</div>
                </div>
                <div>
                  <div className="eyebrow text-[11px]">Etapa</div>
                  <div className="num text-[28px] text-[#F4F6F2]">06 <span className="text-[14px] text-muted">/ 09</span></div>
                </div>
                <div>
                  <div className="eyebrow text-[11px]">Custo / Teto</div>
                  <div className="num text-[18px] text-[#F4F6F2] mt-1">US$ 16,40 <span className="text-[13px] text-muted">/ 25,00</span></div>
                </div>
              </div>
            </div>

            <div style={{ flex: '1 1 280px' }} className="card pad bg-[#0f1729] border border-[var(--warning)] flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <TvIcon name="shield" size={20} className="text-[#B7F34A]" />
                <span className="eyebrow text-[#B7F34A]">Etapa Ativa</span>
              </div>
              <strong className="text-[17px] text-[#F4F6F2]">QA & Regressão E2E</strong>
              <p className="text-[13px] muted">Edna E2E testou build e links internos. Prova em 390px aguarda autorização.</p>
              <div className="mt-auto">
                <button
                  className="btn primary sm w-full"
                  onClick={() => onNavigate?.('decisions', { approvalId: 'ap-02' })}
                >
                  Ver Gate ap-02
                </button>
              </div>
            </div>
          </section>

          {/* Topologia Horizontal da Esteira */}
          <section className="card pad">
            <div className="sec-title mb-4">
              <h3>Topologia da Esteira (9 Etapas)</h3>
              <div style={{ flex: 1 }} />
              <span className="muted text-[12px]">Clique numa etapa para inspecionar</span>
            </div>

            <div className="flex items-center overflow-x-auto py-2">
              {stagesList.map((st, i) => {
                const isSelected = activeStage === i + 1;
                const isPast = activeStage > i + 1;
                const isCurrent = activeStage === i + 1;

                return (
                  <React.Fragment key={st.n}>
                    <button
                      className="flex flex-col items-center gap-2 bg-transparent border-0 cursor-pointer p-2"
                      onClick={() => setActiveStage(i + 1)}
                      style={{ minWidth: 96 }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 14,
                          display: 'grid',
                          placeItems: 'center',
                          background: isCurrent ? 'var(--warning-subtle)' : isPast ? 'var(--flow-subtle)' : 'var(--surface-2)',
                          color: isCurrent ? 'var(--warning)' : isPast ? 'var(--flow)' : 'var(--text-muted)',
                          border: isSelected ? '2px solid var(--lime)' : '2px solid var(--line)',
                          animation: isCurrent ? 'pulse 2s infinite' : 'none'
                        }}
                      >
                        <TvIcon name={st.icon} size={18} />
                      </div>
                      <span className="text-[12px] font-semibold text-center whitespace-nowrap">{st.label}</span>
                      <span className="mono text-[10px] muted whitespace-nowrap">{st.meta}</span>
                    </button>
                    {i < stagesList.length - 1 && (
                      <div style={{ flex: 1, height: 2, background: isPast ? 'var(--flow)' : 'var(--line)', minWidth: 16 }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </section>

          {/* Painel da Etapa Selecionada */}
          <section className="card pad flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
              <div className="flex items-center gap-3">
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--surface-3)', display: 'grid', placeItems: 'center' }}>
                  <TvIcon name={currentStage.icon} size={22} className="text-[#B7F34A]" />
                </div>
                <div>
                  <span className="eyebrow">Etapa {currentStage.n} de 09</span>
                  <h2 className="text-[20px] font-semibold">{currentStage.label}</h2>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div>
                  <span className="eyebrow text-[10px]">Responsável</span>
                  <div className="text-[13px] font-semibold">{currentStage.owner}</div>
                </div>
                <div>
                  <span className="eyebrow text-[10px]">Duração</span>
                  <div className="text-[13px] font-semibold">{currentStage.dur}</div>
                </div>
                <div>
                  <span className="eyebrow text-[10px]">Custo</span>
                  <div className="text-[13px] font-semibold">{currentStage.cost}</div>
                </div>
              </div>
            </div>

            {/* Abas da Etapa */}
            <div className="flex items-center gap-2 border-b border-[var(--line)] pb-2">
              {['qa', 'artefatos', 'concorrentes', 'guard'].map((t) => (
                <button
                  key={t}
                  className={`btn sm ${stageTab === t ? 'primary' : 'ghost'}`}
                  onClick={() => setStageTab(t)}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>

            {stageTab === 'qa' && (
              <div className="flex flex-col gap-3">
                <div className="card pad bg-[#070d18] mono text-[13px] text-[#cbd3de]">
                  <div className="text-[#1BC5BD] mb-1">status: observed</div>
                  <div className="muted mb-1">source: workspace/meridian/qa.md</div>
                  <div className="muted mb-3">checked_by: Edna E2E · 14:16</div>
                  <div className="flex items-center gap-2 text-[#1BC5BD]"><TvIcon name="check" size={14} /> [x] Build sem erros de tipagem Nuxt 3</div>
                  <div className="flex items-center gap-2 text-[#1BC5BD]"><TvIcon name="check" size={14} /> [x] Integridade de links internos</div>
                  <div className="flex items-center gap-2 text-[#f59e0b]"><TvIcon name="alert" size={14} /> [ ] Prova visual em 390px (hero compete com menu)</div>
                  <div className="flex items-center gap-2 text-[#f59e0b]"><TvIcon name="alert" size={14} /> [ ] Assinatura SEO (meta tags pendentes)</div>
                </div>
              </div>
            )}

            {stageTab === 'artefatos' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="card pad">
                  <span className="eyebrow">Arquivo de Código</span>
                  <strong className="block text-[14px] my-1">frontend/pages/index.vue</strong>
                  <div className="muted text-[12px]">Gerado por Vitor Construtor · 14.8 KB</div>
                </div>
                <div className="card pad">
                  <span className="eyebrow">Prova de Design</span>
                  <strong className="block text-[14px] my-1">workspace/meridian/proof-390px.png</strong>
                  <div className="muted text-[12px]">Captura de layout mobile por Yuri UX</div>
                </div>
              </div>
            )}

            {stageTab === 'concorrentes' && (
              <div className="card pad overflow-auto">
                <table className="tbl w-full text-[13px]">
                  <thead>
                    <tr className="text-left border-b border-[var(--line)]">
                      <th className="p-2">Concorrente</th>
                      <th className="p-2">Promessa na Hero</th>
                      <th className="p-2">Ponto Fraco</th>
                      <th className="p-2">Vantagem Meridian</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[var(--line)]">
                      <td className="p-2 font-semibold">Alpha Asset</td>
                      <td className="p-2 text-muted">"Investimentos de ponta a ponta"</td>
                      <td className="p-2"><span className="badge danger">Genérico</span></td>
                      <td className="p-2">Posicionamento cirúrgico de nicho private</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-semibold">Beta Partners</td>
                      <td className="p-2 text-muted">"Soluções patrimoniais completas"</td>
                      <td className="p-2"><span className="badge warn">Confuso</span></td>
                      <td className="p-2">Clareza no cálculo de rentabilidade líquida</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {stageTab === 'guard' && (
              <div className="card pad flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <TvIcon name="lock" size={18} className="text-[#B7F34A]" />
                  <strong className="text-[15px]">Completion Guard Checklist</strong>
                </div>
                <p className="text-[13px] muted">O guard valida automaticamente se todos os critérios de pronto foram assinados antes do deploy final.</p>
                <div className="flex items-center gap-2 text-[#1BC5BD] text-[13px]"><TvIcon name="check" size={14} /> Contrato contra-assinado no cofre</div>
                <div className="flex items-center gap-2 text-[#1BC5BD] text-[13px]"><TvIcon name="check" size={14} /> Prova visual assinada pelo Yuri UX</div>
                <div className="flex items-center gap-2 text-[#f59e0b] text-[13px]"><TvIcon name="alert" size={14} /> Regressão E2E 100% verde (Aguardando gate)</div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
