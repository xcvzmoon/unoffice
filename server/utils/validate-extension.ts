const SUPPORTED_EXTENSIONS = new Set([
  'csv',
  'doc',
  'docx',
  'epub',
  'html',
  'odp',
  'ods',
  'odt',
  'pdf',
  'ppt',
  'pptx',
  'rtf',
  'txt',
  'xls',
  'xlsx',
  'xhtml',
]);

export function validateExtension(extension: string): boolean {
  const normalizedExtension = extension.trim().toLowerCase().replace(/^\./, '');
  return SUPPORTED_EXTENSIONS.has(normalizedExtension);
}
