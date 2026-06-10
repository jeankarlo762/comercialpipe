import type { z } from 'zod';
import { BadRequestError } from '../errors/app-error.js';

export function parseOrThrow<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    throw new BadRequestError('Dados de entrada inválidos', 'VALIDATION_ERROR', details);
  }
  return result.data;
}
