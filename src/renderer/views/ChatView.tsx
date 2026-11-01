import React, { useState } from 'react';
import { TvIcon } from '../components/TvIcon';

interface ChatViewProps {
  onOpenModal?: (name: string, data?: any) => void;
  onNavigate?: (screen: string, extra?: any) => void;
  chatId?: string;
}

export const ChatView: React.FC<ChatViewProps> = ({ onOpenModal, onNavigate, chatId = 'cv-paula' }) => {
  const [activeChat, setActiveChat] = useState<string>(chatId);
  const [inputVal, setInputVal] = useState<string>('');
  const [typing, setTyping] = useState<boolean>(false);

  const [chats, setChats] = useState<Record<string, any>>({
    'cv-paula': {
      agent: 'Paula PM',
      ini: 'PP',
      role: 'Orquestradora & Planejamento',
      model: 'claude-opus-4',
      title: 'Planejar o Q4',
      time: '14:12',
      busy: true,
      messages: [
        { role: 'user', text: 'Paula, o que está travado agora na sala?' },
        { role: 'agent', text: 'Dois gates humanos: o deploy da Meridian (variável ausente no cofre) e a priorização do roadmap de IA Livros. O carrossel do Multiverso segue sem bloqueio.' }
      ]
    },
    'cv-yuri': {
      agent: 'Yuri UX',
      ini: 'YU',
      role: 'UX Research & Prova Visual',
      model: 'claude-sonnet-4',
      title: 'Prova visual da LP',
      time: '11:40',
      busy: true,
      messages: [
        { role: 'agent', text: 'A hero da landing ainda compete com o menu em viewports mobile (390px). Sugiro ajuste fino antes de liberar a construção.' }
      ]
    },
    'cv-dora': {
      agent: 'Dora Descoberta',
      ini: 'DD',
      role: 'Gate 0 & Intake Descoberta',
      model: 'claude-sonnet-4',
      title: 'Intake da oferta local',
      time: 'Ontem',
      busy: false,
      messages: [
        { role: 'user', text: 'Abre um raio-x de presença local para a Loja da Rua.' },
        { role: 'agent', text: 'Caso aberto em Fronteira. Próximo passo é a coleta: site, Instagram, Google Maps e opinião de clientes.' }
      ]
    }
  });

  const currentChat = chats[activeChat] || chats['cv-paula'];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const text = inputVal.trim();
    setInputVal('');
    setTyping(true);

    // Adiciona msg do usuário
    setChats((prev) => ({
      ...prev,
      [activeChat]: {
        ...prev[activeChat],
        messages: [...prev[activeChat].messages, { role: 'user', text }]
      }
    }));

    // Simula resposta contextual
    setTimeout(() => {
      let reply = 'Recebido. Registrei essa diretriz no livro-razão local e avisei os agentes da esteira correspondente.';
      const low = text.toLowerCase();
      if (low.includes('trav') || low.includes('bloq')) {
        reply = 'No momento, o único bloqueio ativo é a variável de ambiente SUPABASE_URL da Meridian Capital. As demais esteiras estão avançando.';
      } else if (low.includes('resumo') || low.includes('dia')) {
        reply = 'Resumo executivo: 2 jobs rodando, 1 gate pendente de decisão, custo acumulado hoje em US$ 8,40 (dentro do teto de US$ 12,00).';
      }

      setChats((prev) => ({
        ...prev,
        [activeChat]: {
          ...prev[activeChat],
          messages: [...prev[activeChat].messages, { role: 'agent', text: reply }]
        }
      }));
      setTyping(false);
    }, 1200);
  };

  return (
    <div className="page" style={{ maxWidth: '1520px', height: 'calc(100vh - 120px)', padding: 0 }}>
      <div className="split" style={{ height: '100%' }}>
        {/* LADO ESQUERDO: LISTA DE CONVERSAS */}
        <aside className="split-side p-4 flex flex-col gap-3" style={{ flex: '0 0 320px' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold">Conversas com Agentes</h2>
            <button className="btn sm secondary" onClick={() => onOpenModal?.('pick')}>
              Novo Chat
            </button>
          </div>

          <div className="flex flex-col gap-2 overflow-auto">
            {Object.keys(chats).map((cid) => {
              const c = chats[cid];
              const isSel = cid === activeChat;
              const lastMsg = c.messages.length ? c.messages[c.messages.length - 1].text : 'Sem mensagens';

              return (
                <div
                  key={cid}
                  onClick={() => setActiveChat(cid)}
                  className={`card pad click border ${
                    isSel ? 'border-[#B7F34A] bg-[var(--surface-3)]' : 'border-[var(--line)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <strong className="text-[13px]">{c.agent}</strong>
                    <span className="mono text-[11px] muted">{c.time}</span>
                  </div>
                  <div className="muted text-[11px] mb-1">{c.role}</div>
                  <p className="text-[12px] text-[#cbd3de] line-clamp-1">{lastMsg}</p>
                </div>
              );
            })}
          </div>
        </aside>

        {/* LADO DIREITO: CHAT ATIVO */}
        <div className="split-main p-6 flex flex-col justify-between" style={{ height: '100%' }}>
          {/* Header da Conversa */}
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
            <div className="flex items-center gap-3">
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  background: 'var(--surface-3)',
                  color: 'var(--lime)',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 700,
                  fontSize: 12
                }}
              >
                {currentChat.ini}
              </div>
              <div>
                <strong className="text-[16px] block">{currentChat.agent}</strong>
                <span className="muted text-[12px]">{currentChat.role} · Modelo: {currentChat.model}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="btn sm ghost" onClick={() => onOpenModal?.('chat-settings')}>
                <TvIcon name="sliders" size={16} /> Ajustes
              </button>
            </div>
          </div>

          {/* Mensagens com Scroll */}
          <div className="flex-1 overflow-auto py-6 flex flex-col gap-4">
            {currentChat.messages.map((m: any, idx: number) => {
              const isMe = m.role === 'user';
              return (
                <div
                  key={idx}
                  className={`flex flex-col max-w-[80%] ${
                    isMe ? 'self-end items-end' : 'self-start items-start'
                  }`}
                >
                  <span className="mono text-[10px] muted mb-1">
                    {isMe ? 'Carlos CEO' : currentChat.agent}
                  </span>
                  <div
                    className={`p-3.5 rounded-2xl text-[14px] leading-relaxed ${
                      isMe
                        ? 'bg-[var(--action-bg)] text-[var(--action-fg)]'
                        : 'bg-[var(--surface-3)] text-[#F4F6F2] border border-[var(--line)]'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}
            {typing && (
              <div className="self-start text-[12px] muted italic flex items-center gap-2">
                <span className="live-dot" /> {currentChat.agent} está digitando...
              </div>
            )}
          </div>

          {/* Sugestões Rápidas */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {['O que está travado na sala?', 'Resumo executivo do dia', 'Qual o próximo gate?'].map((sug) => (
              <button
                key={sug}
                className="badge hover:border-[#B7F34A] cursor-pointer transition-all whitespace-nowrap"
                onClick={() => setInputVal(sug)}
              >
                {sug}
              </button>
            ))}
          </div>

          {/* Input de Envio */}
          <form onSubmit={handleSend} className="flex items-center gap-3">
            <input
              type="text"
              className="input flex-1"
              placeholder={`Mandar mensagem para ${currentChat.agent}...`}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
            />
            <button type="submit" className="btn primary" disabled={!inputVal.trim()}>
              <TvIcon name="send" size={16} /> Enviar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
