import { For, Show, type JSX } from "solid-js";
import type { ContentPiece, ContentProfile, SocialNet } from "../demoData";

export type DeviceKind = "smartphone" | "desktop";

function SlideBody(props: {
  text: string;
  handle: string;
  accent?: string;
}) {
  const parts = () => props.text.split("\n");
  return (
    <div class="stu-slide-body">
      <h4>
        {parts()[0]}
        <Show when={parts()[1]}>
          <br />
          <em style={props.accent ? { color: props.accent } : undefined}>{parts()[1]}</em>
        </Show>
      </h4>
      <p>@{props.handle.replace(/^@/, "")}</p>
    </div>
  );
}

/** Chassis CSS estilo iPhone — sem PNG stock (evita sombra/enquadramento quebrado). */
function SmartphoneFrame(props: {
  profile: ContentProfile;
  children: JSX.Element;
  footer?: JSX.Element;
  net: SocialNet;
}) {
  return (
    <div class="stu-phone" data-device="smartphone" data-net={props.net}>
      <div class="stu-phone-shell" aria-hidden="true">
        <span class="stu-phone-btn stu-phone-btn-silent" />
        <span class="stu-phone-btn stu-phone-btn-vol-up" />
        <span class="stu-phone-btn stu-phone-btn-vol-down" />
        <span class="stu-phone-btn stu-phone-btn-power" />
      </div>
      <div class="stu-phone-glass">
        <div class="stu-phone-island" aria-hidden="true" />
        <div class="stu-phone-app">
          <header class="stu-phone-app-head">
            <div class="stu-phone-avatar" style={{ background: props.profile.color }}>
              {props.profile.initials}
            </div>
            <div class="stu-phone-app-meta">
              <strong>
                {props.net === "li"
                  ? props.profile.name
                  : props.profile.handle.replace(/^@/, "")}
              </strong>
              <span>
                {props.net === "li"
                  ? props.profile.company
                  : props.net === "yt"
                    ? "YouTube"
                    : "Instagram"}
              </span>
            </div>
          </header>
          <div class="stu-phone-viewport">{props.children}</div>
          {props.footer}
          <div class="stu-phone-home" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

function DesktopChrome(props: {
  title: string;
  url: string;
  children: JSX.Element;
}) {
  return (
    <div class="stu-desktop">
      <div class="stu-desktop-chrome">
        <div class="stu-desktop-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div class="stu-desktop-url">{props.url}</div>
      </div>
      <div class="stu-desktop-body">
        <div class="stu-desktop-titlebar">{props.title}</div>
        {props.children}
      </div>
    </div>
  );
}

export function DevicePreview(props: {
  device: DeviceKind;
  net: SocialNet;
  profile: ContentProfile;
  piece?: ContentPiece | null;
  slide: number;
  onSlide: (n: number) => void;
  mode: "carousel" | "reel" | "post";
}) {
  const slides = () =>
    props.piece?.slides?.length
      ? props.piece.slides
      : ["Prévia do conteúdo\nem preparação.", "O squad ainda está produzindo esta peça."];

  const handle = () => props.profile.handle;
  const accent = () => props.profile.color || "var(--lime, #b7f34a)";

  const feedSlide = (opts?: { linkedInMobile?: boolean }) => (
    <div
      class="stu-mock-slide"
      classList={{
        "is-reel": props.mode === "reel",
        "is-li-mobile": !!opts?.linkedInMobile,
      }}
    >
      <SlideBody text={slides()[props.slide] || slides()[0]} handle={handle()} accent={accent()} />
    </div>
  );

  const slideNav = () => (
    <Show when={props.mode === "carousel" && slides().length > 1}>
      <div class="stu-slide-nav">
        <For each={slides()}>
          {(_, i) => (
            <button
              type="button"
              classList={{ "is-on": props.slide === i() }}
              onClick={() => props.onSlide(i())}
            >
              {String(i() + 1).padStart(2, "0")}
            </button>
          )}
        </For>
      </div>
    </Show>
  );

  const linkedInMobileBody = () => (
    <div class="stu-li-mobile">
      <p class="stu-li-mobile-caption">
        {props.piece?.caption || props.piece?.title || "Post LinkedIn em preparação."}
      </p>
      {feedSlide({ linkedInMobile: true })}
      <div class="stu-li-mobile-actions" aria-hidden="true">
        <span>Curtir</span>
        <span>Comentar</span>
        <span>Compartilhar</span>
      </div>
    </div>
  );

  return (
    <div class="stu-mock-stage">
      <Show when={props.device === "smartphone"}>
        <SmartphoneFrame
          profile={props.profile}
          net={props.net}
          footer={props.net === "ig" ? slideNav() : undefined}
        >
          <Show when={props.net === "ig"}>{feedSlide()}</Show>
          <Show when={props.net === "li"}>{linkedInMobileBody()}</Show>
          <Show when={props.net === "yt"}>
            <div class="stu-yt-mobile">
              <div class="stu-mock-yt-thumb stu-yt-mobile-thumb">
                <strong>{props.piece?.title || "Thumbnail"}</strong>
              </div>
              <div class="stu-mock-yt-meta stu-yt-mobile-meta">
                <strong>{props.piece?.title || "Vídeo em produção"}</strong>
                <p>
                  {props.profile.name} · {props.piece?.subtitle || "roteiro"}
                </p>
              </div>
            </div>
          </Show>
        </SmartphoneFrame>
      </Show>

      <Show when={props.device === "desktop"}>
        <DesktopChrome
          title={
            props.net === "yt"
              ? "YouTube Studio · prévia"
              : props.net === "li"
                ? "LinkedIn · prévia desktop"
                : "Prévia desktop"
          }
          url={
            props.net === "yt"
              ? "youtube.com/watch?v=preview"
              : props.net === "li"
                ? "linkedin.com/feed"
                : "instagram.com"
          }
        >
          <Show when={props.net === "yt"}>
            <div class="stu-mock-yt-thumb">
              <strong>{props.piece?.title || "Thumbnail · prévia do episódio"}</strong>
            </div>
            <div class="stu-mock-yt-meta is-desktop">
              <strong>{props.piece?.title || "Vídeo em produção"}</strong>
              <p class="stu-yt-line">
                {props.profile.name} · canal · {props.piece?.subtitle || "roteiro em andamento"}
              </p>
              <p class="stu-yt-desc">
                {props.piece?.caption || "Descrição e timestamps serão montados pelo squad."}
              </p>
            </div>
          </Show>
          <Show when={props.net !== "yt"}>
            <div class="stu-desktop-feed">
              <div class="stu-phone-app-head stu-desktop-author">
                <div
                  class="stu-phone-avatar is-lg"
                  style={{ background: props.profile.color }}
                >
                  {props.profile.initials}
                </div>
                <div class="stu-phone-app-meta">
                  <strong>{props.profile.name}</strong>
                  <span>{props.profile.company}</span>
                </div>
              </div>
              <p class="stu-desktop-caption">
                {props.piece?.caption || props.piece?.title || "Post em preparação."}
              </p>
              {feedSlide()}
            </div>
          </Show>
        </DesktopChrome>
      </Show>

      <p class="stu-device-caption">
        {props.device === "smartphone" ? "Smartphone · visão mobile" : "Desktop · visão computador"}
        {" · "}
        {props.net === "ig" ? "1080×1350" : props.net === "yt" ? "1920×1080" : "1200×1200"}
      </p>
    </div>
  );
}
