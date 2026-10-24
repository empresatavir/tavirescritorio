import { createSignal } from "solid-js";

/** Falha de comunicação com o motor de IA. Fica até a pessoa fechar. */
export const [aiLinkAlert, setAiLinkAlert] = createSignal<string | null>(null);

export function reportAiLinkFailure(message: string) {
  let text = String(message || "").replace(/^API \d+:\s*/, "");
  const hadHtml = /<!doctype|<html|<!\[endif\]/i.test(text);
  if (hadHtml) {
    const bits = [
      /524/.test(text)
        ? "O Ghost estourou o tempo (HTTP 524). A entrega não saiu."
        : "O Ghost devolveu uma página de erro. A entrega não saiu.",
    ];
    if (/cursor/i.test(text)) {
      bits.push("O Cursor está ligado, mas falta o login. Em Integrações, use Entrar no Cursor.");
    }
    text = bits.join(" ");
  }
  text = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return;
  setAiLinkAlert(text.slice(0, 420));
}

export function clearAiLinkAlert() {
  setAiLinkAlert(null);
}
