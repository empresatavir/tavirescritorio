/** Textos do fluxo guiado no HTML de redesenho. */

export type TourKey = "exec" | "client";

export interface TourStep {
  title: string;
  body: string;
  why: string;
  where: string;
}

export const TOURS: Record<TourKey, { name: string; steps: TourStep[] }> = {
  exec: {
    name: "Ciclo de execução",
    steps: [
      {
        title: "Entrada local",
        body: "O escritório roda em 127.0.0.1. A chave do operador fica só nesta máquina e abre a sessão.",
        why: "Nada sai da máquina sem você. É a primeira garantia do sistema.",
        where: "Login",
      },
      {
        title: "O mapa em cinco passos",
        body: "Na primeira entrada, o onboarding explica a arquitetura: domínios no rail, telas no menu e o miolo de trabalho.",
        why: "Quem entende o mapa encontra o que precisa sem perguntar.",
        where: "Onboarding",
      },
      {
        title: "Leia o dia pela Sala",
        body: "A Sala junta jobs rodando, cards ativos e o que depende de você. O bloco O que pede você vem antes de qualquer métrica.",
        why: "Decisão humana é o gargalo da operação. Ela aparece primeiro.",
        where: "Operação / Sala",
      },
      {
        title: "Inicie um job",
        body: "Motor, modelo, esforço e teto de gasto. A estimativa aparece antes de rodar e o teto é obrigatório.",
        why: "Custo previsível antes de rodar, não depois.",
        where: "Iniciar job",
      },
      {
        title: "Acompanhe ao vivo",
        body: "O log chega por SSE. Cada passo vira linha no livro-razão, com custo acumulado contra o teto.",
        why: "Você vê o que a IA fez, em que ordem e quanto custou.",
        where: "Operação / Execuções",
      },
      {
        title: "Gate humano",
        body: "O deploy da Meridian parou antes de publicar. Aprovar libera o próximo passo. Recusar devolve o card com o seu comentário.",
        why: "A automação cuida do repetitivo. O humano decide o que importa.",
        where: "Operação / Decisões",
      },
      {
        title: "A esteira avança",
        body: "Na Fábrica, a topologia mostra em que etapa cada projeto está e o que ainda bloqueia o Completion Guard.",
        why: "Entrega com critério de pronto, não por impressão.",
        where: "Módulos / Fábrica",
      },
      {
        title: "Meça o resultado",
        body: "Analytics lê a telemetria local: custo por dia e por modelo, contra o teto do mês.",
        why: "Resultado definido antes da promessa, e conferido depois.",
        where: "Sistema / Analytics",
      },
    ],
  },
  client: {
    name: "Jornada do cliente",
    steps: [
      {
        title: "Encontrar · abra um caso",
        body: "Todo cliente entra pelo Raio-X: origem, segmento e modo de leitura. Nada é vendido antes da leitura.",
        why: "Vender sem diagnóstico é prometer sem prova.",
        where: "Módulos / Raio-X",
      },
      {
        title: "Leia a presença",
        body: "Evidências ficam separadas em observado, informado, inferido e indisponível. A nota por etapa da jornada mostra onde o cliente perde gente.",
        why: "Cada afirmação carrega fonte e grau de confiança.",
        where: "Raio-X / Loja da Rua",
      },
      {
        title: "Vender · proposta com link",
        body: "A oferta vira proposta com link público. A linha do tempo mostra envio, abertura e aceite.",
        why: "Meta, condição e responsabilidade claras antes da implantação.",
        where: "Comercial / Propostas",
      },
      {
        title: "Contra-assinatura",
        body: "O aceite do cliente volta como checkpoint. A contra-assinatura abre o projeto e a esteira certa.",
        why: "Contrato só existe com as duas pontas registradas.",
        where: "Operação / Decisões",
      },
      {
        title: "Acompanhe o funil",
        body: "Do caso aberto à proposta assinada, com conversão por etapa e valor em aberto.",
        why: "O funil mostra onde a venda trava, não só quanto entrou.",
        where: "Comercial / Funil",
      },
      {
        title: "Medir · margem real",
        body: "Receita do contrato contra o custo de motor e horas de agente. Margem por projeto, mês a mês.",
        why: "Automação boa é a que se paga e mostra o número.",
        where: "Comercial / Finanças",
      },
    ],
  },
};
