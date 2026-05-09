import * as BunWorkerRunner from '@effect/platform-bun/BunWorkerRunner';
import * as WorkerRunner from '@effect/platform/WorkerRunner';
import { Effect, Layer } from 'effect';
import { extractDocument, type ExtractDocumentRequest } from '~/server/services/undms';

const extractWorker = WorkerRunner.layer((request: ExtractDocumentRequest) => {
  return Effect.sync(() => extractDocument(request));
});

void BunWorkerRunner.launch(Layer.provide(extractWorker, BunWorkerRunner.layer)).pipe(
  Effect.runPromise,
);
