export function getExtension(filename: string): string {
  return filename.split('.').at(-1) ?? '';
}
