import { defineHandler } from 'nitro';
import { description, name, version } from '~/package.json';

export default defineHandler((event) => {
  const runtime = event.runtime?.name;
  return { description, name, runtime, version };
});
