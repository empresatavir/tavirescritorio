import type { ParentProps } from "solid-js";
import { Match, Show, Switch, createEffect, onCleanup } from "solid-js";
import { Navigate, useLocation } from "@solidjs/router";
import { Shell } from "./Shell";
import { officeSession, refreshSession, sessionGateOff, sessionReady } from "../state/session";

export function SessionGate(props: ParentProps) {
  const location = useLocation();

  createEffect(() => {
    location.pathname;
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort("timeout"), 1500);
    void refreshSession(ctrl.signal);
    onCleanup(() => {
      window.clearTimeout(timer);
      ctrl.abort("replaced");
    });
  });

  const authenticated = () => officeSession()?.authenticated === true;
  const setupRequired = () => officeSession()?.setup_required !== false;
  const onboardingComplete = () => officeSession()?.onboarding_complete === true;

  const mustLogin = () =>
    sessionReady() && !sessionGateOff() && !authenticated() && !setupRequired() && location.pathname !== "/login";

  const mustOnboard = () =>
    sessionReady() &&
    !sessionGateOff() &&
    authenticated() &&
    !onboardingComplete() &&
    location.pathname !== "/onboarding";

  return (
    <Show when={location.pathname === "/login" || sessionReady()} fallback={null}>
      <Switch>
        <Match when={location.pathname === "/login"}>{props.children}</Match>
        <Match when={location.pathname === "/onboarding" && authenticated()}>{props.children}</Match>
        <Match when={mustLogin()}>
          <Navigate href="/login" />
        </Match>
        <Match when={mustOnboard()}>
          <Navigate href="/onboarding" />
        </Match>
        <Match when={true}>
          <Shell>{props.children}</Shell>
        </Match>
      </Switch>
    </Show>
  );
}
