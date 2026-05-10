import { Result } from 'better-result';

export type Category = 'word' | 'excel' | 'powerpoint' | 'pdf' | 'text' | 'csv' | 'image';

export const SUPPORTED_FILE_EXTENSIONS = [
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'pdf',
  'txt',
  'csv',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'bmp',
  'svg',
  'tiff',
  'heic',
  'heif',
] as const;

export type SupportedFileExtension = (typeof SUPPORTED_FILE_EXTENSIONS)[number];

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
  return index > 0 ? filename.slice(index + 1).toLowerCase() : '';
}

export function validateExtension(extension: string) {
  const normalizedExtension = extension.toLowerCase();

  for (const supportedExtension of SUPPORTED_FILE_EXTENSIONS) {
    if (supportedExtension === normalizedExtension) {
      return true;
    }
  }

  return false;
}

export function getMimeTypeByExtension(extension: string): string | null {
  const normalizedExtension = extension.toLowerCase();
  const entries = Object.entries(FILE_TYPE_DEFINITIONS);

  for (const [_, definition] of entries) {
    const extensions = definition.extensions as readonly string[];
    const mimeTypes = definition.mimeTypes as readonly string[];
    const index = extensions.indexOf(normalizedExtension);

    if (index !== -1) {
      return mimeTypes[index] ?? mimeTypes[0];
    }
  }

  return null;
}

export function getValidatedExtension(filename: string) {
  const extension = getExtension(filename);
  return validateExtension(extension)
    ? Result.ok(extension)
    : Result.err('Unsupported file extension');
}
