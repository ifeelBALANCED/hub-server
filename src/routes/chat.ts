import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { authUtils } from '../utils/auth';
import { db } from '../utils/database';

export const chatRoutes = new Elysia({ prefix: '/chat' })
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

  // Get chat messages for a room
  .get(
    '/rooms/:roomId/messages',
    async ({ params: { roomId }, query, user, set }) => {
      const room = await db.getRoomById(roomId);
      if (!room) {
        set.status = 404;
        return { success: false, message: 'Room not found' };
      }

      // Check if user is a participant
      const participant = await db.getParticipant(user.id, roomId);
      if (!participant) {
        set.status = 403;
        return {
          success: false,
          message: 'User is not a participant in this room',
        };
      }

      const { limit = 50, offset = 0 } = query;
      const messages = await db.getChatMessagesByRoomId(roomId, limit);

      // Get user details for each message
      const messagesWithUsers = messages.map(message => ({
        id: message.id,
        message: message.message,
        type: message.type,
        userId: message.userId,
        username: message.user?.username || 'Unknown',
        avatar: message.user?.avatar,
        timestamp: message.timestamp,
      }));

      return {
        success: true,
        messages: messagesWithUsers,
        pagination: {
          limit,
          offset,
          total: messages.length,
        },
      };
    },
    {
      params: t.Object({
        roomId: t.String(),
      }),
      query: t.Object({
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
        offset: t.Optional(t.Number({ minimum: 0 })),
      }),
      detail: {
        tags: ['Chat'],
        summary: 'Get chat messages',
        description: 'Get chat messages for a specific room',
      },
    }
  )

  // Get emoji reactions for a message
  .get(
    '/messages/:messageId/reactions',
    async ({ params: { messageId }, set }) => {
      const reactions = await db.getEmojiReactionsByMessageId(messageId);

      // Get user details for each reaction
      const reactionsWithUsers = reactions.map(reaction => ({
        id: reaction.id,
        emoji: reaction.emoji,
        userId: reaction.userId,
        username: reaction.user?.username || 'Unknown',
        avatar: reaction.user?.avatar,
        timestamp: reaction.timestamp,
      }));

      return {
        success: true,
        reactions: reactionsWithUsers,
      };
    },
    {
      params: t.Object({
        messageId: t.String(),
      }),
      detail: {
        tags: ['Chat'],
        summary: 'Get emoji reactions',
        description: 'Get emoji reactions for a specific message',
      },
    }
  );
