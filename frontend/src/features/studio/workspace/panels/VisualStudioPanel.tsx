import { For, Show, createMemo, createSignal } from "solid-js";
import { NET_META, type ContentPiece, type ContentProfile, type SocialNet } from "../../demoData";
import { DevicePreview, type DeviceKind } from "../DeviceMockups";

export function VisualStudioPanel(props: {
  profile: ContentProfile;
  pieces: ContentPiece[];
  onCopy: (label: string, text: string) => void;
}) {
  const nets = createMemo((): SocialNet[] =>
    props.profile.nets.length ? props.profile.nets.map((n) => n.net) : ["ig", "yt", "li"],
  );
  const [net, setNet] = createSignal<SocialNet>(nets()[0] || "ig");
  const [device, setDevice] = createSignal<DeviceKind>("smartphone");
  const [mode, setMode] = createSignal<"carousel" | "reel" | "post">("carousel");
  const [slide, setSlide] = createSignal(0);

  const piece = createMemo(() => {
    const list = props.pieces.filter((p) => p.net === net());
    return (
      list.find((p) => p.stage === "review" || (p.slides && p.slides.length > 0)) ||
      list[0] ||
      props.pieces.find((p) => p.stage === "review") ||
      null
    );
  });

  const devicesForNet = createMemo((): Array<{ id: DeviceKind; label: string }> => {
    if (net() === "yt") {
      return [
        { id: "desktop", label: "Computador" },
        { id: "smartphone", label: "Smartphone" },
      ];
    }
    if (net() === "li") {
      return [
        { id: "smartphone", label: "Smartphone" },
        { id: "desktop", label: "Computador" },
      ];
    }
    return [{ id: "smartphone", label: "Smartphone" }];
  });

  const selectNet = (n: SocialNet) => {
    setNet(n);
    setSlide(0);
    if (n === "yt") {
      setDevice("desktop");
      setMode("post");
    } else if (n === "li") {
      setDevice("smartphone");
      setMode("post");
    } else {
      setDevice("smartphone");
      setMode("carousel");
    }
  };

  return (
    <div>
      <div class="stu-ws-page-head">
        <div>
          <p class="stu-ws-eyebrow">Produção visual</p>
          <h1>Studio Visual</h1>
          <p>
            Revise carrosséis e vídeos no contexto real de publicação — smartphone e computador —
            antes de liberar o pacote.
          </p>
        </div>
      </div>

      <div class="stu-visual-platforms">
        <For each={nets()}>
          {(n) => (
            <button type="button" classList={{ "is-on": net() === n }} onClick={() => selectNet(n)}>
              <img src={NET_META[n].logo} alt="" />
              {NET_META[n].label}
            </button>
          )}
        </For>
      </div>

      <Show when={devicesForNet().length > 1}>
        <div class="stu-visual-devices">
          <For each={devicesForNet()}>
            {(d) => (
              <button
                type="button"
                classList={{ "is-on": device() === d.id }}
                onClick={() => setDevice(d.id)}
              >
                {d.label}
              </button>
            )}
          </For>
        </div>
      </Show>

      <div class="stu-card">
        <div class="stu-card-head">
          <h2 class="stu-card-title">
            {piece()?.title
              ? `Pacote final · “${piece()!.title}”`
              : `Prévia · ${NET_META[net()].label}`}
          </h2>
          <Show when={net() === "ig"}>
            <div class="stu-preview-tabs">
              <button
                type="button"
                classList={{ "is-on": mode() === "carousel" }}
                onClick={() => setMode("carousel")}
              >
                Carrossel
              </button>
              <button
                type="button"
                classList={{ "is-on": mode() === "reel" }}
                onClick={() => setMode("reel")}
              >
                Reel
              </button>
            </div>
          </Show>
        </div>

        <div class="stu-review">
          <DevicePreview
            device={device()}
            net={net()}
            profile={props.profile}
            piece={piece()}
            slide={slide()}
            onSlide={setSlide}
            mode={mode()}
          />
          <div class="stu-pub-copy">
            <h3>Conteúdo da publicação</h3>
            <div class="stu-copy-block">
              <header>
                <span>Legenda</span>
                <button type="button" onClick={() => props.onCopy("Legenda", piece()?.caption || "")}>
                  Copiar
                </button>
              </header>
              <p>{piece()?.caption || "Ainda sem legenda nesta peça."}</p>
            </div>
            <div class="stu-copy-block">
              <header>
                <span>CTA</span>
                <button type="button" onClick={() => props.onCopy("CTA", piece()?.cta || "")}>
                  Copiar
                </button>
              </header>
              <p>{piece()?.cta || "—"}</p>
            </div>
            <div class="stu-copy-block">
              <header>
                <span>Hashtags</span>
                <button type="button" onClick={() => props.onCopy("Hashtags", piece()?.tags || "")}>
                  Copiar
                </button>
              </header>
              <p>{piece()?.tags || "—"}</p>
            </div>
            <ul class="stu-checklist">
              <li>Contraste e safe zones validados</li>
              <li>Ortografia revisada</li>
              <li>CTA alinhado à meta do ciclo</li>
              <li>
                Prévia conferida em {device() === "desktop" ? "computador" : "smartphone"}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
