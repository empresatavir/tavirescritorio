import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const cssPath = path.resolve("src/styles/motion.css");
const refPath = path.resolve("../visual/motion-reference.json");

function norm(value: string) {
  return value.replace(/\s+/g, "").replace(/;}/g, "}");
}

function keyframes(css: string) {
  const found = new Map<string, string>();
  const re = /@keyframes\s+([a-z0-9-]+)\s*\{/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(css))) {
    const name = match[1];
    let i = re.lastIndex;
    let depth = 1;
    while (i < css.length && depth > 0) {
      if (css[i] === "{") depth += 1;
      else if (css[i] === "}") depth -= 1;
      i += 1;
    }
    found.set(name, norm(css.slice(re.lastIndex, i - 1)));
  }
  return found;
}

function ms(value: string) {
  const n = Number.parseFloat(value);
  if (value.endsWith("ms")) return n;
  if (value.endsWith("s")) return n * 1000;
  return n;
}

const harness = `
<div class="tv">
  <i class="live-dot" data-probe="live"></i>
  <i class="live-dot warn" data-probe="warn"></i>
  <div class="screen" data-probe="screen"></div>
  <div class="back" data-probe="back"></div>
  <div class="bubble" data-probe="bubble"></div>
  <div class="kcard" data-probe="kcard"></div>
  <div class="fill run" data-probe="sweep"></div>
  <div class="fill" data-probe="fill"></div>
  <div class="chart-bars"><i class="b" data-probe="grow"></i></div>
  <div class="modal" data-probe="modal"></div>
  <div class="drawer" data-probe="drawer"></div>
  <div class="toast" data-probe="toast"></div>
  <div class="pal" data-probe="pal"></div>
  <div class="tour" data-probe="tour"></div>
  <div class="spot" data-probe="spot"></div>
  <div class="typing"><i data-probe="b1"></i><i data-probe="b2"></i><i data-probe="b3"></i></div>
  <div class="log"><div data-probe="log"></div></div>
  <div class="shimmer" data-probe="shimmer"></div>
  <div class="draw" data-probe="draw"></div>
  <div class="spin" data-probe="spin"></div>
  <div class="rail-btn" data-probe="rail"></div>
  <div class="nav-item" data-probe="nav"></div>
  <div class="lift" data-probe="lift"></div>
  <div class="tgl" data-probe="tgl"></div>
  <div data-probe="stamp" style="animation: stamp 420ms var(--ease) both"></div>
  <div data-probe="slideup" style="animation: slideup 220ms var(--ease) both"></div>
  <div data-probe="growx" style="animation: growx 600ms var(--ease) both"></div>
  <div data-probe="flowdot" style="animation: flowdot 1.8s linear infinite"></div>
  <div data-probe="ringwarn" style="animation: ringwarn 2s var(--ease) infinite"></div>
</div>`;

test("keyframes do CSS batem com o HTML", () => {
  const css = fs.readFileSync(cssPath, "utf8");
  const ref = JSON.parse(fs.readFileSync(refPath, "utf8")) as { keyframes: Record<string, string> };
  const got = keyframes(css);
  expect([...got.keys()].sort()).toEqual(Object.keys(ref.keyframes).sort());
  for (const [name, body] of Object.entries(ref.keyframes)) {
    expect(got.get(name), name).toBe(body);
  }
  expect(css).toContain("--ease: cubic-bezier(.2, .7, .2, 1)");
  expect(css).toContain("--fast: 120ms");
  expect(css).toContain("--std: 180ms");
  expect(css).toContain("animation-duration: 1ms !important");
});

test("estilo computado segue os tempos do HTML", async ({ page }) => {
  const css = fs.readFileSync(cssPath, "utf8");
  await page.setContent(`<!doctype html><style>${css}</style>${harness}`);
  const read = (probe: string, pseudo?: string) =>
    page.locator(`[data-probe="${probe}"]`).evaluate((el, pseudoEl) => {
      const cs = getComputedStyle(el, pseudoEl || null);
      return {
        name: cs.animationName,
        duration: cs.animationDuration,
        timing: cs.animationTimingFunction,
        iteration: cs.animationIterationCount,
        fill: cs.animationFillMode,
        delay: cs.animationDelay,
        transitionDuration: cs.transitionDuration,
        transitionTiming: cs.transitionTimingFunction,
      };
    }, pseudo ?? "");

  const expectAnim = async (
    probe: string,
    name: string,
    durationMs: number,
    timing: string,
    iteration: string,
    fill: string,
    pseudo?: string,
  ) => {
    const got = await read(probe, pseudo);
    expect(got.name, probe).toBe(name);
    expect(Math.abs(ms(got.duration) - durationMs), probe).toBeLessThan(1);
    expect(got.timing, probe).toBe(timing);
    expect(got.iteration, probe).toBe(iteration);
    expect(got.fill, probe).toBe(fill);
    return got;
  };

  const ease = "cubic-bezier(0.2, 0.7, 0.2, 1)";
  await expectAnim("live", "pulse", 2400, ease, "infinite", "none");
  expect((await read("warn")).name).toBe("none");
  await expectAnim("screen", "fade", 180, ease, "1", "both");
  await expectAnim("sweep", "sweep", 1800, "linear", "infinite", "none");
  await expectAnim("grow", "grow", 700, ease, "1", "both");
  await expectAnim("modal", "rise", 240, ease, "1", "both");
  await expectAnim("drawer", "slidein", 260, ease, "1", "both");
  await expectAnim("toast", "toast", 280, ease, "1", "both");
  await expectAnim("pal", "rise", 200, ease, "1", "both");
  await expectAnim("tour", "rise", 260, ease, "1", "both");
  await expectAnim("spot", "spot", 1800, ease, "infinite", "none", "::after");
  await expectAnim("shimmer", "shimmer", 1300, "linear", "infinite", "none");
  await expectAnim("draw", "dash", 1400, ease, "1", "forwards");
  await expectAnim("spin", "spin", 1000, "linear", "infinite", "none");
  await expectAnim("stamp", "stamp", 420, ease, "1", "both");
  await expectAnim("slideup", "slideup", 220, ease, "1", "both");
  await expectAnim("growx", "growx", 600, ease, "1", "both");
  await expectAnim("flowdot", "flowdot", 1800, "linear", "infinite", "none");
  await expectAnim("ringwarn", "ringwarn", 2000, ease, "infinite", "none");

  const b2 = await read("b2");
  expect(Math.abs(ms(b2.delay) - 200)).toBeLessThan(1);
  const b3 = await read("b3");
  expect(Math.abs(ms(b3.delay) - 400)).toBeLessThan(1);

  const rail = await read("rail");
  expect(ms(rail.transitionDuration.split(",")[0].trim())).toBe(120);
  const lift = await read("lift");
  expect(ms(lift.transitionDuration.split(",")[0].trim())).toBe(180);
});

test("reduced-motion reduz para 1ms e uma iteração", async ({ page }) => {
  const css = fs.readFileSync(cssPath, "utf8");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setContent(`<!doctype html><style>${css}</style>${harness}`);
  const got = await page.locator(`[data-probe="live"]`).evaluate((el) => {
    const cs = getComputedStyle(el);
    return { duration: cs.animationDuration, iteration: cs.animationIterationCount };
  });
  expect(Math.abs(ms(got.duration) - 1)).toBeLessThan(0.2);
  expect(got.iteration).toBe("1");
});
