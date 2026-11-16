import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  root: resolve(__dirname),
  test: {
    include: ['tests/**/*.{test,spec}.ts', 'test/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'studio-motion/**'],
    environment: 'node',
    // Vários testes abrem git, node e ferramentas de segurança reais. Com todos os arquivos em paralelo
    // no Windows, 5 s (padrão) estoura por carga, não por defeito.
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
