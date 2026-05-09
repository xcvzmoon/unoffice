const MIME_TYPES = new Map([
  ['csv', 'text/csv'],
  ['doc', 'application/msword'],
  ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ['epub', 'application/epub+zip'],
  ['html', 'text/html'],
  ['odp', 'application/vnd.oasis.opendocument.presentation'],
  ['ods', 'application/vnd.oasis.opendocument.spreadsheet'],
  ['odt', 'application/vnd.oasis.opendocument.text'],
  ['pdf', 'application/pdf'],
  ['ppt', 'application/vnd.ms-powerpoint'],
  ['pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  ['rtf', 'application/rtf'],
  ['txt', 'text/plain'],
  ['xls', 'application/vnd.ms-excel'],
  ['xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ['webp', 'image/webp'],
  ['xhtml', 'application/xhtml+xml'],
]);

export function getMimeType(extension: string): string {
  const normalizedExtension = extension.trim().toLowerCase().replace(/^\./, '');
  return MIME_TYPES.get(normalizedExtension) ?? 'application/octet-stream';
}
