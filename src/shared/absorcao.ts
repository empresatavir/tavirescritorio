/**
 * Absorção completa: tipos e catálogo de serviços que os detectores procuram.
 * Sem motor. Quem lê a pasta é `src/main/absorcao/detectores.ts`.
 */

export type Assunto = 'deploy' | 'banco' | 'auth' | 'pagamento' | 'mensagens' | 'arquivos' | 'medicao' | 'ia';

export const ASSUNTO_ROTULO: Record<Assunto, string> = {
  deploy: 'Onde publica',
  banco: 'Banco de dados',
  auth: 'Login',
  pagamento: 'Pagamento',
  mensagens: 'Mensagens',
  arquivos: 'Arquivos',
  medicao: 'Medição',
  ia: 'IA',
};

export interface SinalServico {
  id: string;
  nome: string;
  assunto: Assunto;
  /** Nomes de arquivo de configuração (comparados em minúsculas) ou caminhos que terminam assim. */
  config?: string[];
  /** Pacotes de manifesto (npm, pub, pip, go, composer, gem). */
  deps?: string[];
  /** Regex de nome de variável de ambiente. */
  env?: string[];
  /** Regex de uso no código. */
  codigo?: string[];
}

export type TipoProva = 'config' | 'dep' | 'env' | 'codigo';

export interface Prova {
  tipo: TipoProva;
  arquivo: string;
  linha?: number;
  trecho?: string;
}

export interface Achado {
  servico: string;
  nome: string;
  assunto: Assunto;
  grau: 'confirmado' | 'indicio';
  provas: Prova[];
}

export const SERVICOS: SinalServico[] = [
  // deploy
  { id: 'vercel', nome: 'Vercel', assunto: 'deploy', config: ['vercel.json', '.vercel/project.json'], deps: ['vercel', '@vercel/analytics', '@vercel/node'], env: ['^VERCEL_'] },
  { id: 'netlify', nome: 'Netlify', assunto: 'deploy', config: ['netlify.toml', '_redirects'], deps: ['netlify-cli', '@netlify/functions'], env: ['^NETLIFY_'] },
  { id: 'cloudflare', nome: 'Cloudflare (Pages, Workers)', assunto: 'deploy', config: ['wrangler.toml', 'wrangler.json', 'wrangler.jsonc'], deps: ['wrangler', '@cloudflare/workers-types', '@cloudflare/next-on-pages'], env: ['^CLOUDFLARE_', '^CF_API'] },
  { id: 'fly', nome: 'Fly', assunto: 'deploy', config: ['fly.toml'], env: ['^FLY_'] },
  { id: 'render', nome: 'Render', assunto: 'deploy', config: ['render.yaml'], env: ['^RENDER_'] },
  { id: 'railway', nome: 'Railway', assunto: 'deploy', config: ['railway.json', 'railway.toml'], env: ['^RAILWAY_'] },
  { id: 'firebase-hosting', nome: 'Firebase Hosting', assunto: 'deploy', config: ['firebase.json', '.firebaserc'], codigo: ['"hosting"\\s*:'] },
  { id: 'docker', nome: 'Docker', assunto: 'deploy', config: ['dockerfile', 'docker-compose.yml', 'docker-compose.yaml', 'compose.yaml'] },
  { id: 'expo-eas', nome: 'Expo EAS', assunto: 'deploy', config: ['eas.json'], deps: ['expo', 'eas-cli'] },
  { id: 'github-actions', nome: 'GitHub Actions', assunto: 'deploy', config: ['.github/workflows/'] },
  // banco
  { id: 'supabase', nome: 'Supabase', assunto: 'banco', config: ['supabase/config.toml'], deps: ['@supabase/supabase-js', '@supabase/ssr', 'supabase_flutter', 'supabase'], env: ['SUPABASE_URL$', '^SUPABASE_', 'SUPABASE_ANON_KEY$'], codigo: ['createClient\\s*\\(\\s*[^)]*supabase', '\\.supabase\\.co', 'Supabase\\.initialize'] },
  { id: 'firebase', nome: 'Firebase', assunto: 'banco', config: ['firebase.json', 'google-services.json', 'googleservice-info.plist', 'firestore.rules'], deps: ['firebase', 'firebase-admin', 'firebase_core', 'cloud_firestore'], env: ['^FIREBASE_', '^NEXT_PUBLIC_FIREBASE_'], codigo: ["from ['\"]firebase/", 'initializeApp\\s*\\(', 'Firebase\\.initializeApp'] },
  { id: 'postgres', nome: 'Postgres', assunto: 'banco', deps: ['pg', 'postgres', 'psycopg2', 'psycopg2-binary', 'asyncpg', '@neondatabase/serverless'], env: ['^DATABASE_URL$', '^POSTGRES_', '^PG(HOST|USER|PASSWORD|DATABASE)$'], codigo: ['postgres(ql)?://'] },
  { id: 'mysql', nome: 'MySQL', assunto: 'banco', deps: ['mysql', 'mysql2', 'pymysql', 'mysqlclient'], env: ['^MYSQL_'], codigo: ['mysql://'] },
  { id: 'mongodb', nome: 'MongoDB', assunto: 'banco', deps: ['mongodb', 'mongoose', 'pymongo', 'motor'], env: ['^MONGO(DB)?_'], codigo: ['mongodb(\\+srv)?://'] },
  { id: 'sqlite', nome: 'SQLite', assunto: 'banco', deps: ['sqlite3', 'better-sqlite3', 'sqflite', 'drift'], codigo: ['node:sqlite', 'sqlite3\\.connect'] },
  { id: 'redis', nome: 'Redis', assunto: 'banco', deps: ['redis', 'ioredis', '@upstash/redis'], env: ['^REDIS_', '^UPSTASH_REDIS'], codigo: ['redis://'] },
  { id: 'prisma', nome: 'Prisma', assunto: 'banco', config: ['schema.prisma'], deps: ['prisma', '@prisma/client'], codigo: ['new PrismaClient\\s*\\('] },
  { id: 'drizzle', nome: 'Drizzle', assunto: 'banco', config: ['drizzle.config.ts', 'drizzle.config.js'], deps: ['drizzle-orm', 'drizzle-kit'] },
  // auth
  { id: 'supabase-auth', nome: 'Supabase Auth', assunto: 'auth', codigo: ['supabase\\.auth\\.', '\\.auth\\.signIn'] },
  { id: 'firebase-auth', nome: 'Firebase Auth', assunto: 'auth', deps: ['firebase_auth'], codigo: ["from ['\"]firebase/auth", 'getAuth\\s*\\(', 'FirebaseAuth\\.instance'] },
  { id: 'clerk', nome: 'Clerk', assunto: 'auth', deps: ['@clerk/nextjs', '@clerk/clerk-react', '@clerk/clerk-sdk-node'], env: ['^CLERK_', 'NEXT_PUBLIC_CLERK_'], codigo: ['ClerkProvider'] },
  { id: 'auth0', nome: 'Auth0', assunto: 'auth', deps: ['@auth0/nextjs-auth0', '@auth0/auth0-react', 'auth0'], env: ['^AUTH0_'], codigo: ['\\.auth0\\.com'] },
  { id: 'nextauth', nome: 'NextAuth', assunto: 'auth', deps: ['next-auth', '@auth/core'], env: ['^NEXTAUTH_', '^AUTH_SECRET$'], codigo: ["from ['\"]next-auth"] },
  // pagamento
  { id: 'stripe', nome: 'Stripe', assunto: 'pagamento', deps: ['stripe', '@stripe/stripe-js', '@stripe/react-stripe-js', 'flutter_stripe'], env: ['^STRIPE_', 'NEXT_PUBLIC_STRIPE_'], codigo: ["from ['\"]stripe['\"]", "require\\(['\"]stripe['\"]\\)", 'new Stripe\\s*\\(', 'api\\.stripe\\.com', 'loadStripe\\s*\\('] },
  { id: 'mercadopago', nome: 'Mercado Pago', assunto: 'pagamento', deps: ['mercadopago', '@mercadopago/sdk-react', 'mercadopago_sdk'], env: ['^MERCADOPAGO_', '^MP_ACCESS_TOKEN$', '^MERCADO_PAGO_'], codigo: ['api\\.mercadopago\\.com', "from ['\"]mercadopago['\"]", 'MercadoPagoConfig'] },
  { id: 'pagbank', nome: 'PagBank', assunto: 'pagamento', env: ['^PAGBANK_', '^PAGSEGURO_'], codigo: ['api\\.pagseguro\\.com', 'pagbank\\.com\\.br'] },
  { id: 'asaas', nome: 'Asaas', assunto: 'pagamento', env: ['^ASAAS_'], codigo: ['api\\.asaas\\.com', 'sandbox\\.asaas\\.com'] },
  { id: 'pagarme', nome: 'Pagar.me', assunto: 'pagamento', deps: ['pagarme'], env: ['^PAGARME_'], codigo: ['api\\.pagar\\.me'] },
  { id: 'paypal', nome: 'PayPal', assunto: 'pagamento', deps: ['@paypal/react-paypal-js', '@paypal/checkout-server-sdk'], env: ['^PAYPAL_'], codigo: ['api(-m)?\\.(sandbox\\.)?paypal\\.com'] },
  { id: 'hotmart', nome: 'Hotmart', assunto: 'pagamento', env: ['^HOTMART_'], codigo: ['hotmart\\.com', 'pay\\.hotmart'] },
  { id: 'kiwify', nome: 'Kiwify', assunto: 'pagamento', env: ['^KIWIFY_'], codigo: ['kiwify\\.com'] },
  // mensagens
  { id: 'resend', nome: 'Resend', assunto: 'mensagens', deps: ['resend'], env: ['^RESEND_'], codigo: ["from ['\"]resend['\"]", 'new Resend\\s*\\(', 'api\\.resend\\.com'] },
  { id: 'sendgrid', nome: 'SendGrid', assunto: 'mensagens', deps: ['@sendgrid/mail', 'sendgrid'], env: ['^SENDGRID_'], codigo: ['api\\.sendgrid\\.com'] },
  { id: 'twilio', nome: 'Twilio', assunto: 'mensagens', deps: ['twilio'], env: ['^TWILIO_'], codigo: ['api\\.twilio\\.com'] },
  { id: 'whatsapp', nome: 'API do WhatsApp', assunto: 'mensagens', env: ['^WHATSAPP_', '^WA_(TOKEN|PHONE)', '^ZAPI_', '^EVOLUTION_'], codigo: ['graph\\.facebook\\.com/v\\d+\\.\\d+/\\d+/messages', 'api\\.z-api\\.io', 'wa\\.me/'] },
  // arquivos
  { id: 's3', nome: 'S3', assunto: 'arquivos', deps: ['@aws-sdk/client-s3', 'aws-sdk', 'boto3'], env: ['^AWS_ACCESS_KEY_ID$', '^AWS_S3_', '^S3_BUCKET'], codigo: ['new S3Client\\s*\\(', 's3\\.amazonaws\\.com'] },
  { id: 'r2', nome: 'Cloudflare R2', assunto: 'arquivos', env: ['^R2_', '^CLOUDFLARE_R2_'], codigo: ['r2\\.cloudflarestorage\\.com', 'r2_buckets'] },
  { id: 'cloudinary', nome: 'Cloudinary', assunto: 'arquivos', deps: ['cloudinary', 'next-cloudinary'], env: ['^CLOUDINARY_'], codigo: ['res\\.cloudinary\\.com'] },
  { id: 'supabase-storage', nome: 'Supabase Storage', assunto: 'arquivos', codigo: ['\\.storage\\s*\\.from\\s*\\('] },
  // medição
  { id: 'google-analytics', nome: 'Google Analytics', assunto: 'medicao', deps: ['@next/third-parties', 'react-ga4', 'firebase_analytics'], env: ['^NEXT_PUBLIC_GA', '^GA_MEASUREMENT_ID$', '^GTM_'], codigo: ['googletagmanager\\.com', 'gtag\\s*\\(', 'G-[A-Z0-9]{6,}'] },
  { id: 'meta-pixel', nome: 'Meta Pixel', assunto: 'medicao', env: ['^NEXT_PUBLIC_FB_PIXEL', '^META_PIXEL', '^FB_PIXEL'], codigo: ['connect\\.facebook\\.net', 'fbq\\s*\\('] },
  { id: 'posthog', nome: 'PostHog', assunto: 'medicao', deps: ['posthog-js', 'posthog-node'], env: ['POSTHOG'], codigo: ['posthog\\.init\\s*\\('] },
  { id: 'sentry', nome: 'Sentry', assunto: 'medicao', deps: ['@sentry/nextjs', '@sentry/react', '@sentry/node', 'sentry_flutter', 'sentry-sdk'], env: ['^SENTRY_', 'NEXT_PUBLIC_SENTRY'], codigo: ['Sentry\\.init\\s*\\(', 'ingest\\.sentry\\.io'] },
  // ia
  { id: 'openai', nome: 'OpenAI', assunto: 'ia', deps: ['openai', '@ai-sdk/openai'], env: ['^OPENAI_'], codigo: ["from ['\"]openai['\"]", 'new OpenAI\\s*\\(', 'api\\.openai\\.com'] },
  { id: 'anthropic', nome: 'Anthropic', assunto: 'ia', deps: ['@anthropic-ai/sdk', 'anthropic', '@ai-sdk/anthropic'], env: ['^ANTHROPIC_'], codigo: ["from ['\"]@anthropic-ai/sdk['\"]", 'new Anthropic\\s*\\(', 'api\\.anthropic\\.com'] },
  { id: 'gemini', nome: 'Gemini', assunto: 'ia', deps: ['@google/generative-ai', '@google/genai', 'google-generativeai', '@ai-sdk/google'], env: ['^GEMINI_', '^GOOGLE_API_KEY$', '^GOOGLE_GENERATIVE_AI'], codigo: ['generativelanguage\\.googleapis\\.com', 'GoogleGenerativeAI\\s*\\('] },
];

export function servicoPorId(id: string): SinalServico | undefined {
  return SERVICOS.find((s) => s.id === id);
}

/** Passos da leitura pelo squad Product Lab, na ordem. */
export interface PassoLeitura {
  id: string;
  papel: string;
  dono: string;
  doc: string;
  titulo: string;
  secoes: string[];
  assuntos: Assunto[];
}

export const PASSOS_LEITURA: PassoLeitura[] = [
  { id: 'produto', papel: 'Dora', dono: 'Dora · Produto', doc: 'context/produto.md', titulo: 'Produto', secoes: ['O que é', 'Para quem', 'Fluxos principais', 'Telas e rotas'], assuntos: [] },
  { id: 'arquitetura', papel: 'Ari', dono: 'Ari · Arquitetura', doc: 'context/arquitetura.md', titulo: 'Arquitetura', secoes: ['Visão geral', 'Módulos', 'Caminho de um pedido', 'Pontos de extensão'], assuntos: [] },
  { id: 'dados', papel: 'Ari', dono: 'Ari · Arquitetura', doc: 'context/dados.md', titulo: 'Dados', secoes: ['Onde fica o banco', 'Tabelas e modelos', 'Migrações', 'Regras de acesso'], assuntos: ['banco', 'auth'] },
  { id: 'design', papel: 'Enzo', dono: 'Enzo · Design', doc: 'context/design-system.md', titulo: 'Design system', secoes: ['Cores', 'Tipografia', 'Espaçamento e grade', 'Componentes', 'Padrões de tela'], assuntos: [] },
  { id: 'ambiente', papel: 'Ari', dono: 'Ari · Arquitetura', doc: 'context/ambiente.md', titulo: 'Ambiente', secoes: ['Como instalar e rodar', 'Testes', 'Build e deploy', 'Variáveis necessárias', 'CI'], assuntos: ['deploy'] },
  { id: 'integracoes', papel: 'Ari', dono: 'Ari · Arquitetura', doc: 'context/integracoes.md', titulo: 'Integrações', secoes: ['Serviços confirmados', 'Serviços descartados', 'Pagamento', 'Webhooks'], assuntos: ['deploy', 'banco', 'auth', 'pagamento', 'mensagens', 'arquivos', 'medicao', 'ia'] },
  { id: 'riscos', papel: 'Dora', dono: 'Dora · Produto', doc: 'context/riscos.md', titulo: 'Riscos', secoes: ['Quebrado', 'Sem teste', 'Desatualizado', 'Perigoso'], assuntos: [] },
];

export type SituacaoPasso = 'a_fazer' | 'rodando' | 'ok' | 'incompleto';

export interface Retrato {
  versao: 1;
  projeto: string;
  lido_em: string;
  commit: string | null;
  stack: string[];
  linguagens: Array<{ nome: string; arquivos: number }>;
  servicos: Achado[];
  repositorios: Array<{ remote: string; branch: string; ultimo: string }>;
  monorepo: string[];
  dependencias: Array<{ manifesto: string; total: number; principais: string[] }>;
  comandos: Array<{ manifesto: string; nome: string; comando: string }>;
  env: string[];
  designSystem: { sinais: string[] };
  cobertura: Array<{ pasta: string; arquivos: number; situacao: 'lida' | 'parcial' | 'nao_lida' }>;
  passos: Array<{ id: string; situacao: SituacaoPasso; doc?: string; motivo?: string; runId?: string }>;
  aprovado?: { em: string; nota?: string };
}

/** Família de esteira sugerida pela stack: só grava `template_code`; absorvido não percorre esteira. */
export function familiaSugerida(stack: string[], arquivos: number): 'sy' | 'lp' | 'of' {
  const s = stack.join(' ').toLowerCase();
  if (/flutter|react native|next|node|python|electron|backend|go|rust|php|ruby|vue|svelte|solid/.test(s)) return 'sy';
  if (arquivos <= 40) return 'lp';
  return 'sy';
}

/** Pastas que a leitura e a cópia pulam (dependências instaladas, build, caches). `.git` só é pulada na leitura. */
export const SURVEY_SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage', '__pycache__',
  '.venv', 'venv', '.dart_tool', '.gradle', 'ephemeral', '.idea', '.pytest_cache', 'Pods',
]);
