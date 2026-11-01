export const JOURNEY = [
  { id: "encontrar", label: "Encontrar" },
  { id: "conversar", label: "Conversar" },
  { id: "atender", label: "Atender" },
  { id: "vender", label: "Vender" },
  { id: "medir", label: "Medir" },
] as const;

export const CLASSIFICATIONS = [
  { id: "observado", label: "Observado" },
  { id: "informado", label: "Informado" },
  { id: "inferido", label: "Inferido" },
  { id: "indisponivel", label: "Indisponível" },
] as const;

export const OFFERS = [
  { id: "presenca_local", label: "Presença Local" },
  { id: "atendimento", label: "Atendimento" },
  { id: "pagina_vendas", label: "Página de vendas" },
  { id: "landing", label: "Landing page" },
  { id: "criacao_oferta", label: "Criação de oferta" },
  { id: "catalogo", label: "Catálogo" },
  { id: "branding", label: "Branding" },
  { id: "atendimento_automatizado", label: "Atendimento automatizado" },
  { id: "comercio", label: "Comércio digital" },
  { id: "crescimento", label: "Crescimento" },
  { id: "conteudo", label: "Conteúdo" },
  { id: "video", label: "Vídeo e Reels" },
  { id: "proposta", label: "Proposta com link" },
] as const;

export const ORIGINS = [
  { id: "amigo", label: "Amigo" },
  { id: "rua", label: "Rua" },
  { id: "formulario", label: "Formulário" },
] as const;

export const SEGMENTS = ["Roupa online", "Negócio local", "Serviço", "Agência de viagem"] as const;

export const SCAN_FRONTS = [
  { id: "site", label: "Site próprio" },
  { id: "instagram", label: "Instagram" },
  { id: "google", label: "Google" },
  { id: "maps", label: "Google Maps" },
  { id: "opinioes", label: "Opinião de cliente" },
  { id: "concorrentes", label: "Concorrentes e diferenciais" },
] as const;

export const CONFIDENCE = [
  { id: "alta", label: "Alta" },
  { id: "media", label: "Média" },
  { id: "baixa", label: "Baixa" },
] as const;

const STATUS: Record<string, string> = {
  intake: "Fronteira",
  coleta: "Coleta",
  mapa: "Jornada",
  prioridade: "Prioridade",
  devolutiva: "Devolutiva",
  fechado: "Fechado",
};

export function statusLabel(status: string) {
  return STATUS[status] || status;
}

export function stageLabel(id: string | null | undefined) {
  return JOURNEY.find((item) => item.id === id)?.label || "—";
}

export function classLabel(id: string) {
  return CLASSIFICATIONS.find((item) => item.id === id)?.label || id;
}

export function frontLabel(id: string | null | undefined) {
  return SCAN_FRONTS.find((item) => item.id === id)?.label || "";
}

export function originLabel(id: string | null | undefined) {
  return ORIGINS.find((item) => item.id === id)?.label || "—";
}

export function offerLabel(id: string | null | undefined) {
  if (!id || id === "nenhuma") return "Nenhuma";
  return OFFERS.find((item) => item.id === id)?.label || id;
}

export function decisionLabel(id: string | null | undefined) {
  if (id === "proposta_emitida") return "Proposta emitida";
  if (id === "nao_emitir") return "Não emitir";
  return "Pendente";
}
