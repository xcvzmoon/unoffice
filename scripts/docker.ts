import { spawnSync } from 'node:child_process';
import { version } from '~/package.json';

const args = process.argv.slice(2);
const result = spawnSync('docker', ['compose', ...args], {
  env: {
    ...process.env,
    IMAGE_TAG: version,
  },
  stdio: 'inherit',
});

if (result.error) {
  throw result.error;
}

process.exitCode = result.status ?? 1;
