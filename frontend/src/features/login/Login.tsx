import { createSignal, onMount, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { api, parseApiError } from "../../shared/api/client";
import { officeSession, refreshSession } from "../../state/session";

const EMPTY = "Informe a chave local para continuar.";

export function Login() {
  const navigate = useNavigate();
  const [secret, setSecret] = createSignal("");
  const [visible, setVisible] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [busy, setBusy] = createSignal(false);

  onMount(() => {
    void refreshSession();
  });

  const enter = async (event: Event) => {
    event.preventDefault();
    if (!secret().trim()) {
      setError(EMPTY);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const state = await api.login(secret());
      setSecret("");
      await refreshSession();
      navigate(state.onboarding_complete ? "/sala-operacao" : "/onboarding");
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.detail || "A chave local não confere.");
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    await api.logout();
    await refreshSession();
    setSecret("");
    setError(null);
  };

  return (
    <div class="login-screen" style={{ "min-height": "100vh", display: "flex", background: "var(--surface-0)", color: "var(--text-primary)" }}>
      <section style={{ flex: "1 1 420px", padding: "64px 48px", background: "#0B1220", color: "#F4F6F2" }}>
        <p style={{ "font-size": "12px", "letter-spacing": "0.14em", "text-transform": "uppercase", color: "#aeb7c4" }}>TAVIR Escritório</p>
        <h1 style={{ "font-size": "40px", "font-weight": 600, "letter-spacing": "-0.04em", "line-height": 1.02, "margin-top": "14px", "max-width": "540px" }}>
          Inteligência que entra em operação.
        </h1>
        <p style={{ color: "#aeb7c4", "margin-top": "16px", "max-width": "460px", "font-size": "16px" }}>
          Orquestre agentes, tasks e entregas a partir desta máquina. Cada passo fica registrado. Cada ação irreversível espera você.
        </p>
      </section>
      <section style={{ flex: "1 1 420px", display: "grid", "place-items": "center", padding: "48px 24px" }}>
        <Show
          when={officeSession()?.authenticated}
          fallback={
            <form onSubmit={enter} style={{ width: "min(400px, 100%)", display: "flex", "flex-direction": "column", gap: "18px" }}>
              <div>
                <div style={{ "font-size": "12px", "letter-spacing": "0.14em", "text-transform": "uppercase", color: "var(--text-muted)" }}>Loopback · 127.0.0.1</div>
                <h2 style={{ "font-size": "28px", "font-weight": 600, "letter-spacing": "-0.03em", "margin-top": "8px" }}>Entrar no escritório</h2>
                <p style={{ "margin-top": "6px", color: "var(--text-secondary)" }}>Use a chave local do operador.</p>
              </div>
              <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
                <label for="chave-acesso">Chave de acesso</label>
                <span style={{ position: "relative" }}>
                  <input
                    id="chave-acesso"
                    name="chave"
                    type={visible() ? "text" : "password"}
                    value={secret()}
                    autocomplete="current-password"
                    placeholder="Digite a chave local"
                    onInput={(e) => {
                      setSecret(e.currentTarget.value);
                      setError(null);
                    }}
                    style={{ width: "100%", height: "44px", "padding-right": "88px", "box-sizing": "border-box" }}
                  />
                  <button type="button" onClick={() => setVisible(!visible())} style={{ position: "absolute", right: "14px", top: "12px" }}>
                    {visible() ? "Ocultar" : "Mostrar"}
                  </button>
                </span>
                <Show when={error()}>
                  <small role="alert" style={{ color: "var(--danger, #d4564e)" }}>{error()}</small>
                </Show>
              </div>
              <button type="submit" disabled={busy()} style={{ height: "46px" }}>
                Acessar painel
              </button>
              <p>A chave não sai desta máquina. A sessão expira depois de 12 h sem uso.</p>
            </form>
          }
        >
          <div style={{ width: "min(400px, 100%)", display: "flex", "flex-direction": "column", gap: "14px" }}>
            <div>
              <div>Sessão ativa</div>
              <b style={{ "font-size": "18px" }}>{officeSession()?.operator || "Carlos · CEO"}</b>
            </div>
            <button type="button" onClick={() => navigate("/sala-operacao")}>Entrar na Sala</button>
            <button type="button" onClick={() => void leave()}>Encerrar sessão</button>
          </div>
        </Show>
      </section>
    </div>
  );
}
