/** Os cinco passos do HTML. O tour chama este mapa de cinco passos. */
export const ONBOARDING_STEPS = [
  {
    eyebrow: "Fundação local-first",
    title: "Bem-vindo ao TAVIR Escritório",
    text: "Um painel para orquestrar agentes, tasks e entregas a partir da sua máquina, com registro auditável em SQLite.",
    points: [
      "Tudo roda em 127.0.0.1",
      "Cada passo vira linha no livro-razão",
      "Ação irreversível sempre para em gate humano",
    ],
  },
  {
    eyebrow: "Arquitetura de 3 colunas",
    title: "Rail, menu e miolo",
    text: "O rail escolhe o domínio. O menu mostra as telas daquele domínio. O miolo é onde o trabalho acontece.",
    points: ["Sete domínios no rail", "Busca global em Ctrl K", "Tema claro mantém rail e menu em tinta"],
  },
  {
    eyebrow: "Orquestração",
    title: "O ciclo de um job",
    text: "A Paula PM planeja. O job roda com motor, modelo e teto definidos. Antes de algo irreversível, ele para e pede você.",
    points: ["Teto de gasto obrigatório", "Log ao vivo por SSE", "Decisões reúne aprovações, bloqueios e alterações"],
  },
  {
    eyebrow: "Produção",
    title: "Cinco módulos",
    text: "Raio-X lê o cliente, Studio produz conteúdo, Fábrica constrói software, Flow liga as esteiras e Edição finaliza vídeo.",
    points: ["Cada módulo tem esteira e gate", "Prévia no dispositivo antes de publicar", "Flow e Edição em beta"],
  },
  {
    eyebrow: "Inteligência",
    title: "Cérebro, Doctor e Analytics",
    text: "O Cérebro guarda o grafo operacional e as lições. Doctor e Analytics leem a telemetria local de saúde e custo.",
    points: ["Lições voltam para o ofício do agente", "Custo por modelo, dia e projeto", "Checagem de saúde em um clique"],
  },
];
