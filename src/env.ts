import { z } from 'zod';
import { config } from 'dotenv';

// Load test env in test mode
if (process.env.NODE_ENV === 'test') {
  config({ path: '.env.test' });
} else {
  config();
}

const envSchema = z.object({
  PORT: z.string().default('4000').transform(Number),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  ROOM_TOKEN_SECRET: z.string().min(16),
  ACCESS_TTL_SEC: z.string().default('900').transform(Number),
  REFRESH_TTL_SEC: z.string().default('2592000').transform(Number),
  ROOM_TOKEN_TTL_SEC: z.string().default('120').transform(Number),
  CORS_ORIGIN: z.string().url(),
});

export const env = envSchema.parse(process.env);
