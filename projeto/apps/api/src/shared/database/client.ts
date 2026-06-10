import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../../config/env.js';
import * as schema from './schema.js';

const queryClient = postgres(env.DATABASE_URL, {
  max: env.NODE_ENV === 'production' ? 20 : 10,
  prepare: false,
});

export const db = drizzle(queryClient, { schema, casing: 'snake_case' });

export type Database = typeof db;
export { schema, queryClient };
