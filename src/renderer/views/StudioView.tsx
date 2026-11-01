import React, { useState } from 'react';
import { TvIcon } from '../components/TvIcon';

interface StudioViewProps {
  onOpenModal?: (name: string, data?: any) => void;
  onNavigate?: (screen: string, extra?: any) => void;
}

export const StudioView: React.FC<StudioViewProps> = ({ onOpenModal, onNavigate }) => {
  const [activeProfile, setActiveProfile] = useState<string>('multiverso');
  const [activeStep, setActiveStep] = useState<number>(3); // Arte
  const [activeAngle, setActiveAngle] = useState<number>(1);
  const [activeSlide, setActiveSlide] = useState<number>(0);

  const profiles = [
    { id: 'multiverso', name: 'Multiverso Paranoico', net: 'Instagram', size: '42k seguidores', ini: 'MP', ck: '1 gate', avbg: '#1BC5BD', avfg: '#0B1220' },
    { id: 'canal', name: 'Canal TAVIR', net: 'YouTube', size: '18k inscritos', ini: 'CT', ck: '', avbg: '#B7F34A', avfg: '#0B1220' },
    { id: 'b2b', name: 'TAVIR B2B', net: 'LinkedIn', size: '8.4k conexões', ini: 'TB', ck: '', avbg: '#aeb7c4', avfg: '#0B1220' }
  ];

  const steps = [
    { n: '01', label: 'Pauta' },
    { n: '02', label: 'Ângulo' },
    { n: '03', label: 'Roteiro' },
    { n: '04', label: 'Arte' },
    { n: '05', label: 'Áudio' },
    { n: '06', label: 'Revisão' },
    { n: '07', label: 'Publicar' }
  ];

  const angles = [
    {
      id: 1,
      title: 'Ângulo 1: A Anomalia Histórica',
      hook: 'Como uma decisão tomada em 1962 explica a escassez de hoje.',
      promise: 'Conecta arquivos desclassificados com a inflação atual.',
      proof: 'Citação direta do diário oficial desclassificado pelo FOIA.'
    },
    {
      id: 2,
      title: 'Ângulo 2: O Paradoxo Tecnológico',
      hook: 'Temos mais poder de processamento no bolso que a Apollo 11, mas menos foco.',
      promise: 'Desconstrói os ciclos de dopamina induzidos por design de apps.',
      proof: 'Estudo de Stanford de 2024 sobre atenção fragmentada.'
    },
    {
      id: 3,
      title: 'Ângulo 3: O Ponto Cego Estratégico',
      hook: 'Por que empresas com faturamento milionário quebram sem aviso prévio.',
      promise: 'Demonstra a assimetria entre margem bruta e fluxo de caixa real.',
      proof: 'Auditoria de 40 empresas pós-pandemia.'
    }
  ];

  const slides = [
    {
      n: 1,
      tag: 'CAPA / GANCHO',
      head: 'A decisão secreta de 1962 que definiu o que você paga hoje',
      text: 'Documentos desclassificados revelam o acordo que congelou a matriz energética.',
      asset: 'visual/mockup-frame1.png'
    },
    {
      n: 2,
      tag: 'CONTEXTO',
      head: 'Em plena crise de outubro, três assinaturas mudaram o fluxo',
      text: 'O telegrama original continha apenas 4 linhas com a ordem de execução.',
      asset: 'visual/mockup-frame2.png'
    },
    {
      n: 3,
      tag: 'O IMPACTO',
      head: '60 anos depois, o efeito cascata bate na sua mesa',
      text: 'O gráfico acumulado comprova a correlação de 94% entre a portaria e os custos.',
      asset: 'visual/mockup-frame3.png'
    }
  ];

  return (
    <div className="page" style={{ maxWidth: '1520px', gap: '20px', paddingBottom: '80px' }}>
      <div className="phead">
        <div>
          <span className="eyebrow">Módulos · Conversar</span>
          <h1 style={{ marginTop: '8px' }}>Studio de Conteúdo</h1>
          <p>Da pauta ao post publicado numa esteira só. O Oráculo propõe os ângulos, os agentes produzem e você decide nos gates chave.</p>
        </div>
        <div className="actions flex items-center gap-2">
          <button className="btn secondary" onClick={() => onOpenModal?.('profile')}>
            Novo perfil
          </button>
          <button className="btn primary" onClick={() => onOpenModal?.('production')}>
            <TvIcon name="plus" size={16} /> Nova produção
          </button>
        </div>
      </div>

      {/* SELETOR DE PERFIS */}
      <section className="card pad flex items-center gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {profiles.map((p) => {
            const isSel = p.id === activeProfile;
            return (
              <button
                key={p.id}
                onClick={() => setActiveProfile(p.id)}
                className={`flex items-center gap-3 px-4 py-2 rounded-full border transition-all cursor-pointer ${
                  isSel ? 'border-[#B7F34A] bg-[var(--surface-3)]' : 'border-[var(--line)] bg-[var(--surface-2)]'
                }`}
              >
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: p.avbg,
                    color: p.avfg,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 10,
                    fontWeight: 700
                  }}
                >
                  {p.ini}
                </span>
                <div className="text-left">
                  <strong className="text-[13px] block">{p.name}</strong>
                  <span className="muted text-[11px]">{p.net} · {p.size}</span>
                </div>
                {p.ck && <span className="badge warn ml-1">{p.ck}</span>}
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1 }} />
        <div className="flex gap-6 flex-wrap pr-2">
          <div>
            <div className="eyebrow text-[10px]">Peças no mês</div>
            <div className="num text-[18px]">14</div>
          </div>
          <div>
            <div className="eyebrow text-[10px]">Alcance</div>
            <div className="num text-[18px]">428k</div>
          </div>
          <div>
            <div className="eyebrow text-[10px]">Custo médio</div>
            <div className="num text-[18px]">US$ 1,20</div>
          </div>
        </div>
      </section>

      {/* ESTEIRA DA PRODUÇÃO ATIVA */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Painel Esquerdo: Roteiro & Ângulos (7 colunas) */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-4">
          <div className="card pad flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="eyebrow">Carrossel 4:5 · Adriano Arte</span>
                <h2 className="text-[20px] font-semibold">Episódio 14 — O Acordo de 1962</h2>
              </div>
              <span className="badge flow">ETAPA 04 · ARTE</span>
            </div>

            {/* Stepper Horizontal */}
            <div className="flex items-center justify-between border-y border-[var(--line)] py-3 overflow-x-auto">
              {steps.map((st, i) => {
                const isPast = activeStep > i;
                const isCur = activeStep === i;
                return (
                  <button
                    key={st.n}
                    onClick={() => setActiveStep(i)}
                    className="flex flex-col items-center gap-1 bg-transparent border-0 cursor-pointer min-w-[50px]"
                  >
                    <span className="mono text-[10px] muted">{st.n}</span>
                    <strong
                      className={`text-[12px] ${
                        isCur ? 'text-[#B7F34A]' : isPast ? 'text-[#1BC5BD]' : 'text-muted'
                      }`}
                    >
                      {st.label}
                    </strong>
                    <div
                      style={{
                        width: '100%',
                        height: 3,
                        borderRadius: 2,
                        background: isCur ? 'var(--lime)' : isPast ? 'var(--flow)' : 'var(--line)'
                      }}
                    />
                  </button>
                );
              })}
            </div>

            {/* Ângulos do Oráculo */}
            <div>
              <div className="sec-title mb-3">
                <TvIcon name="spark" size={16} className="text-[#B7F34A]" />
                <h3 className="text-[15px]">Mesa do Oráculo: Ângulos Selecionados</h3>
              </div>
              <div className="flex flex-col gap-3">
                {angles.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => setActiveAngle(a.id)}
                    className={`card pad click border ${
                      activeAngle === a.id ? 'border-[#B7F34A] bg-[var(--surface-3)]' : 'border-[var(--line)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <strong className="text-[14px] text-[#F4F6F2]">{a.title}</strong>
                      {activeAngle === a.id && <span className="badge flow">ESCOLHIDO</span>}
                    </div>
                    <p className="text-[13px] text-[#B7F34A] mb-1 font-medium">"{a.hook}"</p>
                    <p className="text-[12px] muted mb-1">{a.promise}</p>
                    <div className="mono text-[11px] text-[#aeb7c4]">Prova: {a.proof}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Comentário e Instruções para os Agentes */}
            <div className="card pad bg-[#070d18] mono text-[12px] text-[#cbd3de]">
              <div className="text-[#1BC5BD] mb-1">canon: squad ig-studio · tom investigativo sem sensacionalismo</div>
              <div className="muted mb-1">revisado_por: Rita Revisora · limite de 60 caracteres no slide de capa</div>
              <div className="text-[#aeb7c4]">assets: gerados em 4:5 pelo Adriano Arte com paleta Tinta Profunda e Lima</div>
            </div>
          </div>
        </div>

        {/* Painel Direito: Prova Visual do Carrossel (5 colunas) */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
          <div className="card pad flex flex-col items-center">
            <div className="flex items-center justify-between w-full mb-4">
              <div>
                <span className="eyebrow">Simulador de Dispositivo</span>
                <strong className="block text-[14px]">Prévia 4:5 (Instagram)</strong>
              </div>
              <span className="badge flow">SLIDE {activeSlide + 1} DE {slides.length}</span>
            </div>

            {/* Frame do Carrossel 4:5 */}
            <div
              className="w-full max-w-[340px] rounded-2xl overflow-hidden border border-[var(--line)] shadow-2xl flex flex-col justify-between p-6"
              style={{
                aspectRatio: '4/5',
                background: 'linear-gradient(180deg, #070d18 0%, #0f1729 100%)',
                position: 'relative'
              }}
            >
              <div className="flex items-center justify-between">
                <span className="badge flow text-[10px]">{slides[activeSlide].tag}</span>
                <span className="mono text-[11px] text-muted">@multiversoparanoico</span>
              </div>

              <div className="my-auto">
                <h3 className="text-[20px] font-bold text-[#F4F6F2] leading-tight mb-3">
                  {slides[activeSlide].head}
                </h3>
                <p className="text-[13px] text-[#cbd3de] leading-relaxed">
                  {slides[activeSlide].text}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--line)]">
                <div className="flex gap-1.5">
                  {slides.map((_, i) => (
                    <div
                      key={i}
                      style={{
                        width: i === activeSlide ? 18 : 6,
                        height: 6,
                        borderRadius: 3,
                        background: i === activeSlide ? 'var(--lime)' : 'var(--line)',
                        transition: 'all 200ms ease'
                      }}
                    />
                  ))}
                </div>
                <span className="mono text-[10px] text-muted">Arraste para ler &gt;</span>
              </div>
            </div>

            {/* Navegador de Slides */}
            <div className="flex items-center gap-3 mt-4">
              <button
                className="btn sm secondary"
                onClick={() => setActiveSlide((prev) => Math.max(0, prev - 1))}
                disabled={activeSlide === 0}
              >
                Anterior
              </button>
              <span className="mono text-[12px]">{activeSlide + 1} / {slides.length}</span>
              <button
                className="btn sm secondary"
                onClick={() => setActiveSlide((prev) => Math.min(slides.length - 1, prev + 1))}
                disabled={activeSlide === slides.length - 1}
              >
                Próximo
              </button>
            </div>

            {/* Ações de Aprovação da Peça */}
            <div className="flex items-center gap-3 mt-4 w-full">
              <button className="btn primary sm w-full" onClick={() => onOpenModal?.('ajuste')}>
                Pedir Ajuste Fino
              </button>
              <button className="btn success sm w-full" onClick={() => onNavigate?.('decisions')}>
                Liberar para Publicação
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
