import { createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { api } from "../../shared/api/client";
import { refreshSession } from "../../state/session";
import { ONBOARDING_STEPS } from "./steps";

export function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = createSignal(0);
  const current = () => ONBOARDING_STEPS[step()];
  const last = () => step() === ONBOARDING_STEPS.length - 1;

  const finish = async () => {
    await api.completeOnboarding();
    await refreshSession();
    navigate("/sala-operacao");
  };

  const next = () => {
    if (last()) void finish();
    else setStep(step() + 1);
  };

  return (
    <div class="onb-screen" style={{ "min-height": "100vh", display: "grid", "place-items": "center", padding: "32px 16px", background: "var(--surface-0)", color: "var(--text-primary)" }}>
      <div style={{ width: "min(980px, 100%)", display: "flex", "flex-wrap": "wrap", "border-radius": "22px", overflow: "hidden", border: "1px solid var(--line)", background: "var(--surface-1)" }}>
        <section style={{ flex: "1 1 380px", padding: "36px", background: "#0B1220", color: "#F4F6F2" }}>
          <p>{current().eyebrow}</p>
          <p>{step() + 1} de {ONBOARDING_STEPS.length}</p>
        </section>
        <section style={{ flex: "1 1 420px", padding: "36px", display: "flex", "flex-direction": "column", gap: "16px" }}>
          <h1 style={{ "font-size": "30px", "font-weight": 600, "letter-spacing": "-0.03em" }}>{current().title}</h1>
          <p>{current().text}</p>
          <ul>
            {current().points.map((point) => (
              <li>{point}</li>
            ))}
          </ul>
          <div style={{ display: "flex", gap: "12px", "margin-top": "auto" }}>
            <button type="button" onClick={() => void finish()}>Pular</button>
            <span style={{ flex: 1 }} />
            {step() > 0 ? (
              <button type="button" onClick={() => setStep(step() - 1)}>Voltar</button>
            ) : null}
            <button type="button" onClick={next}>{last() ? "Ir para a Sala" : "Continuar"}</button>
          </div>
        </section>
      </div>
    </div>
  );
}
