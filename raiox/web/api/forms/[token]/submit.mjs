import { json, submit, trustedOrigin } from "../../_raiox.mjs";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };

export default async function handler(request, response) {
  if (request.method !== "POST") return json(response, 405, { error: "method_not_allowed" });
  try {
    if (!trustedOrigin(request)) return json(response, 403, { error: "invalid_origin" });
    const accepted = await submit(request.query.token, request.query.exp || "", request.query.sig || "", request.body);
    return accepted ? json(response, 200, { ok: true }) : json(response, 400, { error: "invalid_submission" });
  } catch (error) {
    console.error("raiox_submission_unavailable", error instanceof Error ? error.message : "unknown_error");
    return json(response, 503, { error: "submission_unavailable" });
  }
}
