import * as BunWorker from '@effect/platform-bun/BunWorker';
import * as PlatformWorker from '@effect/platform/Worker';
import { Effect } from 'effect';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { extract, type Document, type GroupedDocuments } from 'undms';
import { getExtension } from '~/server/utils/get-extension';
import { getMimeType } from '~/server/utils/get-mime-type';
import { validateExtension } from '~/server/utils/validate-extension';

export class DocumentInputError extends Error {
  override name = 'DocumentInputError';
}

export type ExtractDocumentRequest = {
  document: SerializableDocument;
};

type SerializableDocument = {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  webkitRelativePath: string;
  buffer: Uint8Array;
};

function getWorkerPoolSize(documentCount: number): number {
  const hardwareConcurrency = navigator.hardwareConcurrency;
  const availableWorkers = Math.max(1, Math.min(hardwareConcurrency, 4));
  return Math.max(1, Math.min(documentCount, availableWorkers));
}

function getExtractWorkerUrl(): URL {
  const builtWorkerPath = join(process.cwd(), '.output/server/_workers/extract.mjs');
  return existsSync(builtWorkerPath)
    ? pathToFileURL(builtWorkerPath)
    : pathToFileURL(join(process.cwd(), 'server/workers/extract.ts'));
}

async function toDocument(file: File): Promise<SerializableDocument> {
  const extension = getExtension(file.name);

  if (!validateExtension(extension)) {
    throw new DocumentInputError(`Unsupported document extension: ${extension ?? file.name}`);
  }

  const arrayBuffer = await file.arrayBuffer();

  return {
    name: file.name,
    size: file.size,
    type: file.type || getMimeType(extension),
    lastModified: file.lastModified,
    webkitRelativePath: file.webkitRelativePath || '',
    buffer: new Uint8Array(arrayBuffer),
  };
}

function mergeGroupedDocuments(groups: Iterable<GroupedDocuments[]>): GroupedDocuments[] {
  const mergedGroups = new Map<string, GroupedDocuments>();

  for (const groupedDocuments of groups) {
    for (const group of groupedDocuments) {
      const currentGroup = mergedGroups.get(group.mimeType);

      if (currentGroup) {
        currentGroup.documents.push(...group.documents);
      } else {
        mergedGroups.set(group.mimeType, {
          mimeType: group.mimeType,
          documents: [...group.documents],
        });
      }
    }
  }

  return [...mergedGroups.values()];
}

export function extractDocument(request: ExtractDocumentRequest): GroupedDocuments[] {
  const document: Document = {
    ...request.document,
    buffer: Buffer.from(request.document.buffer),
  };
  return extract([document]);
}

export async function extractDocuments(files: File[]): Promise<GroupedDocuments[]> {
  if (files.length === 0) {
    throw new DocumentInputError('At least one document is required');
  }

  const documents = await Promise.all(files.map(async (file) => toDocument(file)));
  const program = Effect.gen(function* extractDocumentsProgram() {
    const pool = yield* PlatformWorker.makePool<ExtractDocumentRequest, GroupedDocuments[], never>({
      size: getWorkerPoolSize(documents.length),
    });

    const extractedDocuments = yield* Effect.forEach(
      documents,
      (document) => pool.executeEffect({ document }),
      { concurrency: 'unbounded' },
    );

    return mergeGroupedDocuments(extractedDocuments);
  });

  const workerLayer = BunWorker.layer(() => new Worker(getExtractWorkerUrl(), { type: 'module' }));
  return Effect.runPromise(Effect.scoped(program).pipe(Effect.provide(workerLayer)));
}
