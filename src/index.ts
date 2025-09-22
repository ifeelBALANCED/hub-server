import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { staticPlugin } from '@elysiajs/static';

// Import routes
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { roomRoutes } from './routes/rooms';
import { chatRoutes } from './routes/chat';
import { deviceRoutes } from './routes/devices';
import { webrtcRoutes } from './routes/webrtc';
import { participantRoutes } from './routes/participants';

// Import WebSocket
import { roomWebSocket } from './websocket/room';

const app = new Elysia()
  // CORS configuration
  .use(
    cors({
      origin: true, // Allow all origins in development
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  )

  // JWT configuration
  .use(
    jwt({
      name: 'jwt',
      secret:
        process.env.JWT_SECRET ||
        'your-super-secret-jwt-key-change-in-production',
      exp: '7d',
    })
  )

  // Swagger documentation
  .use(
    swagger({
      documentation: {
        info: {
          title: 'Hub API',
          version: '1.0.0',
          description: 'API for Hub - Google Meet Clone Backend',
        },
        tags: [
          {
            name: 'Authentication',
            description: 'User authentication endpoints',
          },
          { name: 'Users', description: 'User management endpoints' },
          { name: 'Rooms', description: 'Room management endpoints' },
          { name: 'Chat', description: 'Chat and messaging endpoints' },
          { name: 'Devices', description: 'Media device management endpoints' },
          {
            name: 'WebRTC',
            description: 'WebRTC configuration and statistics',
          },
          {
            name: 'Participants',
            description: 'Participant management endpoints',
          },
        ],
        servers: [
          {
            url: 'http://localhost:3000',
            description: 'Development server',
          },
        ],
      },
    })
  )

  // Static files (for serving frontend if needed)
  .use(staticPlugin())

  // Health check endpoint
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

  // API routes
  .use(authRoutes)
  .use(userRoutes)
  .use(roomRoutes)
  .use(chatRoutes)
  .use(deviceRoutes)
  .use(webrtcRoutes)
  .use(participantRoutes)

  // WebSocket routes
  .use(roomWebSocket)

  // Error handling
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

  // Start server
  .listen(3000);

console.log(`
🚀 Hub API Server is running!
📍 URL: http://localhost:3000
📚 API Documentation: http://localhost:3000/swagger
🔌 WebSocket: ws://localhost:3000/ws/room/{roomId}

Available endpoints:
• POST /auth/register - Register new user
• POST /auth/login - Login user
• POST /auth/logout - Logout user
• GET  /auth/me - Get current user profile
• POST /auth/refresh - Refresh token

• GET  /users - Get all users
• GET  /users/:id - Get user by ID
• PUT  /users/me - Update current user
• GET  /users/search/:username - Search users

• GET  /rooms - Get public rooms
• POST /rooms - Create new room
• GET  /rooms/:id - Get room details
• POST /rooms/:id/join - Join room
• POST /rooms/:id/leave - Leave room
• PUT  /rooms/:id - Update room (host only)
• DELETE /rooms/:id - Delete room (host only)
• GET  /rooms/my-rooms - Get my rooms

• GET  /chat/rooms/:roomId/messages - Get chat messages
• GET  /chat/messages/:messageId/reactions - Get emoji reactions

• GET  /devices/media - Get media devices
• GET  /devices/audio/input - Get audio input devices
• GET  /devices/audio/output - Get audio output devices
• GET  /devices/video/input - Get video input devices
• POST /devices/test/:deviceId - Test device

• GET  /webrtc/config - Get TURN/STUN config
• GET  /webrtc/stats/:roomId - Get WebRTC stats
• GET  /webrtc/codecs - Get available codecs
• GET  /webrtc/bandwidth/:roomId - Get bandwidth recommendations

• GET  /participants/rooms/:roomId - Get room participants
• PUT  /participants/rooms/:roomId/me - Update participant settings
• GET  /participants/rooms/:roomId/users/:userId - Get participant
• POST /participants/rooms/:roomId/users/:userId/audio/:action - Mute/unmute audio
• POST /participants/rooms/:roomId/users/:userId/video/:action - Mute/unmute video
• DELETE /participants/rooms/:roomId/users/:userId - Remove participant

WebSocket Events:
• join_room - Join a room
• leave_room - Leave a room
• user_joined - User joined notification
• user_left - User left notification
• chat_message - Send chat message
• emoji_reaction - Send emoji reaction
• webrtc_offer - WebRTC offer
• webrtc_answer - WebRTC answer
• webrtc_ice_candidate - WebRTC ICE candidate
• mute_audio/unmute_audio - Audio mute toggle
• mute_video/unmute_video - Video mute toggle
• raise_hand/lower_hand - Hand raising
• screen_share_start/screen_share_stop - Screen sharing
• participant_update - Participant status update
`);

export default app;
