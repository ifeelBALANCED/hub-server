import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { authUtils } from '../utils/auth';
import { db } from '../utils/database';
import { CreateRoomSchema, JoinRoomSchema } from '../types';

export const roomRoutes = new Elysia({ prefix: '/rooms' })
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

  // Create a new room
  .post(
    '/',
    async ({ body, user, set }) => {
      try {
        const roomData = CreateRoomSchema.parse(body);

        const room = await db.createRoom({
          ...roomData,
          hostId: user.id,
        });

        // Create participant record
        await db.createParticipant({
          userId: user.id,
          roomId: room.id,
          isAudioMuted: false,
          isVideoMuted: false,
          isScreenSharing: false,
          hasHandRaised: false,
        });

        return {
          success: true,
          room: {
            id: room.id,
            name: room.name,
            description: room.description,
            hostId: room.hostId,
            isPrivate: room.isPrivate,
            maxParticipants: room.maxParticipants,
            createdAt: room.createdAt,
          },
        };
      } catch (err) {
        set.status = 400;
        return { success: false, message: 'Invalid room data' };
      }
    },
    {
      body: CreateRoomSchema,
      detail: {
        tags: ['Rooms'],
        summary: 'Create a new room',
        description: 'Create a new meeting room with the specified settings',
      },
    }
  )

  // Get all public rooms
  .get(
    '/',
    async ({ query }) => {
      const { limit = 20, offset = 0 } = query;

      const rooms = await db.getPublicRooms();
      const paginatedRooms = rooms.slice(offset, offset + limit).map(room => ({
        id: room.id,
        name: room.name,
        description: room.description,
        hostId: room.hostId,
        isPrivate: room.isPrivate,
        maxParticipants: room.maxParticipants,
        participantCount: room.participants?.length || 0,
        createdAt: room.createdAt,
      }));

      return {
        success: true,
        rooms: paginatedRooms,
        pagination: {
          limit,
          offset,
          total: rooms.length,
        },
      };
    },
    {
      query: t.Object({
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
        offset: t.Optional(t.Number({ minimum: 0 })),
      }),
      detail: {
        tags: ['Rooms'],
        summary: 'Get all public rooms',
        description: 'Get a list of all public meeting rooms',
      },
    }
  )

  // Get room by ID
  .get(
    '/:id',
    async ({ params: { id }, set }) => {
      const room = await db.getRoomById(id);
      if (!room) {
        set.status = 404;
        return { success: false, message: 'Room not found' };
      }

      // Get participants with user details
      const participants = await db.getParticipantsByRoomId(id);
      const participantDetails = participants.map(participant => ({
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
        room: {
          id: room.id,
          name: room.name,
          description: room.description,
          hostId: room.hostId,
          isPrivate: room.isPrivate,
          maxParticipants: room.maxParticipants,
          participants: participantDetails,
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
        },
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['Rooms'],
        summary: 'Get room by ID',
        description:
          'Get detailed information about a specific room including participants',
      },
    }
  )

  // Join a room
  .post(
    '/:id/join',
    async ({ params: { id }, body, user, set }) => {
      const room = await db.getRoomById(id);
      if (!room) {
        set.status = 404;
        return { success: false, message: 'Room not found' };
      }

      // Check if user is already in the room
      const existingParticipant = await db.getParticipant(user.id, id);
      if (existingParticipant) {
        set.status = 400;
        return { success: false, message: 'User is already in this room' };
      }

      // Check if room is full
      const participantCount = await db.getParticipantsByRoomId(id);
      if (participantCount.length >= room.maxParticipants) {
        set.status = 400;
        return { success: false, message: 'Room is full' };
      }

      // Check password for private rooms
      if (room.isPrivate && room.password) {
        const { password } = JoinRoomSchema.parse(body);
        if (password !== room.password) {
          set.status = 401;
          return { success: false, message: 'Invalid room password' };
        }
      }

      // Add user to room
      await db.addParticipantToRoom(id, user.id);

      // Create participant record
      await db.createParticipant({
        userId: user.id,
        roomId: id,
        isAudioMuted: false,
        isVideoMuted: false,
        isScreenSharing: false,
        hasHandRaised: false,
      });

      return {
        success: true,
        message: 'Successfully joined the room',
        room: {
          id: room.id,
          name: room.name,
          description: room.description,
          hostId: room.hostId,
          isPrivate: room.isPrivate,
          maxParticipants: room.maxParticipants,
        },
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: JoinRoomSchema,
      detail: {
        tags: ['Rooms'],
        summary: 'Join a room',
        description:
          'Join a meeting room (password required for private rooms)',
      },
    }
  )

  // Leave a room
  .post(
    '/:id/leave',
    async ({ params: { id }, user, set }) => {
      const room = await db.getRoomById(id);
      if (!room) {
        set.status = 404;
        return { success: false, message: 'Room not found' };
      }

      // Remove user from room
      await db.removeParticipantFromRoom(id, user.id);

      // Delete participant record
      await db.deleteParticipant(user.id, id);

      return {
        success: true,
        message: 'Successfully left the room',
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['Rooms'],
        summary: 'Leave a room',
        description: 'Leave a meeting room',
      },
    }
  )

  // Update room settings (host only)
  .put(
    '/:id',
    async ({ params: { id }, body, user, set }) => {
      const room = await db.getRoomById(id);
      if (!room) {
        set.status = 404;
        return { success: false, message: 'Room not found' };
      }

      // Check if user is the host
      if (room.hostId !== user.id) {
        set.status = 403;
        return {
          success: false,
          message: 'Only the room host can update room settings',
        };
      }

      try {
        const updates = CreateRoomSchema.partial().parse(body);
        const updatedRoom = await db.updateRoom(id, updates);

        if (!updatedRoom) {
          set.status = 404;
          return { success: false, message: 'Room not found' };
        }

        return {
          success: true,
          room: {
            id: updatedRoom.id,
            name: updatedRoom.name,
            description: updatedRoom.description,
            hostId: updatedRoom.hostId,
            isPrivate: updatedRoom.isPrivate,
            maxParticipants: updatedRoom.maxParticipants,
            updatedAt: updatedRoom.updatedAt,
          },
        };
      } catch (err) {
        set.status = 400;
        return { success: false, message: 'Invalid room update data' };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: CreateRoomSchema.partial(),
      detail: {
        tags: ['Rooms'],
        summary: 'Update room settings',
        description: 'Update room settings (host only)',
      },
    }
  )

  // Delete room (host only)
  .delete(
    '/:id',
    async ({ params: { id }, user, set }) => {
      const room = await db.getRoomById(id);
      if (!room) {
        set.status = 404;
        return { success: false, message: 'Room not found' };
      }

      // Check if user is the host
      if (room.hostId !== user.id) {
        set.status = 403;
        return {
          success: false,
          message: 'Only the room host can delete the room',
        };
      }

      const deleted = await db.deleteRoom(id);
      if (!deleted) {
        set.status = 404;
        return { success: false, message: 'Room not found' };
      }

      return {
        success: true,
        message: 'Room deleted successfully',
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['Rooms'],
        summary: 'Delete room',
        description: 'Delete a room (host only)',
      },
    }
  )

  // Get rooms created by current user
  .get(
    '/my-rooms',
    async ({ user }) => {
      const rooms = await db.getRoomsByHostId(user.id);

      const roomList = rooms.map(room => ({
        id: room.id,
        name: room.name,
        description: room.description,
        hostId: room.hostId,
        isPrivate: room.isPrivate,
        maxParticipants: room.maxParticipants,
        participantCount: room.participants?.length || 0,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
      }));

      return {
        success: true,
        rooms: roomList,
      };
    },
    {
      detail: {
        tags: ['Rooms'],
        summary: 'Get my rooms',
        description: 'Get all rooms created by the current user',
      },
    }
  );
