import { expect, test } from "@playwright/test";

const domains = [
  "Operação",
  "Módulos",
  "Comercial",
  "Social",
  "Conhecimento",
  "Estratégia",
  "Sistema",
];

const redirects: Array<[string, RegExp]> = [
  ["/aprovacoes", /\/decisoes$/],
  ["/bloqueios", /\/decisoes$/],
  ["/alteracoes", /\/decisoes$/],
  ["/visibilidade", /\/analytics$/],
  ["/dados", /\/memoria$/],
  ["/biblioteca", /\/memoria$/],
  ["/projetos", /\/configuracoes$/],
  ["/plataformas", /\/social$/],
  ["/workflows", /\/flow$/],
];

async function box(locator: import("@playwright/test").Locator) {
  const size = await locator.boundingBox();
  expect(size).not.toBeNull();
  return size!;
}

test("shell mede 64, 236 e 64 e lista os sete domínios", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/sala-operacao", { waitUntil: "domcontentloaded" });

  const rail = page.getByRole("navigation", { name: "Domínios" });
  const sub = page.getByRole("complementary", { name: "Menu da área" });
  const header = page.getByRole("banner");

  expect(Math.round((await box(rail)).width)).toBe(64);
  expect(Math.round((await box(sub)).width)).toBe(236);
  expect(Math.round((await box(header)).height)).toBe(64);

  const mark = rail.getByRole("img", { name: "TAVIR" });
  expect(Math.round((await box(mark)).width)).toBe(30);
  expect(Math.round((await box(mark)).height)).toBe(30);

  for (const label of domains) {
    const button = rail.getByRole("button", { name: label });
    const size = await box(button);
    expect(Math.round(size.width)).toBe(44);
    expect(Math.round(size.height)).toBe(44);
  }

  const item = sub.getByRole("button", { name: "Sala de Operação" });
  expect(Math.round((await box(item)).height)).toBe(40);
  expect(Math.round((await box(sub.getByRole("img", { name: "TAVIR" }))).height)).toBe(15);

  await rail.getByRole("button", { name: "Módulos" }).click();
  await expect(page).toHaveURL(/\/modulos$/);
  await expect(sub.getByRole("button", { name: "Visão dos módulos" })).toBeVisible();

  await rail.getByRole("button", { name: "Sistema" }).click();
  await expect(page).toHaveURL(/\/analytics$/);
  await sub.getByRole("button", { name: "Configurações" }).click();
  await expect(page).toHaveURL(/\/configuracoes$/);
});

test("rotas antigas caem nas telas do redesenho", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [from, to] of redirects) {
    await page.goto(from, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(to);
  }
});

test("tema claro mantém rail e menu escuros e inverte o botão", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/sala-operacao", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Alternar tema" }).click();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  const paint = async (locator: import("@playwright/test").Locator, prop: string) =>
    locator.evaluate((el, name) => getComputedStyle(el).getPropertyValue(name), prop);

  const rail = page.getByRole("navigation", { name: "Domínios" });
  const sub = page.getByRole("complementary", { name: "Menu da área" });
  const header = page.getByRole("banner");
  const cta = page.getByRole("button", { name: "Iniciar novo job operacional" });

  expect(await paint(rail, "background-color")).toBe("rgb(7, 13, 24)");
  expect(await paint(sub, "background-color")).toBe("rgb(15, 23, 41)");
  expect(await paint(header, "background-color")).toBe("rgb(244, 246, 242)");
  expect(await paint(cta, "background-color")).toBe("rgb(11, 18, 32)");
  expect(await paint(cta, "color")).toBe("rgb(183, 243, 74)");
});

test("abaixo de 860px a subnav e o texto da busca somem", async ({ page }) => {
  await page.setViewportSize({ width: 860, height: 900 });
  await page.goto("/sala-operacao", { waitUntil: "domcontentloaded" });

  await expect(page.locator("aside.sub")).toBeHidden();
  await expect(page.locator(".search-copy")).toBeHidden();
  expect(Math.round((await box(page.getByRole("navigation", { name: "Domínios" }))).width)).toBe(64);
  expect(Math.round((await box(page.getByRole("banner"))).height)).toBe(64);
});
