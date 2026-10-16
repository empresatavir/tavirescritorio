import { test, expect } from '@playwright/test';

test('API somente: endpoint de saúde responde com sucesso', async ({ request }) => {
  const apiBase = process.env.API_BASE_URL;
  test.skip(!apiBase, 'Defina API_BASE_URL para executar este teste somente de API.');

  const response = await request.get(`${apiBase}/health`);
  expect(response.ok()).toBeTruthy();
  expect(response.status()).toBe(200);
});
