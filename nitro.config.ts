import { defineConfig } from 'nitro';

export default defineConfig({
  compatibilityDate: '2026-05-08',
  serverDir: './server',
  preset: 'bun',
  routeRules: {
    '/api/v1/**': {
      cors: true,
    },
  },
});
