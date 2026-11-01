import React, { useState } from 'react';
import { TvIcon } from '../components/TvIcon';

interface RaioXViewProps {
  onOpenModal?: (name: string, data?: any) => void;
  onNavigate?: (screen: string, extra?: any) => void;
}

export const RaioXView: React.FC<RaioXViewProps> = ({ onOpenModal, onNavigate }) => {
  const [selectedCase, setSelectedCase] = useState<string | null>('loja-da-rua');
  const [caseFilter, setCaseFilter] = useState<string>('all');
  const [activeStage, setActiveStage] = useState<number>(1); // Coleta

  const cases = [
    {
      id: 'loja-da-rua',
      name: 'Loja da Rua',
      stage: 'Etapa 2 · Coleta',
      orig: 'Amigo',
      state: 'em leitura',
      cls: 'flow',
      desc: 'Loja física de roupas no centro. O dono quer vender mais pelo Instagram e responder o WhatsApp mais rápido.',
      score: 48,
      scoreColor: '#f59e0b',
      seg: 'Negócio local',
      conf: 'Média (56%)',
      next: 'Coleta de evidências',
      segs: [1, 2, 0, 0, 0, 0]
    },
    {
      id: 'meridian',
      name: 'Meridian Capital',
      stage: 'Etapa 5 · Fechado',
      orig: 'Indicação',
      state: 'contrato assinado',
      cls: 'flow',
      desc: 'Gestora de patrimônio private. Precisava de landing institucional de alta autoridade.',
      score: 82,
      scoreColor: '#1BC5BD',
      seg: 'Finanças / B2B',
      conf: 'Alta (92%)',
      next: 'Entrou na Fábrica',
      segs: [1, 1, 1, 1, 1, 1]
    },
    {
      id: 'clinica-vitta',
      name: 'Clínica Vitta',
      stage: 'Etapa 1 · Fronteira',
      orig: 'Formulário',
      state: 'novo intake',
      cls: 'warn',
      desc: 'Clínica de odontologia estética com 3 unidades. Gargalo em agendamento de consultas particulares.',
      score: 34,
      scoreColor: '#ef4444',
      seg: 'Saúde',
      conf: 'Baixa (28%)',
      next: 'Varredura de presença',
      segs: [2, 0, 0, 0, 0, 0]
    }
  ];

  const journeyScores = [
    { k: 'Encontrar', v: 72, color: 'var(--flow)', delay: 0 },
    { k: 'Conversar', v: 54, color: 'var(--warning)', delay: 100 },
    { k: 'Vender', v: 28, color: 'var(--danger)', delay: 200 },
    { k: 'Entregar', v: 80, color: 'var(--flow)', delay: 300 },
    { k: 'Medir', v: 0, color: 'var(--line)', delay: 400 }
  ];

  const evidences = [
    {
      source: 'Google Maps / Perfil de Empresa',
      kind: 'Observado',
      badgeCls: 'flow',
      desc: '142 avaliações no Google Maps (nota 4.7). Horário de funcionamento atualizado há 2 semanas.',
      who: 'Dora Descoberta'
    },
    {
      source: 'Instagram Oficial',
      kind: 'Observado',
      badgeCls: 'flow',
      desc: 'Bio sem link para WhatsApp ou catálogo. Último post há 4 dias.',
      who: 'Dora Descoberta'
    },
    {
      source: 'Entrevista do Dono',
      kind: 'Informado',
      badgeCls: 'warn',
      desc: 'Afirma que perde cerca de 10 clientes por semana por demora nas respostas de WhatsApp.',
      who: 'Carlos CEO'
    },
    {
      source: 'Estimativa de Tráfego',
      kind: 'Inferido',
      badgeCls: 'warn',
      desc: 'Estimativa de 800 a 1.200 pedestres/dia em frente à fachada com base em dados de fluxo do comércio.',
      who: 'Arquiteto de Nicho'
    },
    {
      source: 'Taxa de Retenção de Clientes',
      kind: 'Indisponível',
      badgeCls: 'danger',
      desc: 'A loja não possui cadastro unificado nem CRM. Vendas no balcão não registram telefone.',
      who: 'Dora Descoberta'
    }
  ];

  return (
    <div className="page" style={{ maxWidth: '1520px', gap: '20px', paddingBottom: '80px' }}>
      {selectedCase ? (
        /* VISÃO DETALHADA DO CASO */
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <button className="link cursor-pointer" onClick={() => setSelectedCase(null)}>
              ← Todos os casos
            </button>
            <span className="muted">/</span>
            <strong className="text-[14px]">Loja da Rua</strong>
          </div>

          <div className="phead">
            <div>
              <span className="eyebrow">Caso #01 · Diagnóstico · Negócio Local</span>
              <h1 style={{ marginTop: '6px' }}>Loja da Rua — Presença e Conversão</h1>
              <p>Loja de roupas no centro. Diagnóstico completo de jornada de compra para estruturação de oferta de presença local.</p>
            </div>
            <div className="actions flex items-center gap-2">
              <button className="btn secondary" onClick={() => onOpenModal?.('evidence')}>
                Ver Evidências
              </button>
              <button className="btn primary" onClick={() => onOpenModal?.('raiox-offer')}>
                Registrar Oferta
              </button>
            </div>
          </div>

          {/* Stepper das 6 Etapas do Raio-X */}
          <div className="card pad flex items-center justify-between overflow-x-auto">
            {['Fronteira', 'Coleta', 'Diagnóstico', 'Oferta', 'Devolutiva', 'Fechar'].map((s, i) => (
              <button
                key={s}
                onClick={() => setActiveStage(i)}
                className="flex flex-col items-center gap-1 bg-transparent border-0 cursor-pointer min-w-[100px]"
              >
                <span className="mono text-[10px] muted">0{i + 1}</span>
                <strong className={`text-[13px] ${activeStage === i ? 'text-[#B7F34A]' : activeStage > i ? 'text-[#1BC5BD]' : 'text-muted'}`}>
                  {s}
                </strong>
                <div
                  style={{
                    width: '100%',
                    height: 3,
                    borderRadius: 2,
                    background: activeStage === i ? 'var(--lime)' : activeStage > i ? 'var(--flow)' : 'var(--line)'
                  }}
                />
              </button>
            ))}
          </div>

          {/* Bloco de Score e Confiança */}
          <div className="grid grid-cols-12 gap-6 items-stretch">
            <section className="col-span-12 lg:col-span-8 ink p-6 rounded-2xl flex flex-col gap-4" style={{ background: 'var(--surface-ink)' }}>
              <div className="flex items-center justify-between">
                <span className="eyebrow text-[#B7F34A]">Nota por Etapa da Jornada do Cliente</span>
                <span className="mono text-[11px] muted">Escala 0 a 100</span>
              </div>

              <div className="flex flex-col gap-3 my-auto">
                {journeyScores.map((j) => (
                  <div key={j.k} className="grid grid-cols-12 gap-3 items-center text-[13px]">
                    <span className="col-span-3 text-[#F4F6F2] font-semibold">{j.k}</span>
                    <div className="col-span-7 bg-[var(--surface-3)] h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${j.v}%`, background: j.color }}
                      />
                    </div>
                    <span className="col-span-2 text-right num text-[#F4F6F2]">{j.v}</span>
                  </div>
                ))}
              </div>

              <div className="muted text-[13px] pt-3 border-t border-[var(--line)]">
                O cliente é encontrado no Google Maps, mas perde gente em <b>Vender</b>: ausência de catálogo no Instagram e atraso grave no WhatsApp.
              </div>
            </section>

            <section className="col-span-12 lg:col-span-4 card pad flex flex-col justify-between">
              <div>
                <span className="eyebrow">Confiança Epistemológica</span>
                <div className="flex items-center gap-4 my-4">
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      background: 'conic-gradient(var(--flow) 0 56%, var(--line) 0)',
                      display: 'grid',
                      placeItems: 'center'
                    }}
                  >
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--surface-2)', display: 'grid', placeItems: 'center' }}>
                      <span className="num text-[16px]">56%</span>
                    </div>
                  </div>
                  <div>
                    <strong className="text-[16px] block">Média</strong>
                    <span className="muted text-[12px]">4 de 7 fatos observados com prova física.</span>
                  </div>
                </div>
              </div>

              <div className="card pad bg-[var(--surface-3)] border-[var(--flow-subtle-line)]">
                <span className="eyebrow text-[10px]">Recomendação da Dora</span>
                <strong className="text-[13px] block my-1">Oferta de Presença Local</strong>
                <p className="text-[12px] muted">Google Meu Negócio + Catálogo WhatsApp Business + Automação de triagem.</p>
              </div>
            </section>
          </div>

          {/* Ledger de Evidências */}
          <section className="card pad">
            <div className="sec-title mb-4">
              <TvIcon name="search" size={18} className="text-[#1BC5BD]" />
              <h3>Evidências Coletadas ({evidences.length})</h3>
            </div>

            <div className="flex flex-col gap-3">
              {evidences.map((e, idx) => (
                <div key={idx} className="card pad flex items-start justify-between">
                  <div style={{ maxWidth: '80%' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge ${e.badgeCls}`}>{e.kind.toUpperCase()}</span>
                      <strong className="text-[14px]">{e.source}</strong>
                    </div>
                    <p className="text-[13px] text-[#cbd3de]">{e.desc}</p>
                  </div>
                  <span className="mono text-[11px] muted">{e.who}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        /* LISTA GERAL DE CASOS */
        <>
          <div className="phead">
            <div>
              <span className="eyebrow">Módulo · Encontrar</span>
              <h1 style={{ marginTop: '8px' }}>Raio-X de Presença e Mercado</h1>
              <p>Leitura profunda de presença digital, conversão e gaps de atendimento antes da proposta comercial.</p>
            </div>
            <div className="actions">
              <button className="btn primary" onClick={() => onOpenModal?.('raiox-new')}>
                <TvIcon name="plus" size={16} /> Novo caso
              </button>
            </div>
          </div>

          <div className="g3">
            <div className="card pad">
              <div className="eyebrow text-[#1BC5BD]">01 · Estudo Rápido</div>
              <strong className="block text-[15px] my-1">Presença e 1ª Impressão</strong>
              <small className="muted">Prazo: 1 dia · Análise de Maps, bio e links</small>
            </div>
            <div className="card pad">
              <div className="eyebrow text-[#B7F34A]">02 · Diagnóstico</div>
              <strong className="block text-[15px] my-1">Jornada com Evidências</strong>
              <small className="muted">Prazo: 3 dias · Prova dos 5 estágios da jornada</small>
            </div>
            <div className="card pad">
              <div className="eyebrow text-[#1BC5BD]">03 · Completo</div>
              <strong className="block text-[15px] my-1">Diagnóstico + Concorrentes + Oferta</strong>
              <small className="muted">Prazo: 7 dias · Pacote completo de entrada</small>
            </div>
          </div>

          <div className="g2">
            {cases.map((c) => (
              <div
                key={c.id}
                className="card pad click flex flex-col justify-between min-h-[220px]"
                onClick={() => setSelectedCase(c.id)}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="eyebrow">{c.stage} · {c.orig}</span>
                    <span className={`badge ${c.cls}`}>{c.state}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-[18px] font-semibold">{c.name}</h2>
                      <p className="muted text-[13px] mt-1">{c.desc}</p>
                    </div>
                    <div className="text-right">
                      <div className="num text-[24px]" style={{ color: c.scoreColor }}>{c.score}</div>
                      <span className="text-[11px] muted">score / 100</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--line)] flex items-center justify-between text-[12px] muted">
                  <span>{c.seg} · Confiança {c.conf}</span>
                  <span className="text-[#1BC5BD] font-semibold">{c.next} →</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
