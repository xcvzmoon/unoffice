import { defineConfig } from 'nitro';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const workerEntryPoints = ['server/workers/extract.ts'];

export default defineConfig({
  compatibilityDate: '2026-05-08',
  serverDir: './server',
  preset: 'bun',
  routeRules: {
    '/api/v1/**': {
      cors: true,
    },
  },
  hooks: {
    compiled: async (nitro) => {
      const workersDirectory = resolve(nitro.options.output.serverDir, '_workers');
      await mkdir(workersDirectory, { recursive: true });

      const result = await Bun.build({
        entrypoints: workerEntryPoints.map((entryPoint) => {
          return resolve(nitro.options.rootDir, entryPoint);
        }),
        outdir: workersDirectory,
        target: 'bun',
        naming: {
          entry: '[name].mjs',
        },
        external: ['undms'],
      });

      if (!result.success) {
        throw new Error('Failed to build worker entries');
      }
    },
  },
});
