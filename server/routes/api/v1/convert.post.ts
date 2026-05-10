import { Effect } from 'effect';
import { defineHandler, HTTPError } from 'nitro';
import { getValidatedQuery } from 'nitro/h3';
import { z } from 'zod';
import { convertDocument, DocumentConversionError } from '~/server/services/unconvert';
import { unconvertSchema } from '~/server/services/unconvert-schema';

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

function createUnprocessableEntityError(message: string, data?: unknown): HTTPError {
  return new HTTPError({
    status: 422,
    statusText: 'Unprocessable Entity',
    message,
    data,
  });
}

function createContentDisposition(name: string): string {
  const fallbackName = name.replaceAll(/["\\]/g, '_');
  return `attachment; filename="${fallbackName}"`;
}

export default defineHandler(async (event) => {
  const query = await getValidatedQuery(event, unconvertSchema);
  const formData = await event.req.formData();
  const parsedFormDataResult = formDataSchema.safeParse(formData);

  if (!parsedFormDataResult.success) {
    throw createUnprocessableEntityError(
      parsedFormDataResult.error.message,
      z.treeifyError(parsedFormDataResult.error),
    );
  }

  try {
    const convertedDocument = await Effect.runPromise(
      convertDocument({
        document: parsedFormDataResult.data[0],
        options: query,
      }),
    );

    return new Response(Uint8Array.from(convertedDocument.buffer), {
      headers: {
        'content-disposition': createContentDisposition(convertedDocument.name),
        'content-type': convertedDocument.mimeType,
      },
    });
  } catch (error) {
    throw error instanceof DocumentConversionError
      ? createUnprocessableEntityError(error.message)
      : error;
  }
});
