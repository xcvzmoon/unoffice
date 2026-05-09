import { defineHandler, HTTPError } from 'nitro';
import { getValidatedQuery } from 'nitro/h3';
import { z } from 'zod';
import { DocumentInputError, extractDocuments } from '~/server/services/undms';

const querySchema = z.object({
  grouped: z.coerce.boolean().optional(),
  output: z.enum(['metadata', 'content']).optional(),
});

const formDataSchema = z.preprocess((input: FormData) => {
  const documents = input.getAll('documents');
  const normalizedDocuments: File[] = [];

  for (const document of documents) {
    const parsedDocument = z.instanceof(File).safeParse(document);
    if (parsedDocument.success) {
      normalizedDocuments.push(parsedDocument.data);
    }
  }

  return normalizedDocuments;
}, z.instanceof(File).array().nonempty());

function createUnprocessableEntityError(message: string, data?: unknown): HTTPError {
  return new HTTPError({
    status: 422,
    statusText: 'Unprocessable Entity',
    message,
    data,
  });
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

  let extractedDocuments: Awaited<ReturnType<typeof extractDocuments>> = [];

  try {
    extractedDocuments = await extractDocuments(parsedFormDataResult.data);
  } catch (error) {
    throw error instanceof DocumentInputError
      ? createUnprocessableEntityError(error.message)
      : error;
  }

  if (query.grouped) {
    if (!query.output) {
      return extractedDocuments;
    }

    const groupedDocuments = [];

    for (const { mimeType, documents } of extractedDocuments) {
      groupedDocuments.push({
        mimeType,
        documents: documents.map(({ name, metadata, content }) => {
          return query.output === 'metadata' ? { name, metadata } : { name, content };
        }),
      });
    }

    return groupedDocuments;
  }

  const documents = [];

  for (const group of extractedDocuments) {
    for (const document of group.documents) {
      if (query.output === 'metadata') {
        documents.push({
          name: document.name,
          metadata: document.metadata,
        });
      } else if (query.output === 'content') {
        documents.push({
          name: document.name,
          content: document.content,
        });
      } else {
        documents.push(document);
      }
    }
  }

  return documents;
});
