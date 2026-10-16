import { createSignal, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";

/**
 * G9 — Login local com sessão loopback.
 * Single-user: secret rotacionado via localStorage.
 * Sessão expira após 24h (configurável).
 */

const SESSION_KEY = "tavir_session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_SECRET = "tavir-local-2024";

interface Session {
  authenticated: boolean;
  loginAt: number;
}

function getSession(): Session | null {
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

export function Login() {
  const navigate = useNavigate();
  const [secret, setSecret] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(false);

  // Redirect if already authenticated
  if (isLoggedIn()) {
    navigate("/");
    return <></>;
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Simulate brief auth delay for UX
    await new Promise((r) => setTimeout(r, 300));

    if (secret() === DEFAULT_SECRET) {
      const session: Session = {
        authenticated: true,
        loginAt: Date.now(),
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      navigate("/");
    } else {
      setError("Credenciais inválidas");
      setLoading(false);
    }
  };

  return (
    <div class="flex h-full items-center justify-center">
      <div class="w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-8">
        <div class="mb-6 text-center">
          <h1 class="text-[var(--text-h2)] font-bold tracking-[var(--tracking-tight)] text-[var(--text-primary)]">
            TAVIR Escritório
          </h1>
          <p class="mt-2 text-xs text-[var(--text-muted)]">
            Acesso local • Sessão loopback
          </p>
        </div>

        <form onSubmit={handleSubmit} class="flex flex-col gap-4">
          <label class="flex flex-col gap-1.5">
            <span class="text-[10px] font-medium uppercase tracking-[var(--tracking-label)] text-[var(--text-muted)]">
              Chave de acesso
            </span>
            <input
              type="password"
              value={secret()}
              onInput={(e) => setSecret(e.currentTarget.value)}
              placeholder="••••••••"
              class="rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-teal)]"
              autofocus
            />
          </label>

          <Show when={error()}>
            <div class="rounded-[var(--radius-sm)] bg-[rgba(239,68,68,0.1)] px-3 py-2 text-xs text-[var(--danger,#ef4444)]">
              {error()}
            </div>
          </Show>

          <button
            type="submit"
            disabled={loading() || !secret()}
            class="mt-2 rounded-[var(--radius-sm)] bg-[var(--accent-lima)] px-4 py-2.5 text-sm font-semibold text-[#0B1220] transition-opacity duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading() ? "Verificando..." : "Entrar"}
          </button>
        </form>

        <p class="mt-6 text-center text-[10px] text-[var(--text-muted)]">
          Sessão expira em 24h • Secret padrão: tavir-local-2024
        </p>
      </div>
    </div>
  );
}