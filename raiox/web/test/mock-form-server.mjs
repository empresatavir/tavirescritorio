import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.PORT || 8767);
const publicDir = fileURLToPath(new URL("../public/", import.meta.url));
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png" };

createServer(async (request, response) => {
  if (request.url?.includes("/api/forms/") && request.url.endsWith("/status")) {
    response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    response.end(JSON.stringify({ ok: true, stage: 1, mode: "unified", company_name: "Loja Aurora", contact_name: "Marina" }));
    return;
  }
  if (request.method === "POST" && request.url?.includes("/api/forms/")) {
    for await (const _chunk of request) { /* consume the local QA payload */ }
    response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }
  const pathname = request.url?.startsWith("/form/") ? "/form.html" : (request.url || "/form.html").split("?")[0];
  const safePath = pathname.replace(/^\/+/, "").replaceAll("..", "");
  try {
    const body = await readFile(join(publicDir, safePath));
    response.writeHead(200, { "Content-Type": types[extname(safePath)] || "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("not found");
  }
}).listen(port, "127.0.0.1", () => process.stdout.write(`mock ready ${port}\n`));
