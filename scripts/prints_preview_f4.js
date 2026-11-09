const { chromium } = require('playwright-core');
const path = require('path');
const { pathToFileURL } = require('node:url');

const exe = path.join(process.env.TEMP, 'tavir-motion-conformidade', 'motion', 'node_modules', '.remotion', 'chrome-headless-shell', 'win64', 'chrome-headless-shell-win64', 'chrome-headless-shell.exe');
const html = path.join(__dirname, '..', 'relatorios', 'studio', 'F4', 'molduras.html');
const out = path.join(__dirname, '..', 'relatorios', 'studio', 'F4');

(async () => {
  const browser = await chromium.launch({ executablePath: exe, headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 1400 }, deviceScaleFactor: 2 });
  await page.goto(pathToFileURL(html).href, { waitUntil: 'load' });
  for (const id of ['feed', 'reel', 'thumb', 'grid']) {
    await page.locator(`#${id}`).screenshot({ path: path.join(out, `${id}.png`) });
  }
  await browser.close();
  console.log('prints ok');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
