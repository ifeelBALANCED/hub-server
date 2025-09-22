import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { authUtils } from '../utils/auth';
import { db } from '../utils/database';
import { UpdateParticipantSchema } from '../types';

export const participantRoutes = new Elysia({ prefix: '/participants' })
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

  // Get participants in a room
  .get(
    '/rooms/:roomId',
    async ({ params: { roomId }, user, set }) => {
      const room = await db.getRoomById(roomId);
      if (!room) {
        set.status = 404;
        return { success: false, message: 'Room not found' };
      }

      // Check if user is a participant
      const userParticipant = await db.getParticipant(user.id, roomId);
      if (!userParticipant) {
        set.status = 403;
        return {
          success: false,
          message: 'User is not a participant in this room',
        };
      }

      const participants = await db.getParticipantsByRoomId(roomId);

      // Get user details for each participant
      const participantsWithUsers = participants.map(participant => ({
        userId: participant.userId,
        username: participant.user?.username || 'Unknown',
        avatar: participant.user?.avatar,
        status: participant.user?.status || 'OFFLINE',
        isAudioMuted: participant.isAudioMuted,
        isVideoMuted: participant.isVideoMuted,
        isScreenSharing: participant.isScreenSharing,
        hasHandRaised: participant.hasHandRaised,
        joinedAt: participant.joinedAt,
      }));

      return {
        success: true,
        participants: participantsWithUsers,
      };
    },
    {
      params: t.Object({
        roomId: t.String(),
      }),
      detail: {
        tags: ['Participants'],
        summary: 'Get participants in a room',
        description: 'Get a list of all participants in a specific room',
      },
    }
  )

  // Update participant settings
  .put(
    '/rooms/:roomId/me',
    async ({ params: { roomId }, body, user, set }) => {
      const room = await db.getRoomById(roomId);
      if (!room) {
        set.status = 404;
        return { success: false, message: 'Room not found' };
      }

      // Check if user is a participant
      const userParticipant = await db.getParticipant(user.id, roomId);
      if (!userParticipant) {
        set.status = 403;
        return {
          success: false,
          message: 'User is not a participant in this room',
        };
      }

      try {
        const updates = UpdateParticipantSchema.parse(body);
        const updatedParticipant = await db.updateParticipant(
          user.id,
          roomId,
          updates
        );

        if (!updatedParticipant) {
          set.status = 404;
          return { success: false, message: 'Participant not found' };
        }

        return {
          success: true,
          participant: {
            userId: updatedParticipant.userId,
            username: updatedParticipant.user?.username || 'Unknown',
            avatar: updatedParticipant.user?.avatar,
            status: updatedParticipant.user?.status || 'OFFLINE',
            isAudioMuted: updatedParticipant.isAudioMuted,
            isVideoMuted: updatedParticipant.isVideoMuted,
            isScreenSharing: updatedParticipant.isScreenSharing,
            hasHandRaised: updatedParticipant.hasHandRaised,
            joinedAt: updatedParticipant.joinedAt,
          },
        };
      } catch (err) {
        set.status = 400;
        return { success: false, message: 'Invalid participant update data' };
      }
    },
    {
      params: t.Object({
        roomId: t.String(),
      }),
      body: UpdateParticipantSchema,
      detail: {
        tags: ['Participants'],
        summary: 'Update participant settings',
        description: 'Update settings for the current user in a room',
      },
    }
  )

  // Get participant by ID
  .get(
    '/rooms/:roomId/users/:userId',
    async ({ params: { roomId, userId }, user, set }) => {
      const room = await db.getRoomById(roomId);
      if (!room) {
        set.status = 404;
        return { success: false, message: 'Room not found' };
      }

      // Check if user is a participant
      const userParticipant = await db.getParticipant(user.id, roomId);
      if (!userParticipant) {
        set.status = 403;
        return {
          success: false,
          message: 'User is not a participant in this room',
        };
      }

      const participant = await db.getParticipant(userId, roomId);
      if (!participant) {
        set.status = 404;
        return { success: false, message: 'Participant not found' };
      }

      return {
        success: true,
        participant: {
          userId: participant.userId,
          username: participant.user?.username || 'Unknown',
          avatar: participant.user?.avatar,
          status: participant.user?.status || 'OFFLINE',
          isAudioMuted: participant.isAudioMuted,
          isVideoMuted: participant.isVideoMuted,
          isScreenSharing: participant.isScreenSharing,
          hasHandRaised: participant.hasHandRaised,
          joinedAt: participant.joinedAt,
        },
      };
    },
    {
      params: t.Object({
        roomId: t.String(),
        userId: t.String(),
      }),
      detail: {
        tags: ['Participants'],
        summary: 'Get participant by ID',
        description: 'Get details of a specific participant in a room',
      },
    }
  )

  // Mute/unmute audio for a participant (host only)
  .post(
    '/rooms/:roomId/users/:userId/audio/:action',
    async ({ params: { roomId, userId, action }, user, set }) => {
      const room = await db.getRoomById(roomId);
      if (!room) {
        set.status = 404;
        return { success: false, message: 'Room not found' };
      }

      // Check if user is the host
      if (room.hostId !== user.id) {
        set.status = 403;
        return {
          success: false,
          message: 'Only the room host can mute/unmute participants',
        };
      }

      // Check if target user is a participant
      const targetParticipant = await db.getParticipant(userId, roomId);
      if (!targetParticipant) {
        set.status = 404;
        return {
          success: false,
          message: 'Target user is not a participant in this room',
        };
      }

      if (action !== 'mute' && action !== 'unmute') {
        set.status = 400;
        return {
          success: false,
          message: 'Invalid action. Use "mute" or "unmute"',
        };
      }

      const isAudioMuted = action === 'mute';
      const updatedParticipant = await db.updateParticipant(userId, roomId, {
        isAudioMuted,
      });

      if (!updatedParticipant) {
        set.status = 404;
        return { success: false, message: 'Participant not found' };
      }

      return {
        success: true,
        message: `Audio ${action}d successfully`,
        participant: {
          userId: updatedParticipant.userId,
          username: updatedParticipant.user?.username || 'Unknown',
          avatar: updatedParticipant.user?.avatar,
          status: updatedParticipant.user?.status || 'OFFLINE',
          isAudioMuted: updatedParticipant.isAudioMuted,
          isVideoMuted: updatedParticipant.isVideoMuted,
          isScreenSharing: updatedParticipant.isScreenSharing,
          hasHandRaised: updatedParticipant.hasHandRaised,
          joinedAt: updatedParticipant.joinedAt,
        },
      };
    },
    {
      params: t.Object({
        roomId: t.String(),
        userId: t.String(),
        action: t.Union([t.Literal('mute'), t.Literal('unmute')]),
      }),
      detail: {
        tags: ['Participants'],
        summary: 'Mute/unmute audio for a participant',
        description:
          'Mute or unmute audio for a specific participant (host only)',
      },
    }
  )

  // Mute/unmute video for a participant (host only)
  .post(
    '/rooms/:roomId/users/:userId/video/:action',
    async ({ params: { roomId, userId, action }, user, set }) => {
      const room = await db.getRoomById(roomId);
      if (!room) {
        set.status = 404;
        return { success: false, message: 'Room not found' };
      }

      // Check if user is the host
      if (room.hostId !== user.id) {
        set.status = 403;
        return {
          success: false,
          message: 'Only the room host can mute/unmute participants',
        };
      }

      // Check if target user is a participant
      const targetParticipant = await db.getParticipant(userId, roomId);
      if (!targetParticipant) {
        set.status = 404;
        return {
          success: false,
          message: 'Target user is not a participant in this room',
        };
      }

      if (action !== 'mute' && action !== 'unmute') {
        set.status = 400;
        return {
          success: false,
          message: 'Invalid action. Use "mute" or "unmute"',
        };
      }

      const isVideoMuted = action === 'mute';
      const updatedParticipant = await db.updateParticipant(userId, roomId, {
        isVideoMuted,
      });

      if (!updatedParticipant) {
        set.status = 404;
        return { success: false, message: 'Participant not found' };
      }

      return {
        success: true,
        message: `Video ${action}d successfully`,
        participant: {
          userId: updatedParticipant.userId,
          username: updatedParticipant.user?.username || 'Unknown',
          avatar: updatedParticipant.user?.avatar,
          status: updatedParticipant.user?.status || 'OFFLINE',
          isAudioMuted: updatedParticipant.isAudioMuted,
          isVideoMuted: updatedParticipant.isVideoMuted,
          isScreenSharing: updatedParticipant.isScreenSharing,
          hasHandRaised: updatedParticipant.hasHandRaised,
          joinedAt: updatedParticipant.joinedAt,
        },
      };
    },
    {
      params: t.Object({
        roomId: t.String(),
        userId: t.String(),
        action: t.Union([t.Literal('mute'), t.Literal('unmute')]),
      }),
      detail: {
        tags: ['Participants'],
        summary: 'Mute/unmute video for a participant',
        description:
          'Mute or unmute video for a specific participant (host only)',
      },
    }
  )

  // Remove participant from room (host only)
  .delete(
    '/rooms/:roomId/users/:userId',
    async ({ params: { roomId, userId }, user, set }) => {
      const room = await db.getRoomById(roomId);
      if (!room) {
        set.status = 404;
        return { success: false, message: 'Room not found' };
      }

      // Check if user is the host
      if (room.hostId !== user.id) {
        set.status = 403;
        return {
          success: false,
          message: 'Only the room host can remove participants',
        };
      }

      // Check if target user is a participant
      const targetParticipant = await db.getParticipant(userId, roomId);
      if (!targetParticipant) {
        set.status = 404;
        return {
          success: false,
          message: 'Target user is not a participant in this room',
        };
      }

      // Remove participant from room
      await db.removeParticipantFromRoom(roomId, userId);
      await db.deleteParticipant(userId, roomId);

      return {
        success: true,
        message: 'Participant removed successfully',
      };
    },
    {
      params: t.Object({
        roomId: t.String(),
        userId: t.String(),
      }),
      detail: {
        tags: ['Participants'],
        summary: 'Remove participant from room',
        description: 'Remove a participant from a room (host only)',
      },
    }
  );
