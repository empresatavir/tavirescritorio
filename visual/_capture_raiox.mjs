import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'frontend', 'package.json'));
const { _electron: electron } = require('playwright');

const priv = mkdtempSync(join(tmpdir(), 'raiox-priv-'));
const outLista = join(root, 'visual', 'raiox-lista.png');
const outCaso = join(root, 'visual', 'raiox-caso.png');
const freeze = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';

const app = await electron.launch({
  args: [root],
  cwd: root,
  env: { ...process.env, NODE_ENV: 'test', TAVIR_RAIOX_ROOT: priv },
  timeout: 90000,
});

const page = await app.firstWindow();
page.setDefaultTimeout(20000);

async function shot(path) {
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: freeze }).catch(() => {});
  await page.waitForTimeout(400);
  await page.screenshot({ path, animations: 'disabled' });
  console.log('wrote', path);
}

try {
  await page.waitForLoadState('domcontentloaded');
  const rail = page.getByRole('button', { name: 'Módulos', exact: true });
  const box = await rail.boundingBox();
  if (!box) throw new Error('botão Módulos ausente');
  await page.mouse.click(box.x + Math.min(22, box.width / 2), box.y + box.height / 2);
  await page.getByRole('button', { name: 'Raio-X', exact: true }).click();
  await page.getByText('Nenhum caso ainda. Abra o primeiro em Novo caso.').waitFor();
  console.log('vazio ok', priv);

  await page.getByRole('button', { name: 'Novo caso' }).click();
  const novo = page.getByRole('dialog', { name: 'Novo caso' });
  await novo.getByLabel('Empresa *').fill('Comércio de Exemplo');
  await novo.getByLabel('Contato').fill('Dono de exemplo');
  await novo.getByLabel('Segmento').fill('Comércio de bairro');
  await novo.getByRole('button', { name: /Diagnóstico/ }).click();
  await novo.locator('select').selectOption('interno');
  await novo.getByRole('textbox', { name: 'Nota do consentimento' }).fill('Caso fictício da captura.');
  await novo.getByRole('button', { name: 'Abrir caso' }).click();
  await page.getByRole('heading', { name: 'Comércio de Exemplo' }).waitFor();

  async function evidencia(stage, source, claim, gap) {
    await page.getByRole('button', { name: 'Registrar evidência' }).first().click();
    const dlg = page.getByRole('dialog', { name: 'Registrar evidência' });
    await dlg.getByRole('button', { name: stage, exact: true }).click();
    await dlg.getByLabel('Fonte *').fill(source);
    await dlg.getByLabel('O que mostra *').fill(claim);
    if (gap) await dlg.getByRole('button', { name: gap, exact: true }).click();
    await dlg.getByRole('button', { name: 'Registrar evidência' }).click();
    await page.getByText(claim).waitFor();
  }

  await evidencia('Encontrar', 'https://exemplo.invalid/perfil', 'O perfil público não informa o horário.', 'Perfil Google fraco');
  await evidencia('Conversar', 'https://exemplo.invalid/whatsapp', 'A primeira resposta é automática e não pede o pedido.', 'WhatsApp lento');

  await page.getByRole('button', { name: 'Devolutiva 0' }).click();
  await page.getByRole('button', { name: 'Escolher prioridade' }).click();
  const pri = page.getByRole('dialog', { name: 'Escolher prioridade' });
  await pri.getByRole('button', { name: 'Encontrar', exact: true }).click();
  await pri.getByRole('button', { name: 'Perfil Google fraco', exact: true }).click();
  await pri.getByLabel('Gargalo *').fill('O perfil público não informa o horário.');
  await pri.getByLabel('Por que vem primeiro *').fill('Quem busca o comércio não confirma se está aberto.');
  await pri.getByRole('button', { name: 'Alta', exact: true }).click();
  await pri.getByLabel('O que descartamos').fill('WhatsApp lento: a resposta automática existe; o perfil vem antes.');
  await pri.getByRole('button', { name: 'Gravar prioridade' }).click();
  await page.getByText('Perfil Google fraco').waitFor();

  await shot(outCaso);
  await page.getByRole('button', { name: '← Todos os casos' }).click();
  await page.getByRole('heading', { name: 'Comércio de Exemplo' }).waitFor();
  await shot(outLista);
  console.log('ok');
} catch (err) {
  const text = await page.locator('body').innerText().catch(() => '');
  console.error(String(err && err.stack || err));
  console.error('--- tela ---');
  console.error(text.slice(0, 2500));
  process.exitCode = 1;
} finally {
  await app.close().catch(() => {});
  rmSync(priv, { recursive: true, force: true });
}
