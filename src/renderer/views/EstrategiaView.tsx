import React, { useState } from 'react';
import { TvIcon } from '../components/TvIcon';

interface EstrategiaViewProps {
  onOpenModal?: (name: string, data?: any) => void;
  onNavigate?: (screen: string, extra?: any) => void;
  initialTab?: 'mission' | 'roadmap' | 'mapa';
}

export const EstrategiaView: React.FC<EstrategiaViewProps> = ({ onOpenModal, onNavigate, initialTab = 'mission' }) => {
  const [tab, setTab] = useState<'mission' | 'roadmap' | 'mapa'>(initialTab);

  const roadmapFrentes = [
    {
      id: 'f1',
      num: '01',
      title: 'Temporada 2 do Canal Multiverso',
      status: 'Em andamento',
      cls: 'flow',
      desc: '12 episódios com carrosséis e reels de alta densidade investigativa.',
      who: 'Oráculo Diretor & Adriano Arte',
      prog: 65
    },
    {
      id: 'f2',
      num: '02',
      title: 'Livro Guia do Método TAVIR',
      status: 'Aguardando Aprovação (Gate ap-01)',
      cls: 'warn',
      desc: 'Livro formalizando os 5 estágios de esteiras com IA para infoprodutores.',
      who: 'Elisa Escritora & Otto Estruturador',
      prog: 20
    },
    {
      id: 'f3',
      num: '03',
      title: 'Curso & Mentoria Sala de Operação',
      status: 'Planejado',
      cls: '',
      desc: 'Formação prática para engenheiros operarem frotas autônomas locais.',
      who: 'Paula PM & Carlos CEO',
      prog: 5
    }
  ];

  return (
    <div className="page" style={{ maxWidth: '1520px', gap: '20px', paddingBottom: '80px' }}>
      <div className="phead">
        <div>
          <span className="eyebrow">Domínio de Estratégia</span>
          <h1 style={{ marginTop: '8px' }}>
            {tab === 'mission' && 'Mission Control'}
            {tab === 'roadmap' && 'Roadmap Q4 2026'}
            {tab === 'mapa' && 'Mapa Operacional da Frota'}
          </h1>
          <p>
            {tab === 'mission' && 'Diretrizes mestras, prioridades de trimestre e metas executivas.'}
            {tab === 'roadmap' && 'As 3 frentes de tração: canal, livro metodológico e mentoria executiva.'}
            {tab === 'mapa' && 'Topologia de dados e fluxo de trabalho entre os 5 módulos da TAVIR.'}
          </p>
        </div>
      </div>

      <div className="tabs">
        {[
          { id: 'mission', label: 'Mission Control' },
          { id: 'roadmap', label: 'Roadmap Q4' },
          { id: 'mapa', label: 'Mapa Operacional' }
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

      {tab === 'mission' && (
        <div className="flex flex-col gap-4">
          <section className="ink p-6 rounded-2xl flex flex-col gap-3" style={{ background: 'var(--surface-ink)' }}>
            <span className="eyebrow text-[#B7F34A]">Missão Operacional 2026</span>
            <h2 className="text-[26px] font-semibold text-[#F4F6F2]">
              Orquestração Soberana Local-First para Serviços e Software
            </h2>
            <p className="text-[14px] text-[#cbd3de] max-w-[800px] leading-relaxed">
              Consolidar o escritório da TAVIR como a máquina definitiva de entrega: onde 57 agentes atuam em esteiras atômicas fechadas com checkpoints de QA rigorosos, mantendo o controle financeiro sob tetos estritos e soberania de dados nesta máquina.
            </p>
          </section>

          <div className="g3">
            <div className="card pad">
              <span className="eyebrow text-[#1BC5BD]">Meta 1 · Financeira</span>
              <h3 className="text-[16px] font-semibold mt-1">Margem Líquida &gt; 70%</h3>
              <p className="muted text-[13px] mt-1">Garantir que os custos com API não ultrapassem 15% do ticket faturado em cada contrato.</p>
            </div>
            <div className="card pad">
              <span className="eyebrow text-[#B7F34A]">Meta 2 · Engenharia</span>
              <h3 className="text-[16px] font-semibold mt-1">Fidelidade Milimétrica</h3>
              <p className="muted text-[13px] mt-1">100% de aderência visual aos tokens TAVIR com isolamento completo de worktrees.</p>
            </div>
            <div className="card pad">
              <span className="eyebrow text-[#1BC5BD]">Meta 3 · Operação</span>
              <h3 className="text-[16px] font-semibold mt-1">Zero Entregas sem Gate</h3>
              <p className="muted text-[13px] mt-1">Toda ação irreversível (deploy, contra-assinatura, publicação) para obrigatoriamente no humano.</p>
            </div>
          </div>
        </div>
      )}

      {tab === 'roadmap' && (
        <div className="flex flex-col gap-4">
          <div className="card pad bg-[#0f1729] border border-[var(--warning)] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="badge warn">GATE ABERTO</span>
                <strong className="text-[15px]">Priorização do Roadmap Q4 pede decisão</strong>
              </div>
              <p className="muted text-[13px]">O livro guia do método sobe para a primeira frente devido à demanda do público.</p>
            </div>
            <button
              className="btn primary sm"
              onClick={() => onNavigate?.('decisions', { approvalId: 'ap-01' })}
            >
              Ver e Decidir em Gate ap-01
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {roadmapFrentes.map((f) => (
              <div key={f.id} className="card pad flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="num text-[18px] text-[#B7F34A]">Frente {f.num}</span>
                    <strong className="text-[16px]">{f.title}</strong>
                  </div>
                  <span className={`badge ${f.cls}`}>{f.status}</span>
                </div>
                <p className="muted text-[13px]">{f.desc}</p>
                <div className="flex items-center justify-between pt-3 border-t border-[var(--line)] text-[12px]">
                  <span className="muted">Líderes: <b>{f.who}</b></span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-[var(--surface-3)] h-2 rounded-full overflow-hidden">
                      <div className="bg-[var(--flow)] h-full" style={{ width: `${f.prog}%` }} />
                    </div>
                    <span className="num font-semibold">{f.prog}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'mapa' && (
        <div className="card pad flex flex-col gap-4">
          <div className="sec-title">
            <TvIcon name="map" size={18} className="text-[#1BC5BD]" />
            <h3>Mapa Operacional do Fluxo de Valor</h3>
          </div>
          <div className="grid grid-cols-5 gap-3 text-center">
            {[
              { mod: 'Raio-X', lead: 'Diagnóstico & Evidência', next: 'Gera proposta' },
              { mod: 'Comercial', lead: 'Proposta & Contrato', next: 'Abre esteira' },
              { mod: 'Fábrica / Studio', lead: 'Construção & QA', next: 'Pede validação' },
              { mod: 'Decisões', lead: 'Gate Humano Soberano', next: 'Libera deploy' },
              { mod: 'Entrega & Ledger', lead: 'Deploy & Registro', next: 'Concluído' }
            ].map((p, idx) => (
              <div key={p.mod} className="card pad flex flex-col justify-between min-h-[140px]">
                <span className="badge flow">0{idx + 1}</span>
                <strong className="text-[15px] my-1">{p.mod}</strong>
                <p className="muted text-[11px]">{p.lead}</p>
                <span className="mono text-[10px] text-[#B7F34A] mt-2">{p.next} →</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
