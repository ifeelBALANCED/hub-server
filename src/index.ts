import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { staticPlugin } from '@elysiajs/static';

const app = new Elysia()
  .use(
    cors({
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  )
  .use(staticPlugin())
  .get('/', () => ({
    success: true,
    message: 'Hub API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/auth',
      users: '/users',
      rooms: '/rooms',
      chat: '/chat',
      devices: '/devices',
      webrtc: '/webrtc',
      participants: '/participants',
      websocket: '/ws',
      docs: '/swagger',
    },
  }))

  .onError(({ error, code, set }) => {
    console.error('Error:', error);

    if (code === 'VALIDATION') {
      set.status = 400;
      return {
        success: false,
        message: 'Validation error',
        error: error.message,
      };
    }

    if (code === 'NOT_FOUND') {
      set.status = 404;
      return {
        success: false,
        message: 'Not found',
      };
    }

    set.status = 500;
    return {
      success: false,
      message: 'Internal server error',
    };
  })

  .listen(3000);

console.log(`
🚀 Hub API Server is running!
📍 URL: http://localhost:3000
📚 API Documentation: http://localhost:3000/swagger
`);

export default app;
