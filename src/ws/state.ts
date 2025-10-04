import type { SocketWithContext, RoomState } from './types';

// In-memory state for connected clients
export class WSState {
  private rooms: Map<string, RoomState> = new Map();

  addToRoom(
    meetingId: string,
    participantId: string,
    socket: SocketWithContext
  ) {
    if (!this.rooms.has(meetingId)) {
      this.rooms.set(meetingId, {
        meetingId,
        sockets: new Map(),
      });
    }

    const room = this.rooms.get(meetingId)!;
    room.sockets.set(participantId, socket);
  }

  removeFromRoom(meetingId: string, participantId: string) {
    const room = this.rooms.get(meetingId);
    if (!room) return;

    room.sockets.delete(participantId);

    if (room.sockets.size === 0) {
      this.rooms.delete(meetingId);
    }
  }

  getRoomSockets(meetingId: string): SocketWithContext[] {
    const room = this.rooms.get(meetingId);
    return room ? Array.from(room.sockets.values()) : [];
  }

  getSocket(
    meetingId: string,
    participantId: string
  ): SocketWithContext | undefined {
    const room = this.rooms.get(meetingId);
    return room?.sockets.get(participantId);
  }

  broadcastToRoom(
    meetingId: string,
    message: any,
    excludeParticipantId?: string
  ) {
    const sockets = this.getRoomSockets(meetingId);
    const payload = JSON.stringify(message);

    for (const socket of sockets) {
      if (
        excludeParticipantId &&
        socket.data.participantId === excludeParticipantId
      ) {
        continue;
      }
      socket.send(payload);
    }
  }
}

export const wsState = new WSState();
