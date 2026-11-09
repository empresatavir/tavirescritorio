import { json, sessionFor } from "../../_raiox.mjs";

export default async function handler(request, response) {
  if (request.method !== "GET") return json(response, 405, { error: "method_not_allowed" });
  try {
    const session = await sessionFor(request.query.token, request.query.exp || "", request.query.sig || "");
    const companyName = String(session?.raiox_cases?.company_name || "").slice(0, 140);
    const contactName = String(session?.raiox_cases?.contact_name || "").slice(0, 120);
    return session
      ? json(response, 200, {
          ok: true, stage: session.stage, mode: session.stage === 1 ? "unified" : "legacy",
          company_name: companyName, contact_name: contactName,
        })
      : json(response, 404, { error: "unavailable" });
  } catch (error) {
    console.error("raiox_status_unavailable", error instanceof Error ? error.message : "unknown_error");
    return json(response, 503, { error: "unavailable" });
  }
}
