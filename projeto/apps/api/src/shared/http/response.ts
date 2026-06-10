import type { FastifyReply } from 'fastify';
import type { PaginationMeta } from '@commercialpipe/shared-types';

export function sendOk<T>(reply: FastifyReply, data: T, status = 200): FastifyReply {
  return reply.status(status).send({ success: true, data });
}

export function sendPaginated<T>(
  reply: FastifyReply,
  data: T[],
  meta: PaginationMeta,
  status = 200,
): FastifyReply {
  return reply.status(status).send({ success: true, data, meta });
}

export function sendError(
  reply: FastifyReply,
  status: number,
  code: string,
  message: string,
  details: unknown[] = [],
): FastifyReply {
  return reply.status(status).send({ success: false, error: { code, message, details } });
}
