import { A } from "@solidjs/router";
import { For, Show, createSignal, type JSX } from "solid-js";
import { api } from "../../shared/api/client";

export type MotorCard = Awaited<ReturnType<typeof api.listMotors>>["motors"][number];

const ICONES: Record<string, JSX.Element> = {
  cursor: (
    <svg viewBox="0 0 24 24" width="18px" height="18px" aria-hidden="true">
      <path d="M13 2 4 14h7l-1 8 10-14h-7l0-6z" />
    </svg>
  ),
  claude: (
    <svg viewBox="0 0 24 24" width="18px" height="18px" aria-hidden="true">
      <path d="M12 3.2 13.6 8 18.4 9.2 13.6 10.8 12 15.6 10.4 10.8 5.6 9.2 10.4 8 12 3.2zM18 14.2l.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7.7-2.1z" />
    </svg>
  ),
  codex: (
    <svg viewBox="0 0 24 24" width="18px" height="18px" aria-hidden="true">
      <path d="M9.2 7.2 4.6 12l4.6 4.8-1.5 1.4L1.8 12l5.9-6.2 1.5 1.4zm5.6 0 1.5-1.4L22.2 12l-5.9 6.2-1.5-1.4 4.6-4.8-4.6-4.8z" />
    </svg>
  ),
  antigravity: (
    <svg viewBox="0 0 24 24" width="18px" height="18px" aria-hidden="true">
      <path d="M12 3.2a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6zM5.2 16.2a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6zM18.8 16.2a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6zM11.15 7.1 6.7 15.4h1.85l2.5-4.5 2.5 4.5h1.85L12.85 7.1h-1.7z" />
    </svg>
  ),
};

function meta(motor: MotorCard) {
  const faltas: string[] = [];
  if (!motor.local) faltas.push("Instalação ausente");
  if (!motor.logged_in) faltas.push("Sem login");
  if (motor.id !== "cursor" && !motor.has_key) faltas.push("Sem chave");
  if (faltas.length) return { texto: faltas.join(" · "), falta: true };
  const ok: string[] = [];
  if (motor.logged_in) ok.push("Login feito");
  if (motor.has_key) ok.push("Chave disponível");
  if (motor.sdk) ok.push("SDK encontrado");
  if (!ok.length) ok.push("Instalado");
  return { texto: ok.join(" · "), falta: false };
}

function estado(motor: MotorCard) {
  if (motor.is_default) return "Padrão";
  return motor.plugged ? "Conectado" : "Sem conexão";
}

export function GradeMotores(props: {
  modo: "integracoes" | "motor";
  motors: MotorCard[];
  chaves: Record<string, { api_key: string; base_url: string }>;
  onChave: (id: string, apiKey: string, baseUrl: string) => void;
  onToggle: (motor: MotorCard) => void;
  onDefault: (motor: MotorCard) => void;
  onPlug: (motor: MotorCard) => void;
  onLogin: (motor: MotorCard) => void;
}) {
  const [visivel, setVisivel] = createSignal<Record<string, boolean>>({});
  const total = () => props.motors.length;
  const conectados = () => props.motors.filter((item) => item.plugged).length;
  const ativos = () => props.motors.filter((item) => item.enabled).length;
  const temPadrao = () => props.motors.some((item) => item.is_default);

  return (
    <div class="motor-grade">
      <header class="motor-topo">
        <div>
          <h2>{props.modo === "integracoes" ? "Integrações" : "Motor IA"}</h2>
          <p>
            {props.modo === "integracoes"
              ? "Login, chave e interruptor de cada motor."
              : "Ligue um motor conectado e marque o padrão do chat."}
          </p>
        </div>
        <span class="vpr-conta">
          {props.modo === "integracoes" ? `${conectados()}/${total()} conectados` : `${ativos()} de ${total()}`}
        </span>
      </header>

      <Show when={props.modo === "motor" && props.motors.length > 0 && !temPadrao()}>
        <div class="aviso-faixa" data-tom="info">Nenhum motor padrão definido. Conecte uma integração e marque como padrão.</div>
      </Show>

      <div class="motor-grid">
        <For each={props.motors}>
          {(motor) => {
            const chave = () => props.chaves[motor.id] || { api_key: "", base_url: "" };
            const linha = () => meta(motor);
            const rotulo = () => estado(motor);
            return (
              <article class="cartao motor-card" data-tom={motor.id} data-padrao={motor.is_default ? "sim" : "nao"}>
                <header class="motor-card-topo">
                  <span class="motor-icone" style={{ width: "36px", height: "36px" }}>{ICONES[motor.id]}</span>
                  <div class="motor-nome">
                    <strong>{motor.label}</strong>
                    <span class="vc-status" data-on={rotulo() === "Sem conexão" ? "nao" : "sim"}>{rotulo()}</span>
                  </div>
                </header>
                <p class="motor-meta" data-falta={linha().falta ? "sim" : "nao"}>{linha().texto}</p>

                <div class="motor-zona">
                  <label class="interruptor motor-liga">
                    <input
                      type="checkbox"
                      checked={motor.enabled}
                      disabled={!motor.plugged && !motor.enabled}
                      onChange={() => props.onToggle(motor)}
                    />
                    <span class="interruptor-trilha" />
                    <span class="interruptor-textos">
                      <strong>{motor.enabled ? "Ligada" : "Desligada"}</strong>
                      <Show when={!motor.plugged && !motor.enabled}>
                        <span>Conecte antes de ligar.</span>
                      </Show>
                    </span>
                  </label>

                  <Show when={props.modo === "integracoes"}>
                    <div class="motor-botoes">
                      <Show when={motor.id === "cursor" || motor.id === "claude" || motor.id === "codex" || motor.id === "antigravity"}>
                        <button
                          class={motor.id === "cursor" ? "btn btn-primario" : "btn"}
                          type="button"
                          disabled={!motor.local}
                          onClick={() => props.onLogin(motor)}
                        >
                          {motor.id === "antigravity" ? "Abrir e entrar" : motor.logged_in ? "Entrar de novo" : "Fazer login e conectar"}
                        </button>
                      </Show>
                      <Show when={motor.login_url}>
                        <a class="btn" href={motor.login_url!}>Abrir o login</a>
                      </Show>
                    </div>
                    <Show when={motor.id !== "cursor"}>
                      <label class="campo">
                        <span class="campo-rotulo">Chave de API</span>
                        <span class="motor-chave">
                          <input
                            class="entrada"
                            type={visivel()[motor.id] ? "text" : "password"}
                            autocomplete="off"
                            placeholder={motor.has_key ? "Chave guardada — cole outra para trocar" : "Cole a chave aqui"}
                            value={chave().api_key}
                            onInput={(event) => props.onChave(motor.id, event.currentTarget.value, chave().base_url)}
                          />
                          <button class="btn btn-discreto motor-ver" type="button" onClick={() => setVisivel((prev) => ({ ...prev, [motor.id]: !prev[motor.id] }))}>
                            {visivel()[motor.id] ? "ocultar" : "ver"}
                          </button>
                        </span>
                      </label>
                      <Show when={motor.id === "antigravity"}>
                        <label class="campo">
                          <span class="campo-rotulo">Endereço da API</span>
                          <input
                            class="entrada"
                            type="url"
                            placeholder="https://api.exemplo.com/v1"
                            value={chave().base_url}
                            onInput={(event) => props.onChave(motor.id, chave().api_key, event.currentTarget.value)}
                          />
                        </label>
                      </Show>
                      <button class="btn btn-primario" type="button" onClick={() => props.onPlug(motor)}>Plugar</button>
                    </Show>
                  </Show>

                  <Show when={props.modo === "motor"}>
                    <div class="motor-botoes">
                      <Show when={!motor.plugged}>
                        <A class="btn" href="/configuracoes/credenciais">Configure em Integrações primeiro</A>
                      </Show>
                      <button
                        class={motor.enabled && !motor.is_default ? "btn btn-primario" : "btn"}
                        type="button"
                        disabled={!motor.enabled || motor.is_default}
                        onClick={() => props.onDefault(motor)}
                      >
                        {motor.is_default ? "Padrão" : "Tornar padrão"}
                      </button>
                    </div>
                  </Show>
                </div>
              </article>
            );
          }}
        </For>
      </div>
    </div>
  );
}
