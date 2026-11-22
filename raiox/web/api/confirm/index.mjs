import { confirmEmail, json, trustedOrigin } from "../_raiox.mjs";

// G-PR1 controle 4. Só POST: um leitor de e-mail que abre o link (GET) não consome o token.
export const config = { api: { bodyParser: { sizeLimit: "1kb" } } };

export default async function handler(request, response) {
  if (request.method !== "POST") return json(response, 405, { error: "method_not_allowed" });
  try {
    if (!trustedOrigin(request)) return json(response, 403, { error: "invalid_origin" });
    const token = typeof request.body?.token === "string" ? request.body.token : "";
    return (await confirmEmail(token))
      ? json(response, 200, { ok: true })
      : json(response, 400, { error: "invalid_or_used" });
  } catch (error) {
    console.error("raiox_confirm_unavailable", error instanceof Error ? error.message : "unknown_error");
    return json(response, 503, { error: "confirm_unavailable" });
  }
}
