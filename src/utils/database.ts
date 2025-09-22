import { prisma } from '../lib/prisma';
import type {
  User,
  Room,
  Participant,
  ChatMessage,
  EmojiReaction,
  UserSession,
} from '@prisma/client';
import type {
  CreateUser,
  CreateRoom,
  UpdateUser,
  UpdateParticipant,
} from '../types';

export class Database {
  async createUser(
    userData: CreateUser & { hashedPassword: string }
  ): Promise<User> {
    return await prisma.user.create({
      data: {
        email: userData.email,
        username: userData.username,
        hashedPassword: userData.hashedPassword,
        avatar: userData.avatar,
        status: 'OFFLINE',
      },
    });
  }

  async getUserById(id: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { id },
    });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { email },
    });
  }

  async updateUser(id: string, updates: UpdateUser): Promise<User | null> {
    try {
      return await prisma.user.update({
        where: { id },
        data: updates,
      });
    } catch {
      return null;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      await prisma.user.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  async getAllUsers(limit: number = 50, offset: number = 0): Promise<User[]> {
    return await prisma.user.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });
  }

  async searchUsersByUsername(username: string): Promise<User[]> {
    return await prisma.user.findMany({
      where: {
        username: {
          contains: username,
        },
      },
    });
  }

  // Room operations
  async createRoom(roomData: CreateRoom & { hostId: string }): Promise<Room> {
    return await prisma.room.create({
      data: {
        name: roomData.name,
        description: roomData.description,
        hostId: roomData.hostId,
        isPrivate: roomData.isPrivate,
        password: roomData.password,
        maxParticipants: roomData.maxParticipants,
      },
    });
  }

  async getRoomById(
    id: string
  ): Promise<
    | (Room & { host: User; participants: (Participant & { user: User })[] })
    | null
  > {
    return await prisma.room.findUnique({
      where: { id },
      include: {
        host: true,
        participants: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async getRoomsByHostId(
    hostId: string
  ): Promise<(Room & { participants: Participant[] })[]> {
    return await prisma.room.findMany({
      where: { hostId },
      include: {
        participants: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPublicRooms(): Promise<(Room & { participants: Participant[] })[]> {
    return await prisma.room.findMany({
      where: { isPrivate: false },
      include: {
        participants: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateRoom(
    id: string,
    updates: Partial<CreateRoom>
  ): Promise<Room | null> {
    try {
      return await prisma.room.update({
        where: { id },
        data: updates,
      });
    } catch {
      return null;
    }
  }

  async deleteRoom(id: string): Promise<boolean> {
    try {
      await prisma.room.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  async addParticipantToRoom(roomId: string, userId: string): Promise<boolean> {
    try {
      await prisma.participant.create({
        data: {
          userId,
          roomId,
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  async removeParticipantFromRoom(
    roomId: string,
    userId: string
  ): Promise<boolean> {
    try {
      await prisma.participant.delete({
        where: {
          userId_roomId: {
            userId,
            roomId,
          },
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  async createChatMessage(messageData: {
    roomId: string;
    userId: string;
    message: string;
    type?: 'TEXT' | 'EMOJI' | 'SYSTEM';
  }): Promise<ChatMessage> {
    return await prisma.chatMessage.create({
      data: {
        roomId: messageData.roomId,
        userId: messageData.userId,
        message: messageData.message,
        type: messageData.type || 'TEXT',
      },
    });
  }

  async getChatMessagesByRoomId(
    roomId: string,
    limit: number = 50
  ): Promise<(ChatMessage & { user: User })[]> {
    return await prisma.chatMessage.findMany({
      where: { roomId },
      take: limit,
      orderBy: { timestamp: 'desc' },
      include: {
        user: true,
      },
    });
  }

  // Participant operations
  async createParticipant(participantData: {
    userId: string;
    roomId: string;
    isAudioMuted?: boolean;
    isVideoMuted?: boolean;
    isScreenSharing?: boolean;
    hasHandRaised?: boolean;
  }): Promise<Participant> {
    return await prisma.participant.create({
      data: {
        userId: participantData.userId,
        roomId: participantData.roomId,
        isAudioMuted: participantData.isAudioMuted || false,
        isVideoMuted: participantData.isVideoMuted || false,
        isScreenSharing: participantData.isScreenSharing || false,
        hasHandRaised: participantData.hasHandRaised || false,
      },
    });
  }

  async getParticipant(
    userId: string,
    roomId: string
  ): Promise<(Participant & { user: User }) | null> {
    return await prisma.participant.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
      include: {
        user: true,
      },
    });
  }

  async updateParticipant(
    userId: string,
    roomId: string,
    updates: UpdateParticipant
  ): Promise<(Participant & { user: User }) | null> {
    try {
      return await prisma.participant.update({
        where: {
          userId_roomId: {
            userId,
            roomId,
          },
        },
        data: updates,
        include: {
          user: true,
        },
      });
    } catch {
      return null;
    }
  }

  async deleteParticipant(userId: string, roomId: string): Promise<boolean> {
    try {
      await prisma.participant.delete({
        where: {
          userId_roomId: {
            userId,
            roomId,
          },
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  async getParticipantsByRoomId(
    roomId: string
  ): Promise<(Participant & { user: User })[]> {
    return await prisma.participant.findMany({
      where: { roomId },
      include: {
        user: true,
      },
    });
  }

  // Emoji reaction operations
  async createEmojiReaction(reactionData: {
    messageId: string;
    userId: string;
    emoji: string;
  }): Promise<EmojiReaction> {
    return await prisma.emojiReaction.create({
      data: {
        messageId: reactionData.messageId,
        userId: reactionData.userId,
        emoji: reactionData.emoji,
      },
    });
  }

  async getEmojiReactionsByMessageId(
    messageId: string
  ): Promise<(EmojiReaction & { user: User })[]> {
    return await prisma.emojiReaction.findMany({
      where: { messageId },
      include: {
        user: true,
      },
    });
  }

  // Session operations
  async createSession(
    token: string,
    userId: string,
    expiresAt: Date
  ): Promise<UserSession> {
    return await prisma.userSession.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });
  }

  async getUserIdByToken(token: string): Promise<string | null> {
    const session = await prisma.userSession.findUnique({
      where: { token },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return session.userId;
  }

  async deleteSession(token: string): Promise<boolean> {
    try {
      await prisma.userSession.delete({
        where: { token },
      });
      return true;
    } catch {
      return false;
    }
  }

  async deleteExpiredSessions(): Promise<number> {
    const result = await prisma.userSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  }
}

export const db = new Database();
