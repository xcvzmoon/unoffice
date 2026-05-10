import type { UnconvertSchema } from './unconvert-schema';
import type { Readable, Writable } from 'node:stream';
import { Effect } from 'effect';
import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { finished } from 'node:stream/promises';
import { getMimeTypeByExtension } from '~/server/utils/file-type-definitions';

type InputType = Readable | Buffer | string;

export class DocumentConversionError extends Error {
  override name = 'DocumentConversionError';
}

export type ConvertDocumentRequest = {
  document: File;
  options: UnconvertSchema;
};

export type ConvertedDocument = {
  name: string;
  mimeType: string;
  buffer: Buffer;
};

const fallbackMimeType = 'application/octet-stream';

function getOutputName(name: string, extension: string): string {
  const index = name.lastIndexOf('.');
  const basename = index > 0 ? name.slice(0, index) : name;
  return `${basename}.${extension}`;
}

function createUnoconvertArgs({
  convertTo,
  inputFilter,
  outputFilter,
  filterOptions,
  updateIndex,
  dontUpdateIndex,
  verbose,
  quiet,
}: UnconvertSchema): string[] {
  const args = ['--convert-to', convertTo, '-', '-'];

  if (inputFilter) {
    args.push('--input-filter', inputFilter);
  }

  if (outputFilter) {
    args.push('--output-filter', outputFilter);
  }

  if (filterOptions) {
    const options = Array.isArray(filterOptions) ? filterOptions : [filterOptions];

    for (const option of options) {
      args.push('--filter-option', option);
    }
  }

  if (updateIndex) {
    args.push('--update-index');
  }

  if (dontUpdateIndex) {
    args.push('--dont-update-index');
  }

  if (verbose) {
    args.push('--verbose');
  }

  if (quiet) {
    args.push('--quiet');
  }

  return args;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function writeInput(input: InputType, output: Writable): Promise<void> {
  if (typeof input === 'string' || Buffer.isBuffer(input)) {
    output.end(input);
    await finished(output);
    return;
  }

  await finished(input.pipe(output, { end: true }));
}

async function createExitPromise(childProcess: ChildProcessWithoutNullStreams) {
  return new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
    childProcess.once('exit', (code, signal) => {
      resolve({ code, signal });
    });
  });
}

async function createProcessErrorPromise(childProcess: ChildProcessWithoutNullStreams) {
  return new Promise<never>((_, reject) => {
    childProcess.once('error', (error) => {
      reject(error);
    });
  });
}

async function readConvertedOutput(
  input: InputType,
  childProcess: ChildProcessWithoutNullStreams,
): Promise<Buffer> {
  const outputChunks: Buffer[] = [];
  const errorChunks: Buffer[] = [];
  const exitPromise = createExitPromise(childProcess);
  const processErrorPromise = createProcessErrorPromise(childProcess);

  childProcess.stdout.on('data', (chunk: Buffer) => {
    outputChunks.push(Buffer.from(chunk));
  });

  childProcess.stderr.on('data', (chunk: Buffer) => {
    errorChunks.push(Buffer.from(chunk));
  });

  childProcess.stdin.on('error', (error) => {
    console.error(error);
    childProcess.kill();
  });

  try {
    await Promise.race([writeInput(input, childProcess.stdin), processErrorPromise]);
  } catch (error) {
    childProcess.kill();
    throw new DocumentConversionError(toErrorMessage(error));
  }

  await Promise.race([finished(childProcess.stdout), processErrorPromise]);
  const { code, signal } = await Promise.race([exitPromise, processErrorPromise]);

  if (code !== 0) {
    const stderr = Buffer.concat(errorChunks).toString('utf8').trim();
    const reason = code === null ? `signal ${signal}` : `code ${code}`;
    const message = stderr
      ? `unoconvert exited with ${reason}: ${stderr}`
      : `unoconvert exited with ${reason}`;
    throw new DocumentConversionError(message);
  }

  return Buffer.concat(outputChunks);
}

export function unoconvert(
  input: InputType,
  options: UnconvertSchema,
): Effect.Effect<Buffer, DocumentConversionError> {
  return Effect.tryPromise({
    try: async () => {
      const childProcess = spawn('unoconvert', createUnoconvertArgs(options));
      const timeoutHandle =
        options.timeoutMs === undefined
          ? undefined
          : setTimeout(() => {
              childProcess.kill('SIGKILL');
            }, options.timeoutMs);

      try {
        return await readConvertedOutput(input, childProcess);
      } finally {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
      }
    },
    catch: (error) => {
      return error instanceof DocumentConversionError
        ? error
        : new DocumentConversionError(toErrorMessage(error));
    },
  });
}

export function convertDocument({
  document,
  options,
}: ConvertDocumentRequest): Effect.Effect<ConvertedDocument, DocumentConversionError> {
  return Effect.gen(function* convertDocumentProgram() {
    const arrayBuffer = yield* Effect.tryPromise({
      try: async () => document.arrayBuffer(),
      catch: (error) => new DocumentConversionError(toErrorMessage(error)),
    });
    const buffer = yield* unoconvert(Buffer.from(arrayBuffer), options);
    const extension = options.convertTo;

    return {
      name: getOutputName(document.name, extension),
      mimeType: getMimeTypeByExtension(extension) ?? fallbackMimeType,
      buffer,
    };
  });
}
