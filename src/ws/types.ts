import type {
  WSMessage,
  WSResponse,
  DeviceState,
  MediaState,
} from '../common/types';
import type { ServerWebSocket } from 'bun';

export type WSContext = {
  authenticated: boolean;
  userId?: string;
  participantId?: string;
  meetingId?: string;
  role?: 'host' | 'cohost' | 'guest';
  displayName?: string;
  mediaState?: MediaState;
  handRaised?: boolean;
};

export type SocketWithContext = ServerWebSocket<WSContext>;

export type RoomState = {
  meetingId: string;
  sockets: Map<string, SocketWithContext>; // participantId -> socket
};

// WebSocket message types
export type AuthenticateMessage = WSMessage<{ accessToken: string }>;
export type RoomJoinMessage = WSMessage<{
  roomToken: string;
  device: DeviceState;
}>;
export type RoomLeaveMessage = WSMessage<{}>;
export type RTCSignalMessage = WSMessage<{
  to: string;
  type: 'offer' | 'answer' | 'ice';
  sdp?: any;
  candidate?: any;
}>;
export type MediaUpdateMessage = WSMessage<Partial<MediaState>>;
export type ChatSendMessage = WSMessage<{ text: string }>;
export type ReactionSendMessage = WSMessage<{ type: string }>;
export type HandRaiseMessage = WSMessage<{}>;
export type HandLowerMessage = WSMessage<{}>;
export type ModerationMuteMessage = WSMessage<{ participantId: string }>;
export type ModerationRemoveMessage = WSMessage<{ participantId: string }>;
export type LobbyAdmitMessage = WSMessage<{ participantId: string }>;
export type LobbyRejectMessage = WSMessage<{ participantId: string }>;
