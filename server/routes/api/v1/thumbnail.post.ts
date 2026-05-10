import { Effect } from 'effect';
import { defineHandler, HTTPError } from 'nitro';
import { getValidatedQuery } from 'nitro/h3';
import sharp from 'sharp';
import { z } from 'zod';
import { convertDocument, DocumentConversionError } from '~/server/services/unconvert';
import { FILE_TYPE_DEFINITIONS, getValidatedExtension } from '~/server/utils/file-type-definitions';

const querySchema = z.object({
  width: z.coerce.number().int().positive().max(4096).optional().default(1000),
  height: z.coerce.number().int().positive().max(4096).optional(),
  timeoutMs: z.coerce.number().int().positive().optional(),
});

const formDataSchema = z.preprocess((input: FormData) => {
  const documents = input.getAll('documents');
  const document = input.get('document');
  const normalizedDocuments: File[] = [];

  if (document instanceof File) {
    normalizedDocuments.push(document);
  }

  for (const item of documents) {
    if (item instanceof File) {
      normalizedDocuments.push(item);
    }
  }

  return normalizedDocuments;
}, z.instanceof(File).array().length(1));

const imageExtensions = new Set<string>(FILE_TYPE_DEFINITIONS.image.extensions);

function createUnprocessableEntityError(message: string, data?: unknown): HTTPError {
  return new HTTPError({
    status: 422,
    statusText: 'Unprocessable Entity',
    message,
    data,
  });
}

function isImageExtension(extension: string): boolean {
  return imageExtensions.has(extension);
}

async function createWebpThumbnail(
  input: Buffer,
  options: { width: number; height?: number },
): Promise<Buffer> {
  return sharp(input, { failOn: 'none' })
    .rotate()
    .resize({
      width: options.width,
      height: options.height,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp()
    .toBuffer();
}

export default defineHandler(async (event) => {
  const query = await getValidatedQuery(event, querySchema);
  const formData = await event.req.formData();
  const parsedFormDataResult = formDataSchema.safeParse(formData);

  if (!parsedFormDataResult.success) {
    throw createUnprocessableEntityError(
      parsedFormDataResult.error.message,
      z.treeifyError(parsedFormDataResult.error),
    );
  }

  const document = parsedFormDataResult.data[0];
  const validatedExtensionResult = getValidatedExtension(document.name);

  if (validatedExtensionResult.isErr()) {
    throw createUnprocessableEntityError(validatedExtensionResult.error);
  }

  try {
    let input: Buffer<ArrayBufferLike> = Buffer.from(await document.arrayBuffer());

    if (!isImageExtension(validatedExtensionResult.value)) {
      const convertedDocument = await Effect.runPromise(
        convertDocument({
          document,
          options: {
            convertTo: 'png',
            timeoutMs: query.timeoutMs,
            updateIndex: false,
            dontUpdateIndex: false,
            verbose: false,
            quiet: false,
          },
        }),
      );
      input = convertedDocument.buffer;
    }

    const thumbnail = await createWebpThumbnail(input, query);

    return new Response(Uint8Array.from(thumbnail), {
      headers: {
        'content-type': 'image/webp',
      },
    });
  } catch (error) {
    throw error instanceof DocumentConversionError
      ? createUnprocessableEntityError(error.message)
      : error;
  }
});
