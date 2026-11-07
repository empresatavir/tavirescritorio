import { createSignal } from "solid-js";
import { api, type OfficeSession } from "../shared/api/client";

export const [officeSession, setOfficeSession] = createSignal<OfficeSession | null>(null);
export const [sessionReady, setSessionReady] = createSignal(false);
export const [sessionGateOff, setSessionGateOff] = createSignal(false);

export async function refreshSession(signal?: AbortSignal) {
  try {
    const data = await api.getSession(signal);
    if (signal?.reason === "replaced") return;
    setSessionGateOff(false);
    setOfficeSession(data);
    setSessionReady(true);
  } catch {
    if (signal?.reason === "replaced") return;
    setSessionGateOff(true);
    setOfficeSession(null);
    setSessionReady(true);
  }
}
