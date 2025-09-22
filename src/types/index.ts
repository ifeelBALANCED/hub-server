import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string().min(3).max(30),
  hashedPassword: z.string(),
  avatar: z.string().url().optional(),
  status: z.enum(['ONLINE', 'AWAY', 'BUSY', 'OFFLINE']).default('OFFLINE'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30),
  password: z.string().min(8),
  avatar: z.string().url().optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const UpdateUserSchema = z.object({
  username: z.string().min(3).max(30).optional(),
  avatar: z.string().url().optional(),
  status: z.enum(['ONLINE', 'AWAY', 'BUSY', 'OFFLINE']).optional(),
});

// Room Types
export const RoomSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  hostId: z.string(),
  isPrivate: z.boolean().default(false),
  password: z.string().optional(),
  maxParticipants: z.number().min(2).max(100).default(50),
  createdAt: z.date(),
  updatedAt: z.date(),
  host: z.any().optional(), // User object
  participants: z.array(z.any()).optional(), // Array of Participant objects
});

export const CreateRoomSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPrivate: z.boolean().default(false),
  password: z.string().optional(),
  maxParticipants: z.number().min(2).max(100).default(50),
});

export const JoinRoomSchema = z.object({
  roomId: z.string(),
  password: z.string().optional(),
});

// WebSocket Message Types
export const WebSocketMessageSchema = z.object({
  type: z.enum([
    'join_room',
    'leave_room',
    'user_joined',
    'user_left',
    'chat_message',
    'emoji_reaction',
    'webrtc_offer',
    'webrtc_answer',
    'webrtc_ice_candidate',
    'screen_share_start',
    'screen_share_stop',
    'mute_audio',
    'unmute_audio',
    'mute_video',
    'unmute_video',
    'raise_hand',
    'lower_hand',
    'participant_update',
  ]),
  data: z.any(),
  timestamp: z.date(),
  userId: z.string(),
  roomId: z.string(),
});

// Chat Types
export const ChatMessageSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  userId: z.string(),
  message: z.string().min(1).max(1000),
  type: z.enum(['TEXT', 'EMOJI', 'SYSTEM']).default('TEXT'),
  timestamp: z.date(),
  user: z.any().optional(), // User object
});

export const EmojiReactionSchema = z.object({
  id: z.string(),
  messageId: z.string(),
  userId: z.string(),
  emoji: z.string().emoji(),
  timestamp: z.date(),
  user: z.any().optional(), // User object
});

// WebRTC Types
export const WebRTCOfferSchema = z.object({
  offer: z.any(), // RTCSessionDescriptionInit
  targetUserId: z.string(),
});

export const WebRTCAnswerSchema = z.object({
  answer: z.any(), // RTCSessionDescriptionInit
  targetUserId: z.string(),
});

export const WebRTCIceCandidateSchema = z.object({
  candidate: z.any(), // RTCIceCandidateInit
  targetUserId: z.string(),
});

// Device Types
export const DeviceSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.enum(['audioinput', 'audiooutput', 'videoinput']),
});

// TURN/STUN Configuration
export const TurnStunConfigSchema = z.object({
  iceServers: z.array(
    z.object({
      urls: z.string(),
      username: z.string().optional(),
      credential: z.string().optional(),
    })
  ),
});

// Participant Types
export const ParticipantSchema = z.object({
  userId: z.string(),
  roomId: z.string(),
  isAudioMuted: z.boolean().default(false),
  isVideoMuted: z.boolean().default(false),
  isScreenSharing: z.boolean().default(false),
  hasHandRaised: z.boolean().default(false),
  joinedAt: z.date(),
  user: z.any().optional(), // User object
});

export const UpdateParticipantSchema = z.object({
  isAudioMuted: z.boolean().optional(),
  isVideoMuted: z.boolean().optional(),
  isScreenSharing: z.boolean().optional(),
  hasHandRaised: z.boolean().optional(),
});

// Type exports
export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type Login = z.infer<typeof LoginSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;

export type Room = z.infer<typeof RoomSchema>;
export type CreateRoom = z.infer<typeof CreateRoomSchema>;
export type JoinRoom = z.infer<typeof JoinRoomSchema>;

export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type EmojiReaction = z.infer<typeof EmojiReactionSchema>;

export type WebRTCOffer = z.infer<typeof WebRTCOfferSchema>;
export type WebRTCAnswer = z.infer<typeof WebRTCAnswerSchema>;
export type WebRTCIceCandidate = z.infer<typeof WebRTCIceCandidateSchema>;

export type Device = z.infer<typeof DeviceSchema>;
export type TurnStunConfig = z.infer<typeof TurnStunConfigSchema>;
export type Participant = z.infer<typeof ParticipantSchema>;
export type UpdateParticipant = z.infer<typeof UpdateParticipantSchema>;
