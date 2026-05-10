import { z } from 'zod';
import { SUPPORTED_FILE_EXTENSIONS } from '~/server/utils/file-type-definitions';

export const unconvertSchema = z
  .strictObject({
    convertTo: z.enum(SUPPORTED_FILE_EXTENSIONS).optional().default('pdf'),
    inputFilter: z.string().optional(),
    outputFilter: z.string().optional(),
    filterOptions: z.union([z.string(), z.array(z.string())]).optional(),
    timeoutMs: z.coerce.number().int().positive().optional(),
    updateIndex: z.stringbool().optional().default(false),
    dontUpdateIndex: z.stringbool().optional().default(false),
    verbose: z.stringbool().optional().default(false),
    quiet: z.stringbool().optional().default(false),
  })
  .refine((data) => data.filterOptions === undefined || data.outputFilter !== undefined, {
    message: 'filterOptions can only be provided when outputFilter is set',
    path: ['filterOptions'],
  });

export type UnconvertSchema = z.infer<typeof unconvertSchema>;
