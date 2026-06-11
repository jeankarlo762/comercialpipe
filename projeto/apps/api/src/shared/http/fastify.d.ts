import type { AuthUser } from '@commercialpipe/shared-types';

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthUser;
    apiKeyTenantId?: string;
    rawBody?: string;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;
      tenantId: string;
      role: 'admin' | 'manager' | 'closer' | 'sdr';
      email: string;
    };
    user: {
      sub: string;
      tenantId: string;
      role: 'admin' | 'manager' | 'closer' | 'sdr';
      email: string;
    };
  }
}

export {};
