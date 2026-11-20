/**
 * Guias de acesso por serviço (A4 do PLANO_CHAMADOS).
 *
 * Cada serviço do catálogo de detecção (`SERVICOS` em absorcao.ts) que pede
 * credencial tem aqui: os campos que o projeto precisa, onde conseguir (endereço
 * e passos) e o pedido pronto para mandar ao cliente. Os serviços que não pedem
 * credencial própria ficam em SEM_CREDENCIAL; os que usam a credencial de outro
 * (Supabase Auth usa a do Supabase) ficam em CREDENCIAL_DE.
 */

export interface CampoAcesso {
  chave: string;
  rotulo: string;
  segredo: boolean;
  exemplo?: string;
  /** Campo de várias linhas (conta de serviço em JSON). */
  multilinha?: boolean;
}

export interface GuiaAcesso {
  servico: string;
  nome: string;
  campos: CampoAcesso[];
  onde: { url: string; passos: string[] };
  pedidoAoCliente: string;
  confere?: 'vercel' | 'supabase' | 'netlify' | 'github';
}

export type SituacaoAcesso = 'pendente' | 'preenchido' | 'pedir_ao_cliente' | 'nao_se_aplica';

export const SITUACAO_ACESSO_ROTULO: Record<SituacaoAcesso, string> = {
  pendente: 'Pendente',
  preenchido: 'Preenchido',
  pedir_ao_cliente: 'Pedir ao cliente',
  nao_se_aplica: 'Não se aplica',
};

export const GUIAS: GuiaAcesso[] = [
  {
    servico: 'github', nome: 'GitHub',
    campos: [{ chave: 'conta', rotulo: 'Conta do cofre com escrita no repositório', segredo: false, exemplo: 'TAVIR ou Pessoal' }],
    onde: { url: 'https://github.com/settings/tokens', passos: [
      'Entre no GitHub com a conta que tem escrita no repositório do cliente.',
      'Abra Configurações › Developer settings › Personal access tokens.',
      'Gere um token (classic) com o escopo «repo» e validade de 90 dias.',
      'Cadastre o token em Configurações › Contas do GitHub do Escritório.',
      'Volte aqui e escolha essa conta no cartão.',
    ] },
    pedidoAoCliente: 'Oi! Para trabalharmos no projeto, preciso de acesso de escrita ao repositório no GitHub. Pode me adicionar como colaborador em Settings › Collaborators (meu usuário vai junto) ou transferir o repositório para a organização da TAVIR?',
    confere: 'github',
  },
  {
    servico: 'vercel', nome: 'Vercel',
    campos: [
      { chave: 'token', rotulo: 'Token', segredo: true, exemplo: 'vercel_…' },
      { chave: 'projeto', rotulo: 'Projeto', segredo: false, exemplo: 'nome-do-projeto' },
    ],
    onde: { url: 'https://vercel.com/account/settings/tokens', passos: [
      'Entre na Vercel com a conta dona do projeto.',
      'Abra Account Settings › Tokens.',
      'Crie um token com escopo no time do projeto e validade definida.',
      'Copie o token (ele só aparece uma vez) e cole no campo Token.',
      'Em Projeto, informe o nome que aparece no painel da Vercel.',
    ] },
    pedidoAoCliente: 'Oi! Para publicar as alterações, preciso de um token da Vercel. Entre em vercel.com › Account Settings › Tokens, crie um token para o time do projeto e me mande junto com o nome do projeto. Se preferir, me convide para o time.',
    confere: 'vercel',
  },
  {
    servico: 'netlify', nome: 'Netlify',
    campos: [
      { chave: 'token', rotulo: 'Token', segredo: true, exemplo: 'nfp_…' },
      { chave: 'site', rotulo: 'Site', segredo: false, exemplo: 'nome-do-site' },
    ],
    onde: { url: 'https://app.netlify.com/user/applications#personal-access-tokens', passos: [
      'Entre na Netlify com a conta dona do site.',
      'Abra User settings › Applications › Personal access tokens.',
      'Clique em «New access token», dê um nome e escolha a validade.',
      'Copie o token e cole no campo Token.',
      'Em Site, informe o nome do site no painel.',
    ] },
    pedidoAoCliente: 'Oi! Para publicar o site, preciso de um token da Netlify. Entre em app.netlify.com › User settings › Applications › Personal access tokens, gere um e me mande junto com o nome do site.',
    confere: 'netlify',
  },
  {
    servico: 'supabase', nome: 'Supabase',
    campos: [
      { chave: 'token', rotulo: 'Token de acesso da conta', segredo: true, exemplo: 'sbp_…' },
      { chave: 'url', rotulo: 'URL do projeto', segredo: false, exemplo: 'https://xxxx.supabase.co' },
      { chave: 'service_role', rotulo: 'Chave de serviço (service_role)', segredo: true },
      { chave: 'senha_banco', rotulo: 'Senha do banco', segredo: true },
    ],
    onde: { url: 'https://supabase.com/dashboard/account/tokens', passos: [
      'Entre no Supabase com a conta dona do projeto.',
      'Em Account › Access Tokens, gere um token e cole no primeiro campo.',
      'Abra o projeto › Project Settings › API e copie a URL do projeto.',
      'Na mesma tela, copie a chave «service_role» (é secreta).',
      'Em Project Settings › Database, use a senha do banco (ou redefina).',
    ] },
    pedidoAoCliente: 'Oi! Para mexer no banco do projeto, preciso de acesso ao Supabase. O mais simples é me convidar para a organização (Organization › Team). Se preferir mandar as chaves: URL do projeto e chave service_role (Project Settings › API) e a senha do banco (Project Settings › Database).',
    confere: 'supabase',
  },
  {
    servico: 'cloudflare', nome: 'Cloudflare',
    campos: [
      { chave: 'token', rotulo: 'Token da API', segredo: true },
      { chave: 'conta', rotulo: 'ID da conta', segredo: false },
      { chave: 'zona', rotulo: 'ID da zona', segredo: false },
    ],
    onde: { url: 'https://dash.cloudflare.com/profile/api-tokens', passos: [
      'Entre na Cloudflare com a conta dona do domínio.',
      'Abra My Profile › API Tokens e clique em «Create Token».',
      'Use o modelo «Edit Cloudflare Workers» ou monte só as permissões necessárias.',
      'Copie o token e cole no campo Token da API.',
      'O ID da conta e o da zona ficam na lateral direita da visão geral do domínio.',
    ] },
    pedidoAoCliente: 'Oi! Preciso de um token da API da Cloudflare para publicar. Em dash.cloudflare.com › My Profile › API Tokens, crie um token (modelo «Edit Cloudflare Workers») e me mande junto com o ID da conta e o ID da zona, que aparecem na visão geral do domínio.',
  },
  {
    servico: 'firebase', nome: 'Firebase',
    campos: [
      { chave: 'conta_servico', rotulo: 'Conta de serviço (JSON)', segredo: true, multilinha: true },
      { chave: 'projeto', rotulo: 'ID do projeto', segredo: false },
    ],
    onde: { url: 'https://console.firebase.google.com/', passos: [
      'Entre no console do Firebase com a conta dona do projeto.',
      'Abra o projeto › engrenagem › Configurações do projeto › Contas de serviço.',
      'Clique em «Gerar nova chave privada» e baixe o JSON.',
      'Cole o conteúdo do JSON no campo Conta de serviço.',
      'O ID do projeto aparece em Configurações do projeto › Geral.',
    ] },
    pedidoAoCliente: 'Oi! Para trabalhar no Firebase do projeto, o melhor é me adicionar como membro (Configurações do projeto › Usuários e permissões). Se preferir, gere uma chave em Configurações › Contas de serviço › «Gerar nova chave privada» e me mande o arquivo JSON por um canal seguro.',
  },
  {
    servico: 'stripe', nome: 'Stripe',
    campos: [
      { chave: 'chave_teste', rotulo: 'Chave secreta de teste', segredo: true, exemplo: 'sk_test_…' },
      { chave: 'chave_producao', rotulo: 'Chave secreta de produção', segredo: true, exemplo: 'sk_live_…' },
      { chave: 'webhook', rotulo: 'Segredo do webhook', segredo: true, exemplo: 'whsec_…' },
    ],
    onde: { url: 'https://dashboard.stripe.com/apikeys', passos: [
      'Entre no painel da Stripe com a conta do cliente.',
      'Com «Modo de teste» ligado, abra Desenvolvedores › Chaves de API e copie a chave secreta.',
      'Desligue o modo de teste e copie a chave secreta de produção (ou crie uma restrita).',
      'Em Desenvolvedores › Webhooks, abra o endpoint do projeto e revele o segredo de assinatura.',
    ] },
    pedidoAoCliente: 'Oi! Para mexer nos pagamentos, preciso das chaves da Stripe: a chave secreta de teste, a de produção (Desenvolvedores › Chaves de API) e o segredo do webhook (Desenvolvedores › Webhooks). Pode também me convidar como desenvolvedor na conta.',
  },
  {
    servico: 'mercadopago', nome: 'Mercado Pago',
    campos: [
      { chave: 'token_teste', rotulo: 'Access token de teste', segredo: true, exemplo: 'TEST-…' },
      { chave: 'token_producao', rotulo: 'Access token de produção', segredo: true, exemplo: 'APP_USR-…' },
      { chave: 'webhook', rotulo: 'Segredo do webhook', segredo: true },
    ],
    onde: { url: 'https://www.mercadopago.com.br/developers/panel/app', passos: [
      'Entre em Suas integrações do Mercado Pago com a conta do cliente.',
      'Abra a aplicação usada pelo projeto (ou crie uma).',
      'Em Credenciais de teste, copie o Access Token.',
      'Em Credenciais de produção, copie o Access Token.',
      'Em Webhooks › Configurar notificações, copie a assinatura secreta.',
    ] },
    pedidoAoCliente: 'Oi! Para mexer nos pagamentos, preciso das credenciais do Mercado Pago: o Access Token de teste e o de produção (Suas integrações › aplicação › Credenciais) e a assinatura secreta dos webhooks.',
  },
  {
    servico: 'resend', nome: 'Resend',
    campos: [{ chave: 'chave', rotulo: 'Chave da API', segredo: true, exemplo: 're_…' }],
    onde: { url: 'https://resend.com/api-keys', passos: [
      'Entre na Resend com a conta do cliente.',
      'Abra API Keys e clique em «Create API Key».',
      'Dê acesso de envio ao domínio do projeto.',
      'Copie a chave e cole no campo.',
    ] },
    pedidoAoCliente: 'Oi! O projeto envia e-mail pela Resend. Preciso de uma chave da API: em resend.com › API Keys, crie uma com permissão de envio e me mande.',
  },
  {
    servico: 'openai', nome: 'OpenAI',
    campos: [{ chave: 'chave', rotulo: 'Chave da API', segredo: true, exemplo: 'sk-…' }],
    onde: { url: 'https://platform.openai.com/api-keys', passos: [
      'Entre na plataforma da OpenAI com a conta do cliente.',
      'Abra API keys e clique em «Create new secret key».',
      'Escolha o projeto e dê um nome à chave.',
      'Copie a chave (ela só aparece uma vez) e cole no campo.',
    ] },
    pedidoAoCliente: 'Oi! O projeto usa a OpenAI. Preciso de uma chave da API: em platform.openai.com › API keys, crie uma chave para o projeto e me mande por um canal seguro.',
  },
  {
    servico: 'anthropic', nome: 'Anthropic',
    campos: [{ chave: 'chave', rotulo: 'Chave da API', segredo: true, exemplo: 'sk-ant-…' }],
    onde: { url: 'https://console.anthropic.com/settings/keys', passos: [
      'Entre no console da Anthropic com a conta do cliente.',
      'Abra Settings › API keys e clique em «Create Key».',
      'Escolha o workspace e dê um nome à chave.',
      'Copie a chave e cole no campo.',
    ] },
    pedidoAoCliente: 'Oi! O projeto usa a API da Anthropic. Preciso de uma chave: em console.anthropic.com › Settings › API keys, crie uma e me mande por um canal seguro.',
  },
];

/** Serviços detectados que usam a credencial de outro serviço do catálogo. */
export const CREDENCIAL_DE: Record<string, string> = {
  'supabase-auth': 'supabase',
  'supabase-storage': 'supabase',
  'firebase-auth': 'firebase',
  'firebase-hosting': 'firebase',
  'r2': 'cloudflare',
  'github-actions': 'github',
};

/** Serviços detectados que não pedem credencial própria (ferramenta local ou camada sobre o banco). */
export const SEM_CREDENCIAL = new Set(['docker', 'sqlite', 'prisma', 'drizzle']);

const PORID = new Map(GUIAS.map((g) => [g.servico, g]));

/** Serviço cujo cartão cobre este achado (o próprio ou o de quem ele usa a credencial). Vazio = sem cartão. */
export function servicoDoCartao(servico: string): string {
  if (SEM_CREDENCIAL.has(servico)) return '';
  return CREDENCIAL_DE[servico] || servico;
}

/** Guia do serviço; sem guia, um campo genérico de chave. */
export function guiaDe(servico: string, nome?: string): GuiaAcesso & { generico?: boolean } {
  const g = PORID.get(servico);
  if (g) return g;
  const n = nome || servico;
  return {
    servico, nome: n, generico: true,
    campos: [{ chave: 'chave', rotulo: 'Chave ou token', segredo: true }],
    onde: { url: '', passos: [] },
    pedidoAoCliente: `Oi! O projeto usa ${n}. Preciso de uma credencial de acesso (chave da API ou token) para trabalhar nele. Pode gerar uma no painel do serviço e me mandar por um canal seguro?`,
  };
}
