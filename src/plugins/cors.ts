import { Elysia } from 'elysia';
import { cors as corsPlugin } from '@elysiajs/cors';
import { env } from '../env';

export const cors = new Elysia({ name: 'cors' }).use(
  corsPlugin({
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
