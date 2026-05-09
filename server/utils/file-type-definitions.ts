import { Result } from 'better-result';

export type Category = 'word' | 'excel' | 'powerpoint' | 'pdf' | 'text' | 'csv' | 'image';

export const FILE_TYPE_DEFINITIONS = {
  word: {
    extensions: ['doc', 'docx'],
    mimeTypes: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
  excel: {
    extensions: ['xls', 'xlsx'],
    mimeTypes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  },
  powerpoint: {
    extensions: ['ppt', 'pptx'],
    mimeTypes: [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
  },
  pdf: {
    extensions: ['pdf'],
    mimeTypes: ['application/pdf'],
  },
  text: {
    extensions: ['txt'],
    mimeTypes: ['text/plain'],
  },
  csv: {
    extensions: ['csv'],
    mimeTypes: ['text/csv'],
  },
  image: {
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'tiff', 'heic', 'heif'],
    mimeTypes: [
      'image/jpg',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/svg+xml',
      'image/tiff',
      'image/heic',
      'image/heif',
    ],
  },
} as const;

export function getExtension(filename: string) {
  const index = filename.lastIndexOf('.');
  return index > 0 ? filename.slice(index + 1) : '';
}

export function validateExtension(extension: string) {
  const entries = Object.entries(FILE_TYPE_DEFINITIONS);

  for (const [_, definition] of entries) {
    const extensions = definition.extensions as readonly string[];
    return extensions.includes(extension);
  }

  return false;
}

export function getValidatedExtension(filename: string) {
  const extension = getExtension(filename);
  return validateExtension(extension)
    ? Result.ok(extension)
    : Result.err('Unsupported file extension');
}
