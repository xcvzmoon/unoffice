import { defineHandler, HTTPError } from 'nitro';
import { z } from 'zod';
import { DocumentInputError, extractDocuments } from '~/server/services/undms';

function createUnprocessableEntityError(message: string, data?: unknown): HTTPError {
  return new HTTPError({
    status: 422,
    statusText: 'Unprocessable Entity',
    message,
    data,
  });
}

export default defineHandler(async (event) => {
  const formData = await event.req.formData();
  const parsedFormDataResult = z
    .preprocess((input: FormData) => {
      const documents = input.getAll('documents');
      const normalizedDocuments: File[] = [];

      for (const document of documents) {
        const parsedDocument = z.instanceof(File).safeParse(document);
        if (parsedDocument.success) {
          normalizedDocuments.push(parsedDocument.data);
        }
      }

      return normalizedDocuments;
    }, z.instanceof(File).array().nonempty())
    .safeParse(formData);

  if (!parsedFormDataResult.success) {
    throw createUnprocessableEntityError(
      parsedFormDataResult.error.message,
      z.treeifyError(parsedFormDataResult.error),
    );
  }

  try {
    return await extractDocuments(parsedFormDataResult.data);
  } catch (error) {
    if (error instanceof DocumentInputError) {
      throw createUnprocessableEntityError(error.message);
    }

    throw error;
  }
});
