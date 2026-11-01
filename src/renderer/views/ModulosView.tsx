import React, { useState } from 'react';
import { TvIcon } from '../components/TvIcon';

interface ModulosViewProps {
  onOpenModal?: (name: string, data?: any) => void;
  onNavigate?: (screen: string, extra?: any) => void;
}

export const ModulosView: React.FC<ModulosViewProps> = ({ onOpenModal, onNavigate }) => {
  const [activeStep, setActiveStep] = useState<number>(0);

  const journey = [
    { n: '01', label: 'Encontrar', text: 'Ler a presença do cliente antes de prometer qualquer venda.', mods: [{ label: 'Raio-X', go: 'raiox' }] },
    { n: '02', label: 'Conversar', text: 'Produzir conteúdo editorial de autoridade em carrosséis e vídeos.', mods: [{ label: 'Studio', go: 'studio' }, { label: 'Edição', go: 'edicao' }] },
    { n: '03', label: 'Vender', text: 'Transformar diagnóstico em propostas e contratos com meta e condição.', mods: [{ label: 'Comercial', go: 'funil' }] },
    { n: '04', label: 'Entregar', text: 'Construir landings e sistemas sob esteiras atômicas com Completion Guard.', mods: [{ label: 'Fábrica', go: 'fabrica' }] },
    { n: '05', label: 'Medir', text: 'Acompanhar telemetria de saúde, custos e automações integradas.', mods: [{ label: 'Flow', go: 'flow' }, { label: 'Sistema', go: 'analytics' }] }
  ];

  const currentJourney = journey[activeStep] || journey[0];

  const modules = [
    {
      id: 'raiox',
      name: 'Raio-X',
      badge: 'Fase 0',
      bcls: 'flow',
      what: 'Diagnóstico rápido e classificação epistemológica de evidências.',
      now: 'Loja da Rua · Diagnóstico',
      stage: 'Etapa 2 de 6 · Coleta',
      icon: 'search',
      nums: [{ v: '48', k: 'casos' }, { v: '56%', k: 'confiança' }, { v: '3 d', k: 'tempo' }],
      team: ['DD', 'AN'],
      actLabel: 'Novo caso',
      act: () => onOpenModal?.('raiox-new'),
      go: () => onNavigate?.('raiox')
    },
    {
      id: 'studio',
      name: 'Studio',
      badge: 'Ativo',
      bcls: 'flow',
      what: 'Produção editorial com o Oráculo e prova de carrossel 4:5 e reel.',
      now: 'Multiverso · Episódio 14',
      stage: 'Etapa 4 de 7 · Arte',
      icon: 'spark',
      nums: [{ v: '14', k: 'peças' }, { v: '42k', k: 'alcance' }, { v: 'US$ 1,2', k: 'médio' }],
      team: ['OD', 'AA', 'RR'],
      actLabel: 'Nova produção',
      act: () => onOpenModal?.('production'),
      go: () => onNavigate?.('studio')
    },
    {
      id: 'fabrica',
      name: 'Fábrica',
      badge: 'Ativo',
      bcls: 'warn',
      what: 'Construção de software e landings em 9 etapas com QA de código.',
      now: 'Meridian · Landing Institucional',
      stage: 'Etapa 6 de 9 · QA E2E',
      icon: 'factory',
      nums: [{ v: '3', k: 'esteiras' }, { v: '4,2 d', k: 'lead time' }, { v: '1', k: 'no gate' }],
      team: ['PP', 'VC', 'EE', 'DD'],
      actLabel: 'Nova esteira',
      act: () => onOpenModal?.('factory-new'),
      go: () => onNavigate?.('fabrica')
    },
    {
      id: 'flow',
      name: 'Flow',
      badge: 'Beta',
      bcls: '',
      what: 'Orquestração de esteiras cruzadas, webhooks e sincronização de dados.',
      now: 'Sincronização de Leads e Webhooks',
      stage: 'Em loop contínuo',
      icon: 'flow',
      nums: [{ v: '8', k: 'fluxos' }, { v: '1.4k', k: 'eventos' }, { v: '99.9%', k: 'uptime' }],
      team: ['TT', 'AW'],
      actLabel: 'Configurar',
      act: () => onNavigate?.('config'),
      go: () => onNavigate?.('flow')
    },
    {
      id: 'edicao',
      name: 'Edição',
      badge: 'Beta',
      bcls: '',
      what: 'Corte e finalização automática de reels com legendas sincronizadas.',
      now: 'Corte Reels Multiverso Ep. 13',
      stage: 'Renderização local',
      icon: 'film',
      nums: [{ v: '6', k: 'vídeos' }, { v: '1080p', k: 'saída' }, { v: '40s', k: 'duração' }],
      team: ['AA'],
      actLabel: 'Novo vídeo',
      act: () => onNavigate?.('studio'),
      go: () => onNavigate?.('edicao')
    }
  ];

  return (
    <div className="page" style={{ maxWidth: '1520px', gap: '20px', paddingBottom: '80px' }}>
      <div className="phead">
        <div>
          <span className="eyebrow">Módulos · 5 Linhas de Produção</span>
          <h1 style={{ marginTop: '8px' }}>Do Diagnóstico à Entrega</h1>
          <p>Cada módulo tem esteira própria, gates humanos soberanos e livro-razão auditável registrado em SQLite.</p>
        </div>
      </div>

      {/* Jornada Interativa */}
      <section className="ink p-6 rounded-2xl flex flex-col gap-4" style={{ background: 'var(--surface-ink)' }}>
        <div className="flex items-center justify-between">
          <span className="eyebrow text-[#B7F34A]">Jornada de Ponta a Ponta</span>
          <span className="muted text-[12px]">Clique numa etapa para filtrar</span>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {journey.map((j, i) => (
            <button
              key={j.n}
              onClick={() => setActiveStep(i)}
              className={`card pad text-center click border transition-all ${
                activeStep === i ? 'border-[#B7F34A] bg-[var(--surface-3)]' : 'border-[var(--on-ink-line)] bg-transparent'
              }`}
            >
              <span className="mono text-[12px] text-[#1BC5BD] block mb-1">{j.n}</span>
              <strong className="text-[14px] text-[#F4F6F2] block">{j.label}</strong>
            </button>
          ))}
        </div>

        <div className="card pad bg-[#070d18] border-[var(--on-ink-line)] flex items-center justify-between">
          <div>
            <span className="eyebrow text-[10px] text-[#1BC5BD]">{currentJourney.label}</span>
            <p className="text-[13px] text-[#cbd3de] mt-1">{currentJourney.text}</p>
          </div>
          <div className="flex gap-2">
            {currentJourney.mods.map((m) => (
              <button
                key={m.label}
                className="btn primary sm"
                onClick={() => onNavigate?.(m.go)}
              >
                Abrir {m.label} →
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Cards dos Módulos */}
      <div className="g3">
        {modules.map((m) => (
          <article key={m.id} className="card pad flex flex-col justify-between min-h-[320px]">
            <div>
              <div className="flex items-start gap-3 mb-3">
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--surface-3)', display: 'grid', placeItems: 'center', color: 'var(--lime)' }}>
                  <TvIcon name={m.icon} size={22} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[18px] font-semibold">{m.name}</h2>
                    <span className={`badge ${m.bcls}`}>{m.badge}</span>
                  </div>
                  <p className="muted text-[12px] mt-1 leading-snug">{m.what}</p>
                </div>
              </div>

              <div className="card pad bg-[var(--surface-3)] my-2">
                <span className="eyebrow text-[10px]">Em Produção</span>
                <strong className="block text-[13px] mt-0.5">{m.now}</strong>
                <span className="muted text-[11px]">{m.stage}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2">
                {m.nums.map((n) => (
                  <div key={n.k}>
                    <div className="num text-[18px]">{n.v}</div>
                    <span className="muted text-[10px]">{n.k}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[var(--line)]">
              <div className="flex items-center gap-1">
                {m.team.map((t) => (
                  <span
                    key={t}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: 'var(--surface-3)',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 9,
                      fontWeight: 700
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button className="btn sm ghost" onClick={m.act}>{m.actLabel}</button>
                <button className="btn sm secondary" onClick={m.go}>Abrir</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
