import { Elysia } from 'elysia';
import { jwt } from '../plugins/jwt';
import type { WSContext, SocketWithContext } from './types';
import type { WSMessage, WSResponse } from '../common/types';
import type { AccessTokenPayload } from '../auth/types';
import { handleRoomJoin, handleRoomLeave } from './handlers/room';
import { handleRTCSignal } from './handlers/rtc';
import { handleChatSend } from './handlers/chat';
import { handleMediaUpdate } from './handlers/media';
import {
  handleHandRaise,
  handleHandLower,
  handleReactionSend,
} from './handlers/presence';
import {
  handleModerationMute,
  handleModerationRemove,
} from './handlers/moderation';
import { handleLobbyAdmit, handleLobbyReject } from './handlers/lobby';
import { wsState } from './state';

export const wsGateway = new Elysia().use(jwt).ws('/ws', {
  detail: {
    tags: ['WebSocket'],
    summary: 'WebSocket Gateway',
    description: `
# WebSocket API

Real-time communication endpoint for the Hub video conferencing application.

## Connection Flow

1. **Connect** to \`ws://localhost:3000/ws\` (or \`wss://\` in production)
2. **Authenticate** by sending an \`auth.authenticate\` message with your access token
3. **Join a meeting** using \`room.join\` message with your room token
4. **Communicate** using various message types for chat, media control, etc.
5. **Leave** using \`room.leave\` when done

## Message Format

All WebSocket messages follow this structure:

\`\`\`json
{
  "type": "message-type",
  "requestId": "optional-unique-id",
  "payload": { /* message-specific data */ }
}
\`\`\`

## Authentication

Before using any room features, you must authenticate with your access token:

\`\`\`json
{
  "type": "auth.authenticate",
  "requestId": "auth-123",
  "payload": {
    "accessToken": "your-jwt-access-token"
  }
}
\`\`\`

Success response:
\`\`\`json
{
  "type": "auth.ok",
  "requestId": "auth-123",
  "payload": {
    "userId": "user-id"
  }
}
\`\`\`

Error response:
\`\`\`json
{
  "type": "auth.error",
  "requestId": "auth-123",
  "error": "Invalid access token"
}
\`\`\`

## Room Operations

### Join a Meeting

\`\`\`json
{
  "type": "room.join",
  "requestId": "join-123",
  "payload": {
    "roomToken": "your-room-jwt-token"
  }
}
\`\`\`

### Leave a Meeting

\`\`\`json
{
  "type": "room.leave",
  "requestId": "leave-123"
}
\`\`\`

## Media Control

### Update Media State

\`\`\`json
{
  "type": "media.update",
  "requestId": "media-123",
  "payload": {
    "mic": "on" | "off",
    "cam": "on" | "off",
    "screen": "on" | "off"
  }
}
\`\`\`

## Chat

### Send Chat Message

\`\`\`json
{
  "type": "chat.send",
  "requestId": "chat-123",
  "payload": {
    "message": "Hello, everyone!",
    "type": "text" | "emoji" | "file"
  }
}
\`\`\`

## Reactions

### Send Reaction

\`\`\`json
{
  "type": "reaction.send",
  "requestId": "reaction-123",
  "payload": {
    "emoji": "👍"
  }
}
\`\`\`

## Hand Raising

### Raise Hand

\`\`\`json
{
  "type": "hand.raise",
  "requestId": "hand-123"
}
\`\`\`

### Lower Hand

\`\`\`json
{
  "type": "hand.lower",
  "requestId": "hand-456"
}
\`\`\`

## Moderation (Host only)

### Mute Participant

\`\`\`json
{
  "type": "moderation.mute",
  "requestId": "mute-123",
  "payload": {
    "participantId": "participant-id-to-mute"
  }
}
\`\`\`

### Remove Participant

\`\`\`json
{
  "type": "moderation.remove",
  "requestId": "remove-123",
  "payload": {
    "participantId": "participant-id-to-remove"
  }
}
\`\`\`

## Lobby Management (Host only)

### Admit from Lobby

\`\`\`json
{
  "type": "lobby.admit",
  "requestId": "admit-123",
  "payload": {
    "participantId": "participant-id-to-admit"
  }
}
\`\`\`

### Reject from Lobby

\`\`\`json
{
  "type": "lobby.reject",
  "requestId": "reject-123",
  "payload": {
    "participantId": "participant-id-to-reject"
  }
}
\`\`\`

## WebRTC Signaling

### Send RTC Signal

\`\`\`json
{
  "type": "rtc.signal",
  "requestId": "rtc-123",
  "payload": {
    "to": "target-participant-id",
    "signal": {
      "type": "offer" | "answer" | "ice-candidate",
      "data": { /* WebRTC signal data */ }
    }
  }
}
\`\`\`
    `,
  },
  open(ws) {
    ws.data = {
      authenticated: false,
    } as WSContext;
    console.log('WebSocket connection opened');
  },
  async message(ws, message) {
    try {
      const socket = ws as SocketWithContext;
      const msg =
        typeof message === 'string'
          ? JSON.parse(message)
          : (message as WSMessage);

      console.log('Received message:', msg.type);

      // Handle authentication
      if (msg.type === 'auth.authenticate') {
        await handleAuthenticate(socket, msg, this.access);
        return;
      }

      // All other messages require authentication
      if (!socket.data.authenticated) {
        const response: WSResponse = {
          type: 'error',
          requestId: msg.requestId,
          error: 'Not authenticated',
        };
        socket.send(JSON.stringify(response));
        return;
      }

      // Route messages to handlers
      switch (msg.type) {
        case 'room.join':
          await handleRoomJoin(socket, msg, token => this.room.verify(token));
          break;
        case 'room.leave':
          await handleRoomLeave(socket, msg);
          break;
        case 'rtc.signal':
          handleRTCSignal(socket, msg);
          break;
        case 'media.update':
          await handleMediaUpdate(socket, msg);
          break;
        case 'chat.send':
          await handleChatSend(socket, msg);
          break;
        case 'reaction.send':
          await handleReactionSend(socket, msg);
          break;
        case 'hand.raise':
          await handleHandRaise(socket, msg);
          break;
        case 'hand.lower':
          await handleHandLower(socket, msg);
          break;
        case 'moderation.mute':
          await handleModerationMute(socket, msg);
          break;
        case 'moderation.remove':
          await handleModerationRemove(socket, msg);
          break;
        case 'lobby.admit':
          await handleLobbyAdmit(socket, msg);
          break;
        case 'lobby.reject':
          await handleLobbyReject(socket, msg);
          break;
        default:
          const response: WSResponse = {
            type: 'error',
            requestId: msg.requestId,
            error: `Unknown message type: ${msg.type}`,
          };
          socket.send(JSON.stringify(response));
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      const errorResponse: WSResponse = {
        type: 'error',
        error: 'Internal server error',
      };
      ws.send(JSON.stringify(errorResponse));
    }
  },
  close(ws) {
    const socket = ws as SocketWithContext;
    if (socket.data.meetingId && socket.data.participantId) {
      wsState.removeFromRoom(socket.data.meetingId, socket.data.participantId);
    }
    console.log('WebSocket connection closed');
  },
});

async function handleAuthenticate(
  socket: SocketWithContext,
  message: WSMessage<{ accessToken: string }>,
  accessJwt: any
) {
  try {
    const { accessToken } = message.payload!;

    const payload = (await accessJwt.verify(accessToken)) as
      | AccessTokenPayload
      | false;
    if (!payload) {
      const response: WSResponse = {
        type: 'auth.error',
        requestId: message.requestId,
        error: 'Invalid access token',
      };
      socket.send(JSON.stringify(response));
      return;
    }

    socket.data.authenticated = true;
    socket.data.userId = payload.sub;

    const response: WSResponse = {
      type: 'auth.ok',
      requestId: message.requestId,
      payload: {
        userId: payload.sub,
      },
    };
    socket.send(JSON.stringify(response));
  } catch (error) {
    console.error('Authentication error:', error);
    const response: WSResponse = {
      type: 'auth.error',
      requestId: message.requestId,
      error: 'Authentication failed',
    };
    socket.send(JSON.stringify(response));
  }
}
