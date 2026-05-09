import { consola } from 'consola';

function formatBytes(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024)} MiB`;
}

export function logMemoryUsage(label: string): void {
  const memory = process.memoryUsage();

  consola.info({
    label,
    rss: formatBytes(memory.rss),
    heapTotal: formatBytes(memory.heapTotal),
    heapUsed: formatBytes(memory.heapUsed),
    external: formatBytes(memory.external),
    arrayBuffers: formatBytes(memory.arrayBuffers),
  });
}
