import { createSignal, createEffect } from "solid-js";

interface TvIconProps {
  name?: string;
  logo?: string;
  style?: any;
  class?: string;
  width?: string | number;
  height?: string | number;
}

const svgCache = new Map<string, string>();

function toCssSize(v: string | number | undefined): string {
  if (v === undefined || v === "") return "1em";
  if (typeof v === "number") return `${v}px`;
  return /^\d+(\.\d+)?$/.test(v) ? `${v}px` : v;
}

function sanitizeSvg(raw: string): string {
  return raw
    .replace(/<metadata[\s\S]*?<\/metadata>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg([^>]*?)\swidth="[^"]*"/i, '<svg$1 width="100%"')
    .replace(/<svg([^>]*?)\sheight="[^"]*"/i, '<svg$1 height="100%"');
}

export function TvIcon(props: TvIconProps) {
  const [svgContent, setSvgContent] = createSignal<string>("");

  createEffect(() => {
    const name = props.name;
    const logo = props.logo;

    if (logo) {
      const cleanLogo = logo.replace(/\.svg$/, "").split("/").pop();
      const url = `/assets/logos/${cleanLogo}.svg`;
      if (svgCache.has(url)) {
        setSvgContent(svgCache.get(url)!);
        return;
      }
      fetch(url)
        .then((res) => (res.ok ? res.text() : ""))
        .then((text) => {
          const cleanSvg = sanitizeSvg(text);
          svgCache.set(url, cleanSvg);
          setSvgContent(cleanSvg);
        })
        .catch(() => {});
      return;
    }

    if (name) {
      const cleanName = name.replace(/\.svg$/, "");
      const url = `/assets/icons/${cleanName}.svg`;
      if (svgCache.has(url)) {
        setSvgContent(svgCache.get(url)!);
        return;
      }
      fetch(url)
        .then((res) => (res.ok ? res.text() : ""))
        .then((text) => {
          const cleanSvg = sanitizeSvg(text);
          svgCache.set(url, cleanSvg);
          setSvgContent(cleanSvg);
        })
        .catch(() => {});
    }
  });

  return (
    <span
      class={`tv-icon-wrapper ${props.class || ""}`}
      style={{
        display: "inline-flex",
        "align-items": "center",
        "justify-content": "center",
        width: toCssSize(props.width),
        height: toCssSize(props.height),
        flex: "none",
        "line-height": 0,
        overflow: "hidden",
        ...props.style,
      }}
      innerHTML={svgContent()}
    />
  );
}
