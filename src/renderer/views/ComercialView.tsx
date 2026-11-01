import React, { useState } from 'react';
import { TvIcon } from '../components/TvIcon';

interface ComercialViewProps {
  onOpenModal?: (name: string, data?: any) => void;
  onNavigate?: (screen: string, extra?: any) => void;
  initialTab?: 'funil' | 'propostas' | 'financas' | 'personas';
}

export const ComercialView: React.FC<ComercialViewProps> = ({ onOpenModal, onNavigate, initialTab = 'funil' }) => {
  const [tab, setTab] = useState<'funil' | 'propostas' | 'financas' | 'personas'>(initialTab);
  const [activeProp, setActiveProp] = useState<string>('pro-001');

  const funnels = [
    { k: '01 · Caso Aberto', n: '48 casos', w: 100, conv: '100%', bg: 'var(--surface-3)', fg: '#F4F6F2' },
    { k: '02 · Coleta & Raio-X', n: '32 casos', w: 78, conv: '67%', bg: 'var(--flow-subtle)', fg: 'var(--flow)' },
    { k: '03 · Devolutiva', n: '18 casos', w: 56, conv: '56%', bg: 'var(--flow-subtle)', fg: 'var(--flow)' },
    { k: '04 · Proposta Enviada', n: '11 propostas', w: 38, conv: '61%', bg: 'var(--warning-subtle)', fg: 'var(--warning)' },
    { k: '05 · Contrato Assinado', n: '4 contratos', w: 22, conv: '36%', bg: 'var(--flow)', fg: '#0B1220' }
  ];

  const deals = [
    { c: 'Atlas Holdings', st: 'Aceite pendente', cls: 'warn', v: 'R$ 48.500', o: 'Cléber Closer', n: 'Aguardando contra-assinatura' },
    { c: 'Northwind Digital', st: 'Proposta aberta', cls: 'flow', v: 'R$ 38.000', o: 'Cléber Closer', n: 'Acompanhar com WhatsApp' },
    { c: 'Meridian Capital', st: 'Contrato ativo', cls: 'flow', v: 'R$ 64.100', o: 'Dora Descoberta', n: 'Em execução na Fábrica' }
  ];

  const proposals = [
    {
      id: 'pro-001',
      client: 'Atlas Holdings',
      num: 'PRO-001',
      ver: '1.2',
      value: 'R$ 48.500',
      terms: '3 parcelas de R$ 16.166',
      status: 'Aceita pelo cliente em 27/10 · Aguarda contra-assinatura',
      link: 'propostas.tavir.com.br/atlas-holdings-pro-001',
      short: 'Aceita',
      cls: 'flow',
      tl: [
        { k: 'Elaborada', d: '22/10', done: true },
        { k: 'Enviada', d: '23/10', done: true },
        { k: 'Aberta', d: '24/10', done: true },
        { k: 'Aceita', d: '27/10', done: true },
        { k: 'Contra-assinada', d: 'Pendente', done: false }
      ],
      goal: 'Atingir 3,2% de conversão na landing page em 60 dias após o deploy.',
      cond: 'Entrega em até 18 dias úteis contados a partir da contra-assinatura.',
      resp: 'A TAVIR responde por design, código, infraestrutura e automações.'
    },
    {
      id: 'pro-003',
      client: 'Northwind Digital',
      num: 'PRO-003',
      ver: '1.0',
      value: 'R$ 38.000',
      terms: 'Entrada + 30 e 60 dias',
      status: 'Enviada · Aberta 2 vezes pelo destinatário',
      link: 'propostas.tavir.com.br/northwind-digital-pro-003',
      short: 'Aberta',
      cls: 'warn',
      tl: [
        { k: 'Elaborada', d: '28/10', done: true },
        { k: 'Enviada', d: '29/10', done: true },
        { k: 'Aberta', d: 'Hoje 10:14', done: true },
        { k: 'Aceita', d: '—', done: false },
        { k: 'Contra-assinada', d: '—', done: false }
      ],
      goal: 'Modernização de arquitetura e implementação de agentes de triagem.',
      cond: 'Acesso às credenciais de banco e repositório fornecidos pelo cliente.',
      resp: 'Auditoria e blindagem do cofre de secrets da infraestrutura.'
    }
  ];

  const currentProp = proposals.find((x) => x.id === activeProp) || proposals[0];

  return (
    <div className="page" style={{ maxWidth: '1520px', gap: '20px', paddingBottom: '80px' }}>
      <div className="phead">
        <div>
          <span className="eyebrow">Domínio Comercial</span>
          <h1 style={{ marginTop: '8px' }}>
            {tab === 'funil' && 'Funil de Vendas'}
            {tab === 'propostas' && 'Propostas & Contratos'}
            {tab === 'financas' && 'Finanças & Margem Real'}
            {tab === 'personas' && 'Personas de Decisores'}
          </h1>
          <p>
            {tab === 'funil' && 'Visão macro da jornada comercial, conversão por etapa e negócios vivos.'}
            {tab === 'propostas' && 'Propostas auditáveis com link público, linha do tempo e contra-assinatura.'}
            {tab === 'financas' && 'Receita, consumo de motor por modelo e margem bruta por projeto.'}
            {tab === 'personas' && 'Mapeamento de decisores, gatilhos de dor e objeções frequentes.'}
          </p>
        </div>
        <div className="actions flex items-center gap-2">
          {tab === 'propostas' && (
            <button className="btn primary" onClick={() => onOpenModal?.('proposal-send', currentProp)}>
              <TvIcon name="send" size={16} /> Enviar versão
            </button>
          )}
          {tab === 'funil' && (
            <button className="btn secondary" onClick={() => onNavigate?.('raiox')}>
              Abrir caso no Raio-X
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { id: 'funil', label: 'Funil de Vendas' },
          { id: 'propostas', label: 'Propostas' },
          { id: 'financas', label: 'Finanças' },
          { id: 'personas', label: 'Personas' }
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

      {/* 1. FUNIL */}
      {tab === 'funil' && (
        <div className="flex flex-col gap-4">
          <div className="g4">
            <div className="card pad">
              <span className="eyebrow">Valor em aberto</span>
              <div className="num text-[26px] my-1">R$ 150,6 mil</div>
              <small className="muted">3 propostas vivas</small>
            </div>
            <div className="card pad">
              <span className="eyebrow">Conversão Geral</span>
              <div className="num text-[26px] text-[#1BC5BD] my-1">9,2%</div>
              <small className="muted">Caso aberto → contrato</small>
            </div>
            <div className="card pad">
              <span className="eyebrow">Ciclo médio</span>
              <div className="num text-[26px] my-1">21 dias</div>
              <small className="muted">Do diagnóstico à assinatura</small>
            </div>
            <div className="card pad">
              <span className="eyebrow">Ticket médio</span>
              <div className="num text-[26px] text-[#B7F34A] my-1">R$ 37,7 mil</div>
              <small className="muted">Contratos fechados</small>
            </div>
          </div>

          <section className="card pad flex flex-col gap-3">
            <div className="sec-title mb-2">
              <h3>Funil dos Últimos 90 Dias</h3>
              <div style={{ flex: 1 }} />
              <span className="muted text-[12px]">Calculado via SQLite local</span>
            </div>

            <div className="flex flex-col gap-2">
              {funnels.map((f) => (
                <div key={f.k} className="grid grid-cols-12 gap-3 items-center text-[13px]">
                  <span className="col-span-3 font-semibold">{f.k}</span>
                  <div className="col-span-7 flex justify-center">
                    <div
                      style={{
                        width: `${f.w}%`,
                        height: 38,
                        borderRadius: 8,
                        background: f.bg,
                        display: 'grid',
                        placeItems: 'center'
                      }}
                    >
                      <strong className="text-[13px]" style={{ color: f.fg }}>{f.n}</strong>
                    </div>
                  </div>
                  <span className="col-span-2 text-right mono muted">{f.conv}</span>
                </div>
              ))}
            </div>

            <div className="muted text-[13px] pt-3 border-t border-[var(--line)]">
              Gargalo identificado: Maior perda ocorre entre <b>Devolutiva</b> e <b>Proposta</b> (4 de 12 casos não avançaram).
            </div>
          </section>

          <section className="card pad">
            <div className="sec-title mb-3">
              <h3>Negócios Vivos</h3>
            </div>
            <table className="tbl w-full text-[13px]">
              <thead>
                <tr className="text-left border-b border-[var(--line)]">
                  <th className="p-2">Cliente</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Valor</th>
                  <th className="p-2">Responsável</th>
                  <th className="p-2">Próxima Ação</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((d) => (
                  <tr key={d.c} className="border-b border-[var(--line)] click" onClick={() => setTab('propostas')}>
                    <td className="p-2 font-semibold">{d.c}</td>
                    <td className="p-2"><span className={`badge ${d.cls}`}>{d.st}</span></td>
                    <td className="p-2 num">{d.v}</td>
                    <td className="p-2 muted">{d.o}</td>
                    <td className="p-2 text-[#1BC5BD]">{d.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {/* 2. PROPOSTAS */}
      {tab === 'propostas' && (
        <div className="grid grid-cols-12 gap-6 items-start">
          <aside className="col-span-12 lg:col-span-4 card pad flex flex-col gap-2">
            <span className="eyebrow mb-2">Propostas Vivas</span>
            {proposals.map((p) => (
              <div
                key={p.id}
                onClick={() => setActiveProp(p.id)}
                className={`card pad click border ${
                  activeProp === p.id ? 'border-[#B7F34A] bg-[var(--surface-3)]' : 'border-[var(--line)]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <strong className="text-[14px]">{p.client}</strong>
                  <span className={`badge ${p.cls}`}>{p.short}</span>
                </div>
                <div className="muted text-[12px]">{p.num} · {p.value}</div>
              </div>
            ))}
          </aside>

          <section className="col-span-12 lg:col-span-8 flex flex-col gap-4">
            <div className="ink p-6 rounded-2xl flex flex-col gap-3" style={{ background: 'var(--surface-ink)' }}>
              <div className="flex items-start justify-between">
                <div>
                  <span className="eyebrow text-[#B7F34A]">{currentProp.num} · Versão {currentProp.ver}</span>
                  <h2 className="text-[26px] font-semibold text-[#F4F6F2] mt-1">{currentProp.client}</h2>
                  <p className="muted text-[13px]">{currentProp.status}</p>
                  <div className="mono text-[12px] text-[#1BC5BD] mt-2">{currentProp.link}</div>
                </div>
                <div className="text-right">
                  <div className="eyebrow text-[10px]">Valor do Contrato</div>
                  <div className="num text-[28px] text-[#B7F34A]">{currentProp.value}</div>
                  <small className="muted text-[12px]">{currentProp.terms}</small>
                </div>
              </div>

              {/* Linha do Tempo da Proposta */}
              <div className="grid grid-cols-5 gap-3 pt-4 border-t border-[var(--line)] mt-2">
                {currentProp.tl.map((t, idx) => (
                  <div key={idx} className="flex flex-col gap-1">
                    <div
                      style={{
                        height: 4,
                        borderRadius: 2,
                        background: t.done ? 'var(--flow)' : 'var(--line)'
                      }}
                    />
                    <strong className={`text-[12px] ${t.done ? 'text-[#F4F6F2]' : 'text-muted'}`}>{t.k}</strong>
                    <span className="mono text-[10px] muted">{t.d}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="card pad flex flex-col gap-1">
                <span className="eyebrow text-[10px]">Meta Acordada</span>
                <p className="text-[13px] leading-relaxed">{currentProp.goal}</p>
              </div>
              <div className="card pad flex flex-col gap-1">
                <span className="eyebrow text-[10px]">Condição</span>
                <p className="text-[13px] leading-relaxed">{currentProp.cond}</p>
              </div>
              <div className="card pad flex flex-col gap-1">
                <span className="eyebrow text-[10px]">Responsabilidade</span>
                <p className="text-[13px] leading-relaxed">{currentProp.resp}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                className="btn primary"
                onClick={() => onNavigate?.('decisions', { approvalId: 'ap-05' })}
              >
                Abrir Gate de Contra-Assinatura
              </button>
              <button
                className="btn secondary"
                onClick={() => onOpenModal?.('proposal-send', currentProp)}
              >
                Reenviar Link
              </button>
            </div>
          </section>
        </div>
      )}

      {/* 3. FINANÇAS */}
      {tab === 'financas' && (
        <div className="flex flex-col gap-4">
          <div className="g4">
            <div className="card pad">
              <span className="eyebrow">Receita de Outubro</span>
              <div className="num text-[26px] my-1">R$ 61,2 mil</div>
              <small className="muted">Meridian e parcelas ativas</small>
            </div>
            <div className="card pad">
              <span className="eyebrow">Custo Total de Motores</span>
              <div className="num text-[26px] text-[#f59e0b] my-1">US$ 212</div>
              <small className="muted">≈ R$ 1.170 no mês</small>
            </div>
            <div className="card pad">
              <span className="eyebrow">Margem Bruta Real</span>
              <div className="num text-[26px] text-[#1BC5BD] my-1">74,2%</div>
              <small className="muted">Pós-dedução de IA e servidores</small>
            </div>
            <div className="card pad">
              <span className="eyebrow">A Receber</span>
              <div className="num text-[26px] text-[#B7F34A] my-1">R$ 48,5 mil</div>
              <small className="muted">Atlas após contra-assinatura</small>
            </div>
          </div>

          <section className="card pad">
            <div className="sec-title mb-4">
              <h3>Margem por Projeto no Mês</h3>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { name: 'Meridian Capital', rec: 'R$ 64.100', cost: 'US$ 16,40 (≈ R$ 90)', margin: '88%' },
                { name: 'Atlas Holdings (Previsto)', rec: 'R$ 48.500', cost: 'US$ 22,00 (≈ R$ 120)', margin: '82%' },
                { name: 'Multiverso Paranoico', rec: 'R$ 14.000', cost: 'US$ 8,20 (≈ R$ 45)', margin: '91%' }
              ].map((proj) => (
                <div key={proj.name} className="card pad flex items-center justify-between">
                  <div>
                    <strong className="text-[14px]">{proj.name}</strong>
                    <div className="muted text-[12px]">Receita: {proj.rec} · Custo IA: {proj.cost}</div>
                  </div>
                  <span className="badge flow text-[13px]">{proj.margin} de margem</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* 4. PERSONAS */}
      {tab === 'personas' && (
        <div className="g3">
          {[
            { name: 'Sócio Fundador / CEO', role: 'Decisor Final', pain: 'Não tem tempo a perder com código ou reuniões longas.', trigger: 'Resultado prático com prova e garantia de critério.', objection: '"Já tentamos contratar freelancer e demorou meses."' },
            { name: 'Diretor de Operações (COO)', role: 'Avaliador de Risco', pain: 'Medo de dependência técnica ou soluções que quebram.', trigger: 'Local-first, dados em SQLite e cofre com DPAPI.', objection: '"Onde meus dados e chaves ficam guardados?"' },
            { name: 'Head de Marketing', role: 'Usuário Chave', pain: 'Baixa conversão e demora entre pauta e publicação.', trigger: 'Módulos integrados (Studio e Fábrica com 1 clique).', objection: '"A IA gera conteúdo genérico sem alma."' }
          ].map((per) => (
            <div key={per.name} className="card pad flex flex-col gap-2">
              <span className="badge flow">{per.role}</span>
              <h3 className="text-[16px] font-semibold mt-1">{per.name}</h3>
              <div className="mt-2 text-[13px]">
                <strong className="text-[#f59e0b] block mb-0.5">Maior Dor:</strong>
                <p className="muted">{per.pain}</p>
              </div>
              <div className="mt-2 text-[13px]">
                <strong className="text-[#B7F34A] block mb-0.5">Gatilho de Valor:</strong>
                <p className="muted">{per.trigger}</p>
              </div>
              <div className="mt-2 text-[13px]">
                <strong className="text-muted block mb-0.5">Objeção Típica:</strong>
                <p className="italic text-[#cbd3de]">{per.objection}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
