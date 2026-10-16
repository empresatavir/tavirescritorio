#!/usr/bin/env node
/**
 * Deterministic, manifest-driven web screenshot capture.
 * Install `playwright` in the project (npm install --save-dev playwright) and
 * install a browser (npx playwright install chromium), then run this script
 * from that project directory.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { collectSemanticInventory, writeSemanticArtifacts } from './semantic_inventory.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const cwdRequire = createRequire(path.resolve(process.cwd(), '__reference_fidelity_runner__.cjs'));
let chromium;
try {
  ({ chromium } = cwdRequire('playwright'));
} catch (err) {
  console.error('Playwright is not resolvable from the current project. Run: npm install --save-dev playwright');
  console.error(`Run this script from the project root. Details: ${err.message}`);
  process.exit(2);
}

function argsOf(argv) {
  const out = { side: 'both', headed: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--headed') out.headed = true;
    else if (a === '--manifest') out.manifest = argv[++i];
    else if (a === '--side') out.side = argv[++i];
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!out.manifest) throw new Error('Required: --manifest path/to/playwright-screens.json');
  if (!['reference', 'candidate', 'both'].includes(out.side)) throw new Error('--side must be reference, candidate, or both');
  return out;
}

function absoluteUrl(value, manifestDir, base) {
  if (!value) throw new Error('Missing URL for this side or screen.');
  try { return new URL(value).href; } catch {}
  if (base) return new URL(value, base).href;
  return pathToFileURL(path.resolve(manifestDir, value)).href;
}

function safeRelativeFilename(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Screen needs a non-empty id or file.');
  const normalized = value.replaceAll('\\', '/');
  if (normalized.startsWith('/') || normalized.split('/').some(part => part === '..')) {
    throw new Error(`Screenshot path must stay inside output directory: ${value}`);
  }
  return normalized.toLowerCase().endsWith('.png') ? normalized : `${normalized}.png`;
}

function locatorFor(page, action) {
  let locator;
  if (action.selector) locator = page.locator(action.selector);
  else if (action.role) {
    const options = { exact: action.exact !== false };
    if (action.name !== undefined) options.name = action.name;
    locator = page.getByRole(action.role, options);
  } else if (action.text !== undefined) {
    locator = page.getByText(action.text, { exact: action.exact !== false });
  } else if (action.testId) locator = page.getByTestId(action.testId);
  else throw new Error(`Action '${action.type}' needs selector, role/name, text, or testId.`);
  if (action.nth !== undefined) locator = locator.nth(action.nth);
  return locator;
}

async function runAction(page, action, manifestDir, timeout) {
  switch (action.type) {
    case 'goto': {
      const url = absoluteUrl(action.url, manifestDir, page.url());
      await page.goto(url, { waitUntil: action.waitUntil ?? 'domcontentloaded', timeout: action.timeout ?? timeout });
      return;
    }
    case 'click': await locatorFor(page, action).click({ timeout: action.timeout ?? timeout }); return;
    case 'fill': await locatorFor(page, action).fill(String(action.value ?? ''), { timeout: action.timeout ?? timeout }); return;
    case 'press': await locatorFor(page, action).press(action.key, { timeout: action.timeout ?? timeout }); return;
    case 'check': await locatorFor(page, action).check({ timeout: action.timeout ?? timeout }); return;
    case 'uncheck': await locatorFor(page, action).uncheck({ timeout: action.timeout ?? timeout }); return;
    case 'selectOption': await locatorFor(page, action).selectOption(action.value, { timeout: action.timeout ?? timeout }); return;
    case 'hover': await locatorFor(page, action).hover({ timeout: action.timeout ?? timeout }); return;
    case 'waitFor': await locatorFor(page, action).waitFor({ state: action.state ?? 'visible', timeout: action.timeout ?? timeout }); return;
    case 'assertVisible': {
      const locator = locatorFor(page, action);
      await locator.waitFor({ state: 'visible', timeout: action.timeout ?? timeout });
      return;
    }
    case 'assertText': {
      const locator = locatorFor(page, action);
      await locator.waitFor({ state: 'visible', timeout: action.timeout ?? timeout });
      const text = await locator.innerText({ timeout: action.timeout ?? timeout });
      if (!text.includes(String(action.contains ?? ''))) {
        throw new Error(`Expected text containing '${action.contains}' but found '${text.slice(0, 250)}'.`);
      }
      return;
    }
    case 'waitMs': {
      const ms = Number(action.ms);
      if (!Number.isFinite(ms) || ms < 0 || ms > 10000) throw new Error('waitMs must be between 0 and 10000. Prefer a semantic waitFor action.');
      await page.waitForTimeout(ms);
      return;
    }
    default: throw new Error(`Unsupported action type: ${action.type}`);
  }
}

async function captureOne(browser, manifest, manifestDir, sideName, screen, globalSide, opts) {
  const sideConfig = screen[sideName] ?? {};
  const defaultConfig = globalSide ?? {};
  const urlValue = sideConfig.url ?? defaultConfig.url;
  if (!urlValue) throw new Error(`No ${sideName}.url configured for screen '${screen.id}'.`);
  const startUrl = absoluteUrl(urlValue, manifestDir);
  const viewport = { ...(manifest.viewport ?? {}), ...(screen.viewport ?? {}) };
  if (!Number.isInteger(viewport.width) || !Number.isInteger(viewport.height)) {
    throw new Error(`Manifest needs integer viewport.width and viewport.height (screen '${screen.id}').`);
  }
  const timeout = sideConfig.timeoutMs ?? defaultConfig.timeoutMs ?? manifest.timeoutMs ?? 15000;
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor ?? 1,
    locale: manifest.locale ?? 'pt-BR',
    timezoneId: manifest.timezoneId ?? 'America/Sao_Paulo',
    colorScheme: manifest.colorScheme ?? 'light',
    ...(viewport.isMobile ? { isMobile: true, hasTouch: true } : {}),
  });
  const page = await context.newPage();
  try {
    await page.goto(startUrl, { waitUntil: sideConfig.waitUntil ?? 'domcontentloaded', timeout });
    for (const action of (sideConfig.actions ?? [])) await runAction(page, action, manifestDir, timeout);
    const waitFor = sideConfig.waitFor ?? screen.waitFor;
    if (waitFor) await runAction(page, { type: 'waitFor', ...waitFor }, manifestDir, timeout);
    // Wait for installed/local web fonts without treating optional font failures as an indefinite stall.
    await page.evaluate(async () => {
      if (!document.fonts?.ready) return;
      await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 8000))]);
    });
    let inventory = null;
    if (manifest.semanticInventory !== false) {
      inventory = await collectSemanticInventory(page, {
        side: sideName,
        screenId: screen.id,
        includeFieldValues: sideConfig.includeFieldValues ?? manifest.includeFieldValues ?? false,
      });
      const semanticsRoot = path.resolve(manifestDir, manifest.output?.semantics ?? 'visual/semantics');
      const semanticsFile = path.join(semanticsRoot, sideName, safeRelativeFilename(screen.file ?? screen.id).replace(/\.png$/i, '.json'));
      await mkdir(path.dirname(semanticsFile), { recursive: true });
      await writeFile(semanticsFile, JSON.stringify(inventory, null, 2) + '\n', 'utf8');
    }
    const outputRoot = path.resolve(manifestDir, manifest.output?.[sideName] ?? `visual/${sideName}`);
    const filename = safeRelativeFilename(screen.file ?? screen.id);
    const outputFile = path.join(outputRoot, filename);
    await mkdir(path.dirname(outputFile), { recursive: true });
    await page.screenshot({
      path: outputFile,
      fullPage: sideConfig.fullPage ?? screen.fullPage ?? manifest.fullPage ?? false,
      animations: 'disabled',
      caret: 'hide',
      timeout: sideConfig.screenshotTimeoutMs ?? 30000,
    });
    console.log(`[${sideName}] ${screen.id} -> ${outputFile}`);
    return inventory;
  } finally {
    await context.close();
  }
}

async function main() {
  const opts = argsOf(process.argv.slice(2));
  const manifestPath = path.resolve(opts.manifest);
  const manifestDir = path.dirname(manifestPath);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (!Array.isArray(manifest.screens) || manifest.screens.length === 0) throw new Error('Manifest needs a non-empty screens array.');
  const seen = new Set();
  for (const screen of manifest.screens) {
    if (!screen.id || seen.has(screen.id)) throw new Error(`Screen ids must be present and unique: ${screen.id}`);
    seen.add(screen.id);
  }
  const sides = opts.side === 'both' ? ['reference', 'candidate'] : [opts.side];
  const inventories = { reference: {}, candidate: {} };
  const browser = await chromium.launch({ headless: !opts.headed });
  try {
    for (const screen of manifest.screens) {
      for (const side of sides) {
        inventories[side][screen.id] = await captureOne(browser, manifest, manifestDir, side, screen, manifest.sides?.[side], opts);
      }
    }
  } finally {
    await browser.close();
  }

  if (opts.side === 'both' && manifest.semanticInventory !== false) {
    const semanticsRoot = path.resolve(manifestDir, manifest.output?.semantics ?? 'visual/semantics');
    await writeSemanticArtifacts({ root: semanticsRoot, reference: inventories.reference, candidate: inventories.candidate, screenIds: manifest.screens.map(s => s.id) });
    console.log(`Semantic report: ${path.join(semanticsRoot, 'report.html')}`);
  }

  if (opts.side === 'both' && manifest.comparison?.enabled !== false) {
    const referenceDir = path.resolve(manifestDir, manifest.output?.reference ?? 'visual/reference');
    const candidateDir = path.resolve(manifestDir, manifest.output?.candidate ?? 'visual/candidate');
    const reportDir = path.resolve(manifestDir, manifest.output?.report ?? 'visual/report');
    const python = manifest.comparison?.python ?? process.env.PYTHON ?? 'python3';
    const compareScript = path.join(scriptDir, 'compare_screens.py');
    const compare = spawnSync(python, [compareScript, '--reference', referenceDir, '--candidate', candidateDir,
      '--output', reportDir, '--threshold', String(manifest.comparison?.threshold ?? 12)], { stdio: 'inherit' });
    if (compare.error) throw compare.error;
    if (compare.status !== 0) throw new Error(`Comparator exited with status ${compare.status}.`);
  }
}

main().catch(error => {
  console.error(`Capture failed: ${error.message}`);
  process.exitCode = 1;
});
