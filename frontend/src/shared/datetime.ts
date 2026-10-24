/** Timestamps do backend SQLite/SQLAlchemy costumam vir sem timezone (UTC naïve). */

const TZ = "America/Sao_Paulo";

export function parseBackendDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  let s = String(iso).trim();
  if (!s) return null;
  // "2026-10-20 05:05:10.123456" ou "2026-10-20T05:05:10" sem Z → tratar como UTC
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(s) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) {
    s = s.replace(" ", "T");
    if (!s.endsWith("Z")) s += "Z";
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatLocalTime(
  iso: string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", second: "2-digit" }
): string {
  const d = parseBackendDate(iso);
  if (!d) return "—";
  return d.toLocaleTimeString("pt-BR", { timeZone: TZ, ...opts });
}
