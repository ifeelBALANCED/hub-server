import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { authUtils } from '../utils/auth';
import { db } from '../utils/database';

export const webrtcRoutes = new Elysia({ prefix: '/webrtc' })
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
  })

  // Get TURN/STUN server configuration
  .get(
    '/config',
    async () => {
      // In a real application, you would get these from environment variables
      // or a configuration service
      const config = {
        iceServers: [
          {
            urls: 'stun:stun.l.google.com:19302',
          },
          {
            urls: 'stun:stun1.l.google.com:19302',
          },
          {
            urls: 'stun:stun2.l.google.com:19302',
          },
          // Add your TURN server configuration here
          // {
          //   urls: 'turn:your-turn-server.com:3478',
          //   username: 'your-username',
          //   credential: 'your-credential',
          // },
        ],
      };

      return {
        success: true,
        config,
      };
    },
    {
      detail: {
        tags: ['WebRTC'],
        summary: 'Get TURN/STUN configuration',
        description: 'Get ICE server configuration for WebRTC connections',
      },
    }
  )

  // Get WebRTC statistics for a room
  .get(
    '/stats/:roomId',
    async ({ params: { roomId }, user, set }) => {
      // In a real application, you would collect WebRTC statistics
      // from active connections in the room

      const mockStats = {
        roomId,
        totalConnections: 5,
        activeConnections: 4,
        averageLatency: 45, // ms
        averageBitrate: 1500, // kbps
        connectionQuality: 'good',
        timestamp: new Date(),
        participants: [
          {
            userId: user.id,
            connectionState: 'connected',
            audioBitrate: 64,
            videoBitrate: 1200,
            latency: 42,
            packetLoss: 0.1,
          },
        ],
      };

      return {
        success: true,
        stats: mockStats,
      };
    },
    {
      params: t.Object({
        roomId: t.String(),
      }),
      detail: {
        tags: ['WebRTC'],
        summary: 'Get WebRTC statistics',
        description: 'Get WebRTC connection statistics for a room',
      },
    }
  )

  // Get available codecs
  .get(
    '/codecs',
    async () => {
      const codecs = {
        audio: [
          {
            name: 'opus',
            mimeType: 'audio/opus',
            clockRate: 48000,
            channels: 2,
            preferred: true,
          },
          {
            name: 'PCMU',
            mimeType: 'audio/PCMU',
            clockRate: 8000,
            channels: 1,
            preferred: false,
          },
          {
            name: 'PCMA',
            mimeType: 'audio/PCMA',
            clockRate: 8000,
            channels: 1,
            preferred: false,
          },
        ],
        video: [
          {
            name: 'VP8',
            mimeType: 'video/VP8',
            clockRate: 90000,
            preferred: true,
          },
          {
            name: 'VP9',
            mimeType: 'video/VP9',
            clockRate: 90000,
            preferred: false,
          },
          {
            name: 'H264',
            mimeType: 'video/H264',
            clockRate: 90000,
            preferred: false,
          },
        ],
      };

      return {
        success: true,
        codecs,
      };
    },
    {
      detail: {
        tags: ['WebRTC'],
        summary: 'Get available codecs',
        description: 'Get list of supported audio and video codecs',
      },
    }
  )

  // Get bandwidth recommendations
  .get(
    '/bandwidth/:roomId',
    async ({ params: { roomId }, query }) => {
      const { participantCount = 1 } = query;

      // Calculate bandwidth recommendations based on participant count
      const recommendations = {
        roomId,
        participantCount,
        audio: {
          min: 64, // kbps
          recommended: 128, // kbps
          max: 256, // kbps
        },
        video: {
          min: 500, // kbps
          recommended: Math.min(1500, 500 + participantCount * 200), // kbps
          max: 3000, // kbps
        },
        screenShare: {
          min: 1000, // kbps
          recommended: 2000, // kbps
          max: 5000, // kbps
        },
        total: {
          min: 564, // kbps
          recommended: Math.min(3000, 628 + participantCount * 200), // kbps
          max: 8000, // kbps
        },
      };

      return {
        success: true,
        recommendations,
      };
    },
    {
      params: t.Object({
        roomId: t.String(),
      }),
      query: t.Object({
        participantCount: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
      }),
      detail: {
        tags: ['WebRTC'],
        summary: 'Get bandwidth recommendations',
        description:
          'Get bandwidth recommendations for a room based on participant count',
      },
    }
  );
