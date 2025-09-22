import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { authUtils } from '../utils/auth';
import { db } from '../utils/database';
import type { User } from '@prisma/client';

export const authMiddleware = new Elysia({ name: 'auth' })
  .use(
    jwt({
      name: 'jwt',
      secret:
        process.env.JWT_SECRET ||
        'your-super-secret-jwt-key-change-in-production',
      exp: '7d',
    })
  )
  .derive(async ({ headers, jwt, set }) => {
    const authHeader = headers.authorization;
    const token = authUtils.extractTokenFromHeader(authHeader);

    if (!token) {
      set.status = 401;
      throw new Error('Unauthorized: No token provided');
    }

    const payload = await jwt.verify(token);
    if (!payload || typeof payload.userId !== 'string') {
      set.status = 401;
      throw new Error('Unauthorized: Invalid token');
    }

    const user = await db.getUserById(payload.userId);
    if (!user) {
      set.status = 401;
      throw new Error('Unauthorized: User not found');
    }

    return {
      user,
      token,
      userId: payload.userId,
    };
  });
