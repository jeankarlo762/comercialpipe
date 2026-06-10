export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details: unknown[];

  constructor(statusCode: number, code: string, message: string, details: unknown[] = []) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Requisição inválida', code = 'BAD_REQUEST', details: unknown[] = []) {
    super(400, code, message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Não autenticado', code = 'UNAUTHORIZED') {
    super(401, code, message);
  }
}

export class PaymentRequiredError extends AppError {
  constructor(message = 'Créditos de IA insuficientes', code = 'AI_CREDITS_EXHAUSTED') {
    super(402, code, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado', code = 'FORBIDDEN') {
    super(403, code, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado', code = 'NOT_FOUND') {
    super(404, code, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflito de estado', code = 'CONFLICT') {
    super(409, code, message);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Muitas requisições', code = 'RATE_LIMITED') {
    super(429, code, message);
  }
}
