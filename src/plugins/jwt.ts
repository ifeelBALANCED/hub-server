import { Elysia } from 'elysia';
import { jwt as jwtPlugin } from '@elysiajs/jwt';
import { env } from '../env';

export const jwt = new Elysia({ name: 'jwt' })
  .use(
    jwtPlugin({
      name: 'access',
      secret: env.JWT_ACCESS_SECRET,
      exp: `${env.ACCESS_TTL_SEC}s`,
    })
  )
  .use(
    jwtPlugin({
      name: 'refresh',
      secret: env.JWT_REFRESH_SECRET,
      exp: `${env.REFRESH_TTL_SEC}s`,
    })
  )
  .use(
    jwtPlugin({
      name: 'room',
      secret: env.ROOM_TOKEN_SECRET,
      exp: `${env.ROOM_TOKEN_TTL_SEC}s`,
    })
  );
