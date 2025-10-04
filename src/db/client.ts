import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../env';
import * as schema from './schema';

// Create database connection lazily to avoid connection errors during app startup
let queryClient: any = null;
let dbInstance: any = null;

export const getDb = () => {
  if (!dbInstance) {
    if (!queryClient) {
      queryClient = postgres(env.DATABASE_URL, {
        max: 1,
        onnotice: () => {}, // Disable notice logs
      });
    }
    dbInstance = drizzle(queryClient, { schema });
  }
  return dbInstance;
};

// For backward compatibility, export db as a getter
export const db = getDb();
