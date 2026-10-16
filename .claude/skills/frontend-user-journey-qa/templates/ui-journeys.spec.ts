import { test, expect } from '@playwright/test';

test.describe('FLUXO-001 — concluir uma jornada principal', () => {
  test('usuário envia formulário válido e vê o item criado', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible();

    await test.step('abrir a tela de criação pela interface', async () => {
      await page.getByRole('button', { name: 'Novo item' }).click();
      await expect(page.getByRole('heading', { name: 'Criar item' })).toBeVisible();
    });

    await test.step('preencher e enviar o formulário renderizado', async () => {
      await page.getByRole('textbox', { name: 'Título' }).fill('Item sintético QA');
      await page.getByRole('button', { name: 'Criar' }).click();
    });

    await test.step('validar o que o usuário vê após o envio', async () => {
      await expect(page.getByRole('status')).toContainText('Criado');
      await expect(page.getByRole('list')).toContainText('Item sintético QA');
    });
  });
});
