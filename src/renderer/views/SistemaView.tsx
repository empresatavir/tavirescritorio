import React, { useState } from 'react';
import { TvIcon } from '../components/TvIcon';

interface SistemaViewProps {
  onOpenModal?: (name: string, data?: any) => void;
  onNavigate?: (screen: string, extra?: any) => void;
  initialTab?: 'analytics' | 'doctor' | 'skills' | 'org';
}

export const SistemaView: React.FC<SistemaViewProps> = ({ onOpenModal, onNavigate, initialTab = 'analytics' }) => {
  const [tab, setTab] = useState<'analytics' | 'doctor' | 'skills' | 'org'>(initialTab);
  const [doctorRunning, setDoctorRunning] = useState<boolean>(false);
  const [doctorResult, setDoctorResult] = useState<string>('96% Saudável');

  const dailyCosts = [
    { d: '18/10', v: 6.2, h: 52, bg: 'var(--flow)' },
    { d: '19/10', v: 7.1, h: 59, bg: 'var(--flow)' },
    { d: '20/10', v: 5.4, h: 45, bg: 'var(--flow)' },
    { d: '21/10', v: 9.8, h: 81, bg: 'var(--warning)' },
    { d: '22/10', v: 9.1, h: 76, bg: 'var(--warning)' },
    { d: '23/10', v: 4.2, h: 35, bg: 'var(--flow)' },
    { d: '24/10', v: 3.1, h: 26, bg: 'var(--flow)' },
    { d: '25/10', v: 6.8, h: 57, bg: 'var(--flow)' },
    { d: '26/10', v: 6.1, h: 51, bg: 'var(--flow)' },
    { d: '27/10', v: 10.2, h: 85, bg: 'var(--warning)' },
    { d: '28/10', v: 8.4, h: 70, bg: 'var(--flow)' },
    { d: '29/10', v: 9.6, h: 80, bg: 'var(--warning)' },
    { d: '30/10', v: 3.9, h: 32, bg: 'var(--flow)' },
    { d: '31/10', v: 8.4, h: 70, bg: 'var(--flow)' }
  ];

  const checks = [
    { k: 'Servidor Backend Local (FastAPI :9001)', m: 'Processo respondendo em 127.0.0.1:9001/health', ms: '4ms', st: 'OK', color: 'var(--flow)' },
    { k: 'Servidor Vite Frontend (:9002)', m: 'Build HMR ativo e servindo bundles sem colisão', ms: '2ms', st: 'OK', color: 'var(--flow)' },
    { k: 'Cofre DPAPI do Windows', m: 'Chave mestre AES-256-GCM validada contra o SID do usuário', ms: '12ms', st: 'OK', color: 'var(--flow)' },
    { k: 'Banco SQLite com WAL Mode', m: 'Base tavir.db íntegra, 0 páginas corrompidas no journal', ms: '6ms', st: 'OK', color: 'var(--flow)' },
    { k: 'Motor Anthropic Claude Code', m: 'Sessão autenticada localmente', ms: '140ms', st: 'OK', color: 'var(--flow)' },
    { k: 'Motor Cursor (agent.exe)', m: 'Binário detectado e pronto para execução em worktrees', ms: '18ms', st: 'OK', color: 'var(--flow)' },
    { k: 'Motor Google Antigravity', m: 'CLI agy configurado no path', ms: '22ms', st: 'OK', color: 'var(--flow)' }
  ];

  const skills = [
    { n: 'reference-fidelity-frontend', d: 'Auditoria visual e semântica com Playwright e limiar 12', c: 'Qualidade', by: 'Edna E2E', runs: 84, ok: 98, v: '2.1' },
    { n: 'pixel-perfect-html-clone', d: 'Clonagem milimétrica de mockups para React 19 JSX', c: 'Design', by: 'Yuri UX', runs: 62, ok: 100, v: '1.4' },
    { n: 'git-worktree-isolation', d: 'Criação e limpeza atômica de .work/wt-<id>/', c: 'DevOps', by: 'Davi DevOps', runs: 120, ok: 100, v: '3.0' },
    { n: 'oracle-editorial-angles', d: 'Geração de 3 ângulos canônicos a partir do Vault', c: 'Conteúdo', by: 'Oráculo Diretor', runs: 45, ok: 96, v: '1.2' },
    { n: 'safe-storage-dpapi', d: 'Cifragem transparente de credenciais via Windows safeStorage', c: 'Segurança', by: 'Atlas Web', runs: 210, ok: 100, v: '1.0' }
  ];

  const runDoctorCheck = () => {
    setDoctorRunning(true);
    setTimeout(() => {
      setDoctorRunning(false);
      setDoctorResult('100% Saudável');
    }, 1200);
  };

  return (
    <div className="page" style={{ maxWidth: '1520px', gap: '20px', paddingBottom: '80px' }}>
      <div className="phead">
        <div>
          <span className="eyebrow">Domínio de Sistema</span>
          <h1 style={{ marginTop: '8px' }}>
            {tab === 'analytics' && 'Analytics de Consumo & Custo'}
            {tab === 'doctor' && 'Doctor: Telemetria & Integridade'}
            {tab === 'skills' && 'Skills do Sistema'}
            {tab === 'org' && 'Organograma Operacional'}
          </h1>
          <p>
            {tab === 'analytics' && 'Telemetria em tempo real: gasto por modelo, projeto e limites de teto.'}
            {tab === 'doctor' && 'Checagem de portas, banco de dados, cofre DPAPI e latência de rede.'}
            {tab === 'skills' && 'Habilidades ativas instaladas nos agentes com métricas de assertividade.'}
            {tab === 'org' && 'Estrutura hierárquica e papéis de todos os 57 agentes da TAVIR.'}
          </p>
        </div>
        <div className="actions">
          {tab === 'doctor' && (
            <button className="btn primary" onClick={runDoctorCheck} disabled={doctorRunning}>
              <TvIcon name="retry" size={16} /> {doctorRunning ? 'Auditando...' : 'Rodar Checagem Agora'}
            </button>
          )}
        </div>
      </div>

      <div className="tabs">
        {[
          { id: 'analytics', label: 'Analytics' },
          { id: 'doctor', label: 'Doctor' },
          { id: 'skills', label: 'Skills' },
          { id: 'org', label: 'Org Chart' }
        ].map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'on' : ''}`}
            onClick={() => setTab(t.id as any)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'analytics' && (
        <div className="flex flex-col gap-4">
          <div className="g4">
            <div className="card pad">
              <span className="eyebrow">Custo no Período (14d)</span>
              <div className="num text-[26px] my-1">US$ 97,90</div>
              <small className="muted">Todos os 4 motores combinados</small>
            </div>
            <div className="card pad">
              <span className="eyebrow">Média Diária</span>
              <div className="num text-[26px] text-[#1BC5BD] my-1">US$ 6,99</div>
              <small className="muted">Teto diário: US$ 12,00</small>
            </div>
            <div className="card pad">
              <span className="eyebrow">Tokens Processados</span>
              <div className="num text-[26px] text-[#B7F34A] my-1">4,82 M</div>
              <small className="muted">Entrada + saída acumuladas</small>
            </div>
            <div className="card pad">
              <span className="eyebrow">Jobs sem Retrabalho</span>
              <div className="num text-[26px] my-1">94%</div>
              <small className="muted">Passaram de primeira no QA</small>
            </div>
          </div>

          <section className="card pad">
            <div className="sec-title mb-4">
              <h3>Custo Diário vs Teto (US$ 12,00)</h3>
            </div>

            <div style={{ position: 'relative', height: 220, padding: '20px 0 0' }}>
              <div style={{ position: 'absolute', left: 0, right: 0, top: 40, borderTop: '1px dashed var(--danger)' }}>
                <span className="mono text-[10px] text-danger" style={{ float: 'right' }}>teto diário US$ 12</span>
              </div>

              <div className="flex items-end gap-2 h-full">
                {dailyCosts.map((b) => (
                  <div key={b.d} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <div
                      style={{
                        width: '100%',
                        height: `${b.h}%`,
                        background: b.bg,
                        borderRadius: '4px 4px 0 0'
                      }}
                      title={`${b.d}: US$ ${b.v}`}
                    />
                    <span className="mono text-[10px] muted">{b.d.split('/')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="g2">
            <section className="card pad">
              <span className="eyebrow mb-2">Consumo por Motor / Modelo</span>
              <div className="flex flex-col gap-3 mt-3 text-[13px]">
                <div>
                  <div className="flex justify-between mb-1">
                    <span>Claude Sonnet 4 (via Anthropic/Cursor)</span>
                    <strong className="num">58%</strong>
                  </div>
                  <div className="bg-[var(--surface-3)] h-2 rounded-full overflow-hidden">
                    <div className="bg-[var(--flow)] h-full" style={{ width: '58%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span>Claude Opus 4 (Planejamento Paula PM)</span>
                    <strong className="num">24%</strong>
                  </div>
                  <div className="bg-[var(--surface-3)] h-2 rounded-full overflow-hidden">
                    <div className="bg-[var(--warning)] h-full" style={{ width: '24%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span>GPT-4o (Codex Sandbox)</span>
                    <strong className="num">18%</strong>
                  </div>
                  <div className="bg-[var(--surface-3)] h-2 rounded-full overflow-hidden">
                    <div className="bg-[var(--flow)] h-full" style={{ width: '18%' }} />
                  </div>
                </div>
              </div>
            </section>

            <section className="card pad">
              <span className="eyebrow mb-2">Distribuição por Projeto</span>
              <div className="flex flex-col gap-2 mt-3 text-[13px]">
                <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-3)]">
                  <span>Meridian Landing (Fábrica)</span>
                  <span className="badge flow">48%</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-3)]">
                  <span>Multiverso Paranoico (Studio)</span>
                  <span className="badge">32%</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-3)]">
                  <span>Operação Interna / Cérebro</span>
                  <span className="badge">20%</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {tab === 'doctor' && (
        <div className="grid grid-cols-12 gap-6 items-start">
          <section className="col-span-12 lg:col-span-8 card pad">
            <div className="sec-title mb-4">
              <h3>Checagens do Ambiente</h3>
              <div style={{ flex: 1 }} />
              <span className="muted text-[12px]">Auditoria contínua</span>
            </div>

            <div className="flex flex-col gap-3">
              {checks.map((c) => (
                <div key={c.k} className="card pad flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: c.color }} />
                    <div>
                      <strong className="text-[14px]">{c.k}</strong>
                      <div className="muted text-[12px]">{c.m}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="mono text-[11px] muted">{c.ms}</span>
                    <span className="badge flow">{c.st}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="col-span-12 lg:col-span-4 ink p-6 rounded-2xl flex flex-col justify-between" style={{ background: 'var(--surface-ink)' }}>
            <div>
              <span className="eyebrow text-[#B7F34A]">Índice de Saúde Global</span>
              <div className="num text-[44px] text-[#1BC5BD] my-2">{doctorResult}</div>
              <p className="text-[13px] text-[#cbd3de]">
                Todos os subsistemas críticos (Portas 9001 e 9002, DPAPI, Worktrees e SQLite) estão operando em velocidade máxima.
              </p>
            </div>

            <div className="flex flex-col gap-2 mt-6">
              <button className="btn sm secondary w-full" onClick={() => onNavigate?.('config')}>
                Configurar Motores
              </button>
            </div>
          </section>
        </div>
      )}

      {tab === 'skills' && (
        <section className="card pad overflow-auto">
          <table className="tbl w-full text-[13px]">
            <thead>
              <tr className="text-left border-b border-[var(--line)]">
                <th className="p-2">Skill</th>
                <th className="p-2">Categoria</th>
                <th className="p-2">Usada por</th>
                <th className="p-2">Execuções 30d</th>
                <th className="p-2">Taxa de Sucesso</th>
                <th className="p-2">Versão</th>
              </tr>
            </thead>
            <tbody>
              {skills.map((s) => (
                <tr key={s.n} className="border-b border-[var(--line)]">
                  <td className="p-2">
                    <strong className="mono block text-[13px]">{s.n}</strong>
                    <span className="muted text-[12px]">{s.d}</span>
                  </td>
                  <td className="p-2"><span className="badge">{s.c}</span></td>
                  <td className="p-2 font-medium">{s.by}</td>
                  <td className="p-2 num">{s.runs}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-[var(--surface-3)] h-2 rounded-full overflow-hidden">
                        <div className="bg-[var(--flow)] h-full" style={{ width: `${s.ok}%` }} />
                      </div>
                      <span className="mono text-[11px]">{s.ok}%</span>
                    </div>
                  </td>
                  <td className="p-2 mono muted">{s.v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'org' && (
        <div className="card pad flex flex-col gap-6">
          <div className="sec-title">
            <TvIcon name="net" size={18} className="text-[#B7F34A]" />
            <h3>Organograma Operacional da TAVIR</h3>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="card pad border-[#B7F34A] text-center w-64">
              <span className="eyebrow text-[#B7F34A]">Liderança Executiva</span>
              <h3 className="text-[16px] font-bold">Carlos — CEO</h3>
              <small className="muted">Decisões soberanas e gates finais</small>
            </div>

            <div style={{ width: 2, height: 24, background: 'var(--lime)' }} />

            <div className="card pad border-[#1BC5BD] text-center w-64">
              <span className="eyebrow text-[#1BC5BD]">Orquestração</span>
              <h3 className="text-[16px] font-bold">Paula PM</h3>
              <small className="muted">Triagem, pautas e alocação de jobs</small>
            </div>

            <div style={{ width: 2, height: 24, background: 'var(--flow)' }} />

            <div className="grid grid-cols-5 gap-4 w-full">
              {[
                { sec: 'Engenharia', lead: 'Théo Tech Lead', team: 'Vitor Construtor, Davi DevOps' },
                { sec: 'Design & UX', lead: 'Yuri UX', team: 'Marina Marca' },
                { sec: 'Conteúdo', lead: 'Oráculo Diretor', team: 'Adriano Arte, Rita Revisora' },
                { sec: 'Comercial', lead: 'Dora Descoberta', team: 'Cléber Closer, Fábio Finanças' },
                { sec: 'Qualidade', lead: 'Edna E2E', team: 'Atlas Web, Jussara Jurídico' }
              ].map((s) => (
                <div key={s.sec} className="card pad text-center">
                  <span className="eyebrow">{s.sec}</span>
                  <strong className="block text-[14px] mt-1">{s.lead}</strong>
                  <p className="muted text-[11px] mt-1">{s.team}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
