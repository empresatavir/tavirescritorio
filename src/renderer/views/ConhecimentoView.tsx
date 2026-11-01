import React, { useState } from 'react';
import { TvIcon } from '../components/TvIcon';

interface ConhecimentoViewProps {
  onOpenModal?: (name: string, data?: any) => void;
  onNavigate?: (screen: string, extra?: any) => void;
  initialTab?: 'cerebro' | 'memoria' | 'ideias';
}

export const ConhecimentoView: React.FC<ConhecimentoViewProps> = ({ onOpenModal, onNavigate, initialTab = 'cerebro' }) => {
  const [tab, setTab] = useState<'cerebro' | 'memoria' | 'ideias'>(initialTab);
  const [vaultSearch, setVaultSearch] = useState<string>('');
  const [activeNote, setActiveNote] = useState<string>('nota-1');

  const vaultNotes = [
    {
      id: 'nota-1',
      title: 'Diretrizes Universais de Engenharia & SVGs Limpos',
      tag: 'Engenharia',
      date: '28/10',
      summary: 'Regra estrita C2PA: nenhum SVG pode carregar metadados ou namespaces externos para não romper dimensões.',
      content: `# Diretrizes Universais de Engenharia

1. **Prevenção de Metadados C2PA**:
   - Todo SVG deve conter apenas tags limpas (<svg><path></svg>).
   - O componente TvIcon sanitiza preventivamente e toCssSize converte números em px.

2. **Isolamento de Worktrees**:
   - Cada tarefa executa isolada em .work/wt-<id>/ para não gerar conflito no branch principal.

3. **Cofre Criptografado com DPAPI**:
   - Secrets e API Keys são cifrados com AES-256-GCM sob as credenciais locais do Windows.`
    },
    {
      id: 'nota-2',
      title: 'Mapeamento das 5 Frentes de Monetização da TAVIR',
      tag: 'Estratégia',
      date: '25/10',
      summary: 'Estruturação do portfólio: Raio-X de entrada, Studio recorrente, Fábrica de alta margem e Flow de integração.',
      content: `# 5 Frentes de Monetização

- **Frente 1: Raio-X**: Diagnóstico rápido em 24h a 72h. Serve como gate de entrada.
- **Frente 2: Studio de Conteúdo**: Retainer mensal para produção de carrosséis e reels com o Oráculo.
- **Frente 3: Fábrica de Software**: Landings e sistemas de alta conversão entregues em esteiras com QA.
- **Frente 4: Flow & Automações**: Conexão entre CRMs, webhooks e esteiras locais.`
    },
    {
      id: 'nota-3',
      title: 'Critérios de Corte Editorial para Headlines',
      tag: 'Conteúdo',
      date: '22/10',
      summary: 'Limite máximo de 60 caracteres no slide de capa. Exceções precisam de aprovação formal em Decisões.',
      content: `# Guia de Estilo Editorial

- Limite estrito de 60 caracteres na primeira dobra de carrosséis.
- Cada afirmação histórica deve citar a fonte documental no último frame.
- Tom investigativo sem apelos sensacionalistas.`
    }
  ];

  const ideas = [
    { id: 'i1', title: 'Agente de Transcrição Local via Whisper', author: 'Adriano Arte', status: 'Em Análise', impact: 'Alto' },
    { id: 'i2', title: 'Integração de Notificação WhatsApp no Desktop', author: 'Dora Descoberta', status: 'Aprovada', impact: 'Médio' },
    { id: 'i3', title: 'Pipeline de Benchmark de Custos por Token', author: 'Paula PM', status: 'Planejada', impact: 'Alto' }
  ];

  const currentNoteObj = vaultNotes.find((n) => n.id === activeNote) || vaultNotes[0];
  const filteredNotes = vaultNotes.filter((n) =>
    (n.title + ' ' + n.summary + ' ' + n.tag).toLowerCase().includes(vaultSearch.toLowerCase())
  );

  return (
    <div className="page" style={{ maxWidth: '1520px', gap: '20px', paddingBottom: '80px' }}>
      <div className="phead">
        <div>
          <span className="eyebrow">Domínio de Conhecimento</span>
          <h1 style={{ marginTop: '8px' }}>
            {tab === 'cerebro' && 'Cérebro Operacional'}
            {tab === 'memoria' && 'Biblioteca & Vault (187 Notas)'}
            {tab === 'ideias' && 'Banco de Ideias & Hipóteses'}
          </h1>
          <p>
            {tab === 'cerebro' && 'Grafo de conexões entre agentes, decisões históricas e lições aprendidas.'}
            {tab === 'memoria' && 'Base canônica de conhecimento com busca instantânea indexada localmente.'}
            {tab === 'ideias' && 'Iniciativas sugeridas pelos operadores e agentes para evolução contínua.'}
          </p>
        </div>
      </div>

      <div className="tabs">
        {[
          { id: 'cerebro', label: 'Cérebro Operacional' },
          { id: 'memoria', label: 'Vault de Notas (187)' },
          { id: 'ideias', label: 'Ideias' }
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

      {tab === 'cerebro' && (
        <div className="flex flex-col gap-4">
          <div className="g3">
            <div className="card pad">
              <span className="eyebrow">Nós no Grafo</span>
              <div className="num text-[26px] my-1">482</div>
              <small className="muted">Agentes, artefatos, lições e skills</small>
            </div>
            <div className="card pad">
              <span className="eyebrow">Lições Ativas</span>
              <div className="num text-[26px] text-[#1BC5BD] my-1">54</div>
              <small className="muted">Aplicadas preventivamente nos prompts</small>
            </div>
            <div className="card pad">
              <span className="eyebrow">Auditorias em Ledger</span>
              <div className="num text-[26px] text-[#B7F34A] my-1">1.240</div>
              <small className="muted">Eventos registrados em SQLite</small>
            </div>
          </div>

          <section className="ink p-6 rounded-2xl flex flex-col gap-3" style={{ background: 'var(--surface-ink)' }}>
            <div className="flex items-center justify-between">
              <span className="eyebrow text-[#B7F34A]">Grafo de Inteligência da TAVIR</span>
              <span className="badge flow">Sincronizado</span>
            </div>
            <p className="text-[14px] text-[#cbd3de]">
              O Cérebro alimenta automaticamente os prompts de todos os 57 agentes com base nas decisões tomadas pelo CEO e nos checkpoints de QA aprovados.
            </p>
            <div className="card pad bg-[#070d18] mono text-[12px] text-[#aeb7c4] mt-2">
              <div>[Cérebro] 187 notas do Vault indexadas em vetores locais via SQLite</div>
              <div className="text-[#1BC5BD]">[Auto-Ajuste] Agentes carregam apenas o contexto estritamente necessário para cada etapa</div>
              <div>[Memória] Isolamento completo por workspace (.work/) sem vazamento entre clientes</div>
            </div>
          </section>
        </div>
      )}

      {tab === 'memoria' && (
        <div className="grid grid-cols-12 gap-6 items-start">
          <aside className="col-span-12 lg:col-span-5 card pad flex flex-col gap-3">
            <div className="search flex items-center gap-2 p-2 rounded-xl bg-[var(--surface-3)] border border-[var(--line)]">
              <TvIcon name="search" size={16} />
              <input
                type="text"
                className="bg-transparent border-0 outline-none text-[13px] w-full"
                placeholder="Buscar nas 187 notas do Vault..."
                value={vaultSearch}
                onChange={(e) => setVaultSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2 overflow-auto max-h-[500px]">
              {filteredNotes.map((n) => (
                <div
                  key={n.id}
                  onClick={() => setActiveNote(n.id)}
                  className={`card pad click border ${
                    activeNote === n.id ? 'border-[#B7F34A] bg-[var(--surface-3)]' : 'border-[var(--line)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="badge">{n.tag}</span>
                    <span className="mono text-[11px] muted">{n.date}</span>
                  </div>
                  <strong className="text-[13px] block mb-1">{n.title}</strong>
                  <p className="muted text-[12px] line-clamp-2">{n.summary}</p>
                </div>
              ))}
            </div>
          </aside>

          <section className="col-span-12 lg:col-span-7 card pad flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <div>
                <span className="eyebrow">{currentNoteObj.tag} · {currentNoteObj.date}</span>
                <h2 className="text-[20px] font-semibold mt-1">{currentNoteObj.title}</h2>
              </div>
              <button
                className="btn sm secondary"
                onClick={() => onOpenModal?.('soul')}
              >
                Editar
              </button>
            </div>

            <div className="markdown prose text-[14px] leading-relaxed whitespace-pre-wrap mono text-[#cbd3de]">
              {currentNoteObj.content}
            </div>
          </section>
        </div>
      )}

      {tab === 'ideias' && (
        <div className="g3">
          {ideas.map((i) => (
            <div key={i.id} className="card pad flex flex-col justify-between min-h-[160px]">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="badge flow">{i.impact} Impacto</span>
                  <span className="badge">{i.status}</span>
                </div>
                <strong className="text-[15px]">{i.title}</strong>
              </div>
              <div className="pt-3 border-t border-[var(--line)] text-[12px] muted">
                Sugerido por {i.author}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
