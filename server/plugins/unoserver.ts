import type { Writable } from 'node:stream';
import { consola } from 'consola';
import { definePlugin } from 'nitro';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { cwd } from 'node:process';

const UNOSERVER_STARTED = 'INFO:unoserver:Server PID';

export default definePlugin(() => {
  const unoserver = spawn('unoserver', ['--user-installation', join(cwd(), 'tmp')]);
  let data = '';
  let found = false;

  function stopUnoserver() {
    unoserver.kill();
  }

  function cleanup() {
    process.off('exit', stopUnoserver);
  }

  function addData(stream: Writable) {
    return (chunk: Buffer) => {
      if (!found) {
        data += chunk.toString();

        if (data.includes(UNOSERVER_STARTED)) {
          data = '';
          found = true;
        }
      }

      stream.write(chunk);
    };
  }

  unoserver.stdout.on('data', addData(process.stdout));
  unoserver.stderr.on('data', addData(process.stderr));

  unoserver.once('error', (error) => {
    cleanup();
    consola.error(error);
  });

  unoserver.once('exit', (code, signal) => {
    cleanup();

    if (!found) {
      consola.error(`unoserver exited before startup: code=${code}, signal=${signal}`);
    }
  });

  process.once('exit', stopUnoserver);
});
