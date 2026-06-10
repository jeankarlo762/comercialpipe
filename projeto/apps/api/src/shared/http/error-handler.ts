import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error.js';
import { sendError } from './response.js';

export function errorHandler(
  error: FastifyError | AppError | ZodError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
): FastifyReply {
  if (error instanceof AppError) {
    return sendError(reply, error.statusCode, error.code, error.message, error.details);
  }

  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    return sendError(reply, 400, 'VALIDATION_ERROR', 'Dados de entrada inválidos', details);
  }

  const fastifyError = error as FastifyError;
  if (fastifyError.statusCode === 429) {
    return sendError(reply, 429, 'RATE_LIMITED', 'Muitas requisições, tente novamente em instantes');
  }
  if (fastifyError.statusCode && fastifyError.statusCode < 500) {
    return sendError(
      reply,
      fastifyError.statusCode,
      fastifyError.code ?? 'BAD_REQUEST',
      fastifyError.message,
    );
  }

  request.log.error({ err: error }, 'unhandled error');
  return sendError(reply, 500, 'INTERNAL_ERROR', 'Erro interno do servidor');
}
