import React, { useState } from 'react';
import { TvIcon } from '../components/TvIcon';

interface SocialViewProps {
  onOpenModal?: (name: string, data?: any) => void;
  onNavigate?: (screen: string, extra?: any) => void;
  initialTab?: 'perfis' | 'comms';
}

export const SocialView: React.FC<SocialViewProps> = ({ onOpenModal, onNavigate, initialTab = 'perfis' }) => {
  const [tab, setTab] = useState<'perfis' | 'comms'>(initialTab);

  const inboxMessages = [
    { id: 'm1', from: 'Direct Instagram (@multiversoparanoico)', author: 'Lucas Ferreira', msg: 'Vocês vendem a mentoria de esteiras de conteúdo para agências?', time: 'Hoje 14:10', unread: true },
    { id: 'm2', from: 'Comentário YouTube (Canal TAVIR)', author: 'Marcos Silva', msg: 'Sensacional a explicação do bug C2PA nos SVGs. Salvou meu projeto!', time: 'Ontem 18:30', unread: false },
    { id: 'm3', from: 'InMail LinkedIn', author: 'Renata Rossi', msg: 'Gostaria de agendar um Raio-X para a presença da nossa fintech.', time: 'Ontem 11:20', unread: true }
  ];

  return (
    <div className="page" style={{ maxWidth: '1520px', gap: '20px', paddingBottom: '80px' }}>
      <div className="phead">
        <div>
          <span className="eyebrow">Domínio Social</span>
          <h1 style={{ marginTop: '8px' }}>
            {tab === 'perfis' && 'Perfis & Calendário Editorial'}
            {tab === 'comms' && 'Comunicações & Inbox Unificado'}
          </h1>
          <p>
            {tab === 'perfis' && 'Monitoramento de audiência, programação de carrosséis e reels de todos os canais.'}
            {tab === 'comms' && 'Central de mensagens diretas e comentários com triagem rápida para os agentes.'}
          </p>
        </div>
      </div>

      <div className="tabs">
        {[
          { id: 'perfis', label: 'Perfis e Calendário' },
          { id: 'comms', label: 'Comunicações Inbox (3)' }
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

      {tab === 'perfis' && (
        <div className="flex flex-col gap-4">
          <div className="g3">
            <div className="card pad">
              <div className="flex items-center justify-between mb-2">
                <span className="badge flow">Instagram</span>
                <span className="muted text-[11px]">@multiversoparanoico</span>
              </div>
              <h3 className="text-[18px] font-semibold">Multiverso Paranoico</h3>
              <p className="muted text-[12px] my-1">42.4k seguidores · 3 publicações semanais</p>
              <div className="pt-3 border-t border-[var(--line)] flex justify-between text-[12px]">
                <span className="text-[#1BC5BD]">Próximo: Ep. 14 (Hoje 18:00)</span>
                <button className="link" onClick={() => onNavigate?.('studio')}>Ver no Studio →</button>
              </div>
            </div>

            <div className="card pad">
              <div className="flex items-center justify-between mb-2">
                <span className="badge">YouTube</span>
                <span className="muted text-[11px]">Canal TAVIR</span>
              </div>
              <h3 className="text-[18px] font-semibold">TAVIR Oficial</h3>
              <p className="muted text-[12px] my-1">18.2k inscritos · Vídeos longos quinzenais</p>
              <div className="pt-3 border-t border-[var(--line)] flex justify-between text-[12px]">
                <span>Próximo: Masterclass Arquitetura</span>
                <button className="link" onClick={() => onNavigate?.('studio')}>Ver no Studio →</button>
              </div>
            </div>

            <div className="card pad">
              <div className="flex items-center justify-between mb-2">
                <span className="badge flow">LinkedIn</span>
                <span className="muted text-[11px]">TAVIR B2B</span>
              </div>
              <h3 className="text-[18px] font-semibold">TAVIR Estratégia</h3>
              <p className="muted text-[12px] my-1">8.4k conexões · Artigos de engenharia e gestão</p>
              <div className="pt-3 border-t border-[var(--line)] flex justify-between text-[12px]">
                <span className="text-[#B7F34A]">Próximo: Artigo Local-First</span>
                <button className="link" onClick={() => onNavigate?.('studio')}>Ver no Studio →</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'comms' && (
        <section className="card pad flex flex-col gap-3">
          <div className="sec-title mb-2">
            <h3>Mensagens & Oportunidades Entrantes</h3>
          </div>
          <div className="flex flex-col gap-3">
            {inboxMessages.map((m) => (
              <div key={m.id} className="card pad flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge flow">{m.from}</span>
                    <strong className="text-[14px]">{m.author}</strong>
                    {m.unread && <span className="badge warn">NOVO</span>}
                  </div>
                  <p className="text-[13px] text-[#cbd3de] mt-1">"{m.msg}"</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="mono text-[11px] muted">{m.time}</span>
                  <button
                    className="btn sm secondary"
                    onClick={() => onNavigate?.('chat')}
                  >
                    Atribuir a Agente
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
