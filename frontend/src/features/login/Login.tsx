import { createSignal, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { TvIcon } from "../../shared/components";

/**
 * G9 — Login local com sessão loopback e gestão de acesso do operador.
 * Single-user: secret persistido em localStorage com expiração de 24h.
 */

const SESSION_KEY = "tavir_session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_SECRET = "tavir-local-2024";

interface Session {
  authenticated: boolean;
  loginAt: number;
  user: string;
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: Session = JSON.parse(raw);
    if (Date.now() - session.loginAt > SESSION_TTL_MS) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return getSession()?.authenticated === true;
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function Login() {
  const navigate = useNavigate();
  const [secret, setSecret] = createSignal("");
  const [showPassword, setShowPassword] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [currentSession, setCurrentSession] = createSignal<Session | null>(getSession());

  const handleFillDevKey = () => {
    setSecret(DEFAULT_SECRET);
    setError(null);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Brief simulation for smooth UX
    await new Promise((r) => setTimeout(r, 250));

    if (secret().trim() === DEFAULT_SECRET) {
      const session: Session = {
        authenticated: true,
        loginAt: Date.now(),
        user: "Carlos · CEO",
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      setCurrentSession(session);
      navigate("/sala-operacao");
    } else {
      setError("Chave de acesso inválida. Tente 'tavir-local-2024' para o ambiente local.");
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setCurrentSession(null);
    setSecret("");
    setError(null);
  };

  return (
    <div class="flex h-full w-full items-center justify-center overflow-y-auto bg-[var(--surface-0)] p-6">
      <div class="relative w-full max-w-md overflow-hidden rounded-2xl border border-[rgba(244,246,242,.15)] bg-[#0f1729] p-8 shadow-2xl">
        <div class="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[rgba(183,243,74,0.05)] blur-3xl pointer-events-none" />
        <div class="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-[rgba(27,197,189,0.05)] blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div class="relative z-10 mb-6 flex flex-col items-center text-center">
          <div class="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(244,246,242,.15)] bg-[#131c31] shadow-inner">
            <img
              src="/assets/brand/tavir-symbol-lime.svg"
              alt="TAVIR Símbolo"
              class="h-8 w-8 object-contain"
            />
          </div>
          <h1 class="text-xl font-bold tracking-tight text-[var(--cloud)]">
            TAVIR Escritório
          </h1>
          <p class="mt-1 text-xs text-[var(--t2,#cbd3de)]">
            Acesso Local & Orquestração Operacional
          </p>
          <span class="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-[rgba(244,246,242,.1)] bg-[#070d18] px-3 py-0.5 text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--muted,#aeb7c4)]">
            <span class="h-1.5 w-1.5 rounded-full bg-[var(--lime)] animate-pulse" />
            Loopback 127.0.0.1
          </span>
        </div>

        {/* Active Session View */}
        <Show
          when={!currentSession()}
          fallback={
            <div class="relative z-10 flex flex-col gap-4">
              <div class="rounded-xl border border-[rgba(27,197,189,0.25)] bg-[rgba(27,197,189,0.08)] p-4 text-center">
                <p class="text-xs font-semibold text-[var(--teal,#1BC5BD)]">Sessão Ativa do Operador</p>
                <p class="mt-1 text-sm font-bold text-[var(--cloud)]">{currentSession()?.user}</p>
                <p class="mt-0.5 text-[10px] font-mono text-[var(--muted,#aeb7c4)]">
                  Iniciada em: {new Date(currentSession()!.loginAt).toLocaleTimeString("pt-BR")}
                </p>
              </div>

              <div class="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/sala-operacao")}
                  class="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[var(--lime)] px-4 text-xs font-bold uppercase tracking-wider text-[#0B1220] transition-opacity hover:opacity-90"
                >
                  <TvIcon name="terminal" width={14} height={14} />
                  Entrar na Sala de Operação
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  class="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[rgba(244,246,242,.15)] bg-transparent px-4 text-xs font-medium text-[var(--t2,#cbd3de)] transition-colors hover:bg-[rgba(244,246,242,.05)]"
                >
                  Encerrar Sessão (Logout)
                </button>
              </div>
            </div>
          }
        >
          {/* Login Form */}
          <form onSubmit={handleSubmit} class="relative z-10 flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <div class="flex items-center justify-between">
                <label class="text-[10px] font-mono uppercase tracking-[var(--tracking-label,0.12em)] text-[var(--muted,#aeb7c4)]">
                  Chave de Acesso do Operador
                </label>
                <button
                  type="button"
                  onClick={handleFillDevKey}
                  class="text-[10px] font-mono text-[var(--teal,#1BC5BD)] transition-colors hover:underline"
                >
                  Preencher Chave Dev
                </button>
              </div>

              <div class="relative flex items-center">
                <input
                  type={showPassword() ? "text" : "password"}
                  value={secret()}
                  onInput={(e) => setSecret(e.currentTarget.value)}
                  placeholder="tavir-local-2024"
                  class="h-10 w-full rounded-lg border border-[rgba(244,246,242,.15)] bg-[#070d18] px-3.5 pr-10 text-xs font-mono text-[var(--cloud)] outline-none transition-colors focus:border-[var(--teal,#1BC5BD)] placeholder:text-[var(--muted,#5e6878)]"
                  autofocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword())}
                  class="absolute right-2.5 p-1 text-[var(--muted,#aeb7c4)] transition-colors hover:text-[var(--cloud)]"
                  title={showPassword() ? "Ocultar chave" : "Mostrar chave"}
                >
                  <TvIcon name={showPassword() ? "eye-off" : "eye"} width={14} height={14} />
                </button>
              </div>
            </div>

            <Show when={error()}>
              <div class="rounded-lg border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.1)] p-2.5 text-xs text-[#fca5a5]">
                {error()}
              </div>
            </Show>

            <button
              type="submit"
              disabled={loading() || !secret()}
              class="mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[var(--lime)] px-4 text-xs font-bold uppercase tracking-wider text-[#0B1220] transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading() ? (
                <span>Validando acesso...</span>
              ) : (
                <>
                  <TvIcon name="lock" width={14} height={14} />
                  <span>Acessar Painel</span>
                </>
              )}
            </button>
          </form>
        </Show>

        {/* Footer Note */}
        <div class="mt-6 border-t border-[rgba(244,246,242,.08)] pt-4 text-center">
          <p class="text-[10px] leading-relaxed text-[var(--muted,#aeb7c4)]">
            Ambiente seguro local • Chave padrão de desenvolvimento: <code class="font-mono text-[var(--cloud)]">tavir-local-2024</code>
          </p>
        </div>
      </div>
    </div>
  );
}