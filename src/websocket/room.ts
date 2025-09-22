import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import * as jsonwebtoken from 'jsonwebtoken';
import { authUtils } from '../utils/auth';
import { db } from '../utils/database';
import { WebSocketMessageSchema } from '../types';

const activeConnections = new Map<string, any>(); // userId -> WebSocket
const roomConnections = new Map<string, Set<string>>(); // roomId -> Set of userIds

// Helper to get user context from WebSocket data
const getUserContext = (ws: any): { user: any; room: any } => {
  return { user: (ws as any).data.user, room: (ws as any).data.room };
};

export const roomWebSocket = new Elysia({ prefix: '/ws' })
  .use(
    jwt({
      name: 'jwt',
      secret:
        process.env.JWT_SECRET ||
        'your-super-secret-jwt-key-change-in-production',
      exp: '7d',
    })
  )
  .ws('/room/:roomId', {
    // Handle new WebSocket connection
    open: async ws => {
      try {
        // Get auth token from query params
        const token = ws.data.query.token;

        if (!token) {
          ws.close(1008, 'Unauthorized: No token provided');
          return;
        }

        // Manually verify JWT token using the same secret
        let payload: any;
        try {
          payload = jsonwebtoken.verify(
            token,
            process.env.JWT_SECRET ||
              'your-super-secret-jwt-key-change-in-production'
          );
        } catch (error) {
          ws.close(1008, 'Unauthorized: Invalid token');
          return;
        }

        if (!payload || typeof payload.userId !== 'string') {
          ws.close(1008, 'Unauthorized: Invalid token');
          return;
        }

        const user = await db.getUserById(payload.userId);
        if (!user) {
          ws.close(1008, 'Unauthorized: User not found');
          return;
        }

        const roomId = ws.data.params.roomId;
        const room = await db.getRoomById(roomId);
        if (!room) {
          ws.close(1008, 'Room not found');
          return;
        }

        const participant = await db.getParticipant(user.id, roomId);
        if (!participant) {
          ws.close(1008, 'User is not a participant in this room');
          return;
        }

        // Store user and room data in WebSocket
        (ws.data as any).user = user;
        (ws.data as any).room = room;

        // Store connection
        activeConnections.set(user.id, ws);

        // Add to room connections
        if (!roomConnections.has(room.id)) {
          roomConnections.set(room.id, new Set());
        }
        roomConnections.get(room.id)!.add(user.id);

        // Notify other participants that user joined
        const message = {
          type: 'user_joined',
          data: {
            userId: user.id,
            username: user.username,
            avatar: user.avatar,
            status: user.status,
          },
          timestamp: new Date(),
          userId: user.id,
          roomId: room.id,
        };

        // Broadcast to all other participants in the room
        broadcastToRoom(room.id, message, user.id);

        console.log(`User ${user.username} joined room ${room.name}`);
      } catch (error) {
        console.error('WebSocket open error:', error);
        ws.close(1011, 'Internal server error');
      }
    },

    // Handle incoming WebSocket messages
    message: async (ws, message) => {
      const { user, room } = getUserContext(ws);

      try {
        const parsedMessage = WebSocketMessageSchema.parse({
          ...(typeof message === 'object' ? message : { data: message }),
          userId: user.id,
          roomId: room.id,
          timestamp: new Date(),
        });

        await handleWebSocketMessage(ws, parsedMessage);
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
        ws.send({
          type: 'error',
          data: { message: 'Invalid message format' },
          timestamp: new Date(),
        });
      }
    },

    // Handle WebSocket connection close
    close: ws => {
      const { user, room } = getUserContext(ws);

      // Remove connection
      activeConnections.delete(user.id);

      // Remove from room connections
      const roomUsers = roomConnections.get(room.id);
      if (roomUsers) {
        roomUsers.delete(user.id);
        if (roomUsers.size === 0) {
          roomConnections.delete(room.id);
        }
      }

      // Notify other participants that user left
      const message = {
        type: 'user_left',
        data: {
          userId: user.id,
          username: user.username,
        },
        timestamp: new Date(),
        userId: user.id,
        roomId: room.id,
      };

      // Broadcast to all other participants in the room
      broadcastToRoom(room.id, message, user.id);

      console.log(`User ${user.username} left room ${room.name}`);
    },
  });

// Handle different types of WebSocket messages
async function handleWebSocketMessage(ws: any, message: any) {
  const { type, data, user, room } = message;

  switch (type) {
    case 'chat_message':
      await handleChatMessage(ws, message);
      break;

    case 'emoji_reaction':
      await handleEmojiReaction(ws, message);
      break;

    case 'webrtc_offer':
      await handleWebRTCOffer(ws, message);
      break;

    case 'webrtc_answer':
      await handleWebRTCAnswer(ws, message);
      break;

    case 'webrtc_ice_candidate':
      await handleWebRTCIceCandidate(ws, message);
      break;

    case 'mute_audio':
    case 'unmute_audio':
    case 'mute_video':
    case 'unmute_video':
    case 'raise_hand':
    case 'lower_hand':
      await handleParticipantUpdate(ws, message);
      break;

    case 'screen_share_start':
    case 'screen_share_stop':
      await handleScreenShare(ws, message);
      break;

    default:
      console.log(`Unknown message type: ${type}`);
  }
}

// Handle chat messages
async function handleChatMessage(ws: any, message: any) {
  const { data, user, room } = message;

  // Create chat message in database
  const chatMessage = await db.createChatMessage({
    roomId: room.id,
    userId: user.id,
    message: data.message,
    type: data.type || 'text',
  });

  // Broadcast to all participants in the room
  const broadcastMessage = {
    type: 'chat_message',
    data: {
      id: chatMessage.id,
      message: chatMessage.message,
      type: chatMessage.type,
      userId: chatMessage.userId,
      username: user.username,
      avatar: user.avatar,
      timestamp: chatMessage.timestamp,
    },
    timestamp: new Date(),
    userId: user.id,
    roomId: room.id,
  };

  broadcastToRoom(room.id, broadcastMessage);
}

// Handle emoji reactions
async function handleEmojiReaction(ws: any, message: any) {
  const { data, user, room } = message;

  // Create emoji reaction in database
  const reaction = await db.createEmojiReaction({
    messageId: data.messageId,
    userId: user.id,
    emoji: data.emoji,
  });

  // Broadcast to all participants in the room
  const broadcastMessage = {
    type: 'emoji_reaction',
    data: {
      id: reaction.id,
      messageId: reaction.messageId,
      emoji: reaction.emoji,
      userId: reaction.userId,
      username: user.username,
      timestamp: reaction.timestamp,
    },
    timestamp: new Date(),
    userId: user.id,
    roomId: room.id,
  };

  broadcastToRoom(room.id, broadcastMessage);
}

// Handle WebRTC offers
async function handleWebRTCOffer(ws: any, message: any) {
  const { data, user, room } = message;

  // Forward offer to target user
  const targetWs = activeConnections.get(data.targetUserId);
  if (targetWs) {
    targetWs.send({
      type: 'webrtc_offer',
      data: {
        offer: data.offer,
        fromUserId: user.id,
        username: user.username,
      },
      timestamp: new Date(),
      userId: user.id,
      roomId: room.id,
    });
  }
}

// Handle WebRTC answers
async function handleWebRTCAnswer(ws: any, message: any) {
  const { data, user, room } = message;

  // Forward answer to target user
  const targetWs = activeConnections.get(data.targetUserId);
  if (targetWs) {
    targetWs.send({
      type: 'webrtc_answer',
      data: {
        answer: data.answer,
        fromUserId: user.id,
        username: user.username,
      },
      timestamp: new Date(),
      userId: user.id,
      roomId: room.id,
    });
  }
}

// Handle WebRTC ICE candidates
async function handleWebRTCIceCandidate(ws: any, message: any) {
  const { data, user, room } = message;

  // Forward ICE candidate to target user
  const targetWs = activeConnections.get(data.targetUserId);
  if (targetWs) {
    targetWs.send({
      type: 'webrtc_ice_candidate',
      data: {
        candidate: data.candidate,
        fromUserId: user.id,
        username: user.username,
      },
      timestamp: new Date(),
      userId: user.id,
      roomId: room.id,
    });
  }
}

// Handle participant updates (mute/unmute, hand raising)
async function handleParticipantUpdate(ws: any, message: any) {
  const { type, data, user, room } = message;

  // Update participant in database
  const updates: any = {};

  switch (type) {
    case 'mute_audio':
      updates.isAudioMuted = true;
      break;
    case 'unmute_audio':
      updates.isAudioMuted = false;
      break;
    case 'mute_video':
      updates.isVideoMuted = true;
      break;
    case 'unmute_video':
      updates.isVideoMuted = false;
      break;
    case 'raise_hand':
      updates.hasHandRaised = true;
      break;
    case 'lower_hand':
      updates.hasHandRaised = false;
      break;
  }

  await db.updateParticipant(user.id, room.id, updates);

  // Broadcast to all participants in the room
  const broadcastMessage = {
    type: 'participant_update',
    data: {
      userId: user.id,
      username: user.username,
      updateType: type,
      ...updates,
    },
    timestamp: new Date(),
    userId: user.id,
    roomId: room.id,
  };

  broadcastToRoom(room.id, broadcastMessage);
}

// Handle screen sharing
async function handleScreenShare(ws: any, message: any) {
  const { type, data, user, room } = message;

  // Update participant in database
  const isScreenSharing = type === 'screen_share_start';
  await db.updateParticipant(user.id, room.id, { isScreenSharing });

  // Broadcast to all participants in the room
  const broadcastMessage = {
    type: 'screen_share_update',
    data: {
      userId: user.id,
      username: user.username,
      isScreenSharing,
    },
    timestamp: new Date(),
    userId: user.id,
    roomId: room.id,
  };

  broadcastToRoom(room.id, broadcastMessage);
}

// Broadcast message to all participants in a room
function broadcastToRoom(roomId: string, message: any, excludeUserId?: string) {
  const roomUsers = roomConnections.get(roomId);
  if (!roomUsers) return;

  roomUsers.forEach(userId => {
    if (userId !== excludeUserId) {
      const ws = activeConnections.get(userId);
      if (ws) {
        ws.send(message);
      }
    }
  });
}
