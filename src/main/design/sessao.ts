/**
 * Sessão de referências: um perfil de navegador do Escritório, separado do app e do Chrome pessoal,
 * onde o Carlos entra com a conta dele em sites de referência (Refero, Mobbin…). O Kakashi mede
 * por essa sessão quando o site pede login. Senha nunca passa por aqui: quem digita é o Carlos,
 * na janela. Cookie não vai para agente, pedido, log nem pasta de projeto.
 */

export const REF_PARTITION = 'persist:tavir-referencias';

/** Cookie no formato que o navegador da medição aceita. */
export interface RefCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

const TWO_LEVEL = /\.(com|net|org|gov|edu|co|ac)\.[a-z]{2}$/i;

/** Domínio base do endereço (refero.design, exemplo.com.br). */
export function baseDomain(urlOrHost: string): string {
  let host = String(urlOrHost || '').trim().toLowerCase();
  try {
    if (/^https?:\/\//.test(host)) host = new URL(host).hostname;
  } catch {
    return '';
  }
  host = host.replace(/^\./, '').replace(/^www\./, '');
  const parts = host.split('.').filter(Boolean);
  if (parts.length < 2) return host;
  return parts.slice(TWO_LEVEL.test(host) ? -3 : -2).join('.');
}

const SAME_SITE: Record<string, RefCookie['sameSite']> = { strict: 'Strict', lax: 'Lax', no_restriction: 'None' };

/** Só os cookies do domínio do site pedido: a sessão de um site nunca acompanha a leitura de outro. */
export function cookiesFor(url: string, all: Array<Record<string, any>>): RefCookie[] {
  const base = baseDomain(url);
  if (!base) return [];
  const out: RefCookie[] = [];
  for (const c of all || []) {
    const domain = String(c?.domain || '').toLowerCase();
    const bare = domain.replace(/^\./, '');
    if (!c?.name || !(bare === base || bare.endsWith(`.${base}`))) continue;
    const sameSite = SAME_SITE[String(c.sameSite || '')];
    // «None» sem «secure» é recusado pelo navegador: fica sem o atributo.
    out.push({
      name: String(c.name),
      value: String(c.value ?? ''),
      domain,
      path: String(c.path || '/'),
      ...(typeof c.expirationDate === 'number' ? { expires: Math.floor(c.expirationDate) } : {}),
      httpOnly: Boolean(c.httpOnly),
      secure: Boolean(c.secure),
      ...(sameSite && (sameSite !== 'None' || c.secure) ? { sameSite } : {}),
    });
  }
  return out;
}

/** O endereço final parece tela de login (a sessão não valeu ou venceu)? */
export function looksLikeLogin(finalUrl: string, askedUrl: string): boolean {
  const re = /(^|[/.?=_-])(login|log-in|signin|sign-in|sign_in|signup|sign-up|auth|entrar|sso|oauth)([/.?=&_-]|$)/i;
  const strip = (u: string) => {
    try {
      const x = new URL(u);
      return `${x.hostname}${x.pathname}`;
    } catch {
      return u;
    }
  };
  return re.test(strip(finalUrl)) && !re.test(strip(askedUrl));
}

function refSession(): any | null {
  try {
    const { session } = require('electron');
    return session && session.fromPartition ? session.fromPartition(REF_PARTITION) : null;
  } catch {
    return null;
  }
}

/** Cookies da sessão de referências para o site pedido. Fora do app (script, teste) devolve lista vazia. */
export async function sessionCookies(url: string): Promise<RefCookie[]> {
  const ses = refSession();
  if (!ses) return [];
  try {
    return cookiesFor(url, await ses.cookies.get({}));
  } catch {
    return [];
  }
}

/** Sites com sessão guardada (só o domínio; valor de cookie não sai daqui). */
export async function sessionSites(): Promise<string[]> {
  const ses = refSession();
  if (!ses) return [];
  try {
    const all: Array<Record<string, any>> = await ses.cookies.get({});
    return [...new Set(all.map((c) => baseDomain(String(c.domain || ''))).filter(Boolean))].sort();
  } catch {
    return [];
  }
}

/** Apaga a sessão de referências inteira (sai de todos os sites). */
export async function clearSession(): Promise<{ ok: boolean; error?: string }> {
  const ses = refSession();
  if (!ses) return { ok: false, error: 'Sessão de referências só existe dentro do Escritório.' };
  await ses.clearStorageData();
  return { ok: true };
}

const START_PAGE = `<!doctype html><meta charset="utf-8"><title>Sessão de referências</title>
<style>body{font:15px/1.5 system-ui,sans-serif;background:#0B1220;color:#F4F6F2;max-width:560px;margin:12vh auto;padding:0 24px}
h1{font-size:20px;margin:0 0 8px}p{color:#aab3c0;margin:0 0 20px}form{display:flex;gap:8px}
input{flex:1;padding:10px 12px;border-radius:8px;border:1px solid #2a3550;background:#111a2e;color:inherit;font:inherit}
button{padding:10px 16px;border-radius:8px;border:0;background:#C6F432;color:#0B1220;font:inherit;font-weight:600;cursor:pointer}</style>
<h1>Sessão de referências</h1>
<p>Abra o site e entre com a sua conta. O login fica guardado só nesta janela do Escritório; o Kakashi usa essa sessão para ler páginas que pedem login. Feche a janela quando terminar.</p>
<form onsubmit="event.preventDefault();var v=document.getElementById('u').value.trim();if(v){location.href=/^https?:\\/\\//i.test(v)?v:'https://'+v}">
<input id="u" placeholder="refero.design" autofocus><button>Abrir</button></form>`;

let loginWin: any = null;

/** Abre a janela de login na sessão de referências. Quem entra é o Carlos. */
export function openRefLogin(url?: string): { ok: boolean; error?: string } {
  let electron: any;
  try {
    electron = require('electron');
  } catch {
    return { ok: false, error: 'Janela de login só abre dentro do Escritório.' };
  }
  const { BrowserWindow } = electron;
  const target = /^https?:\/\//i.test(String(url || '')) ? String(url) : `data:text/html;charset=utf-8,${encodeURIComponent(START_PAGE)}`;
  if (loginWin && !loginWin.isDestroyed()) {
    loginWin.focus();
    if (/^https?:/i.test(target)) void loginWin.loadURL(target);
    return { ok: true };
  }
  loginWin = new BrowserWindow({
    width: 1280,
    height: 860,
    title: 'Sessão de referências',
    autoHideMenuBar: true,
    webPreferences: { partition: REF_PARTITION, nodeIntegration: false, contextIsolation: true, sandbox: true },
  });
  // Sem o nome do app e do Electron no agente de usuário: é um Chrome comum para o site.
  // Vale para a sessão inteira, inclusive a janelinha de «Entrar com Google» que o site abre.
  const ua = String(loginWin.webContents.getUserAgent() || '').replace(/\s(?:Electron|tavir[\w-]*)\/[^\s]+/gi, '');
  if (ua) loginWin.webContents.session.setUserAgent(ua);
  loginWin.on('closed', () => { loginWin = null; });
  void loginWin.loadURL(target);
  return { ok: true };
}
