import type {
  SocketWithContext,
  RoomJoinMessage,
  RoomLeaveMessage,
} from '../types';
import type { WSResponse } from '../../common/types';
import { participantsService } from '../../participants/service';
import { wsState } from '../state';
import { publishToMeeting } from '../redis';
import { ulid } from 'ulid';

export const handleRoomJoin = async (
  socket: SocketWithContext,
  message: RoomJoinMessage,
  verifyRoomToken: (token: string) => Promise<any>
) => {
  try {
    const { roomToken, device } = message.payload!;

    // Verify room token
    const tokenPayload = await verifyRoomToken(roomToken);
    if (!tokenPayload) {
      const response: WSResponse = {
        type: 'error',
        requestId: message.requestId,
        error: 'Invalid room token',
      };
      socket.send(JSON.stringify(response));
      return;
    }

    // Get participant details
    const participant = await participantsService.findById(tokenPayload.sub);
    if (!participant) {
      const response: WSResponse = {
        type: 'error',
        requestId: message.requestId,
        error: 'Participant not found',
      };
      socket.send(JSON.stringify(response));
      return;
    }

    // Update socket context
    socket.data.authenticated = true;
    socket.data.participantId = participant.id;
    socket.data.userId = participant.userId || undefined;
    socket.data.meetingId = participant.meeting.id;
    socket.data.role = participant.role;
    socket.data.displayName = participant.user?.displayName || 'Guest';
    socket.data.mediaState = {
      mic: device.mic ? 'on' : 'off',
      cam: device.cam ? 'on' : 'off',
      screen: 'off',
    };
    socket.data.handRaised = false;

    // Add to room state
    wsState.addToRoom(participant.meeting.id, participant.id, socket);

    // Get all participants in room
    const peers = wsState
      .getRoomSockets(participant.meeting.id)
      .filter(s => s.data.participantId !== participant.id)
      .map(s => ({
        participantId: s.data.participantId,
        displayName: s.data.displayName,
        role: s.data.role,
        mediaState: s.data.mediaState,
        handRaised: s.data.handRaised,
      }));

    // Send joined confirmation to client
    const joinedResponse: WSResponse = {
      type: 'room.joined',
      requestId: message.requestId,
      payload: {
        meeting: participant.meeting,
        selfParticipant: {
          participantId: participant.id,
          displayName: socket.data.displayName,
          role: participant.role,
          mediaState: socket.data.mediaState,
        },
        peers,
      },
    };
    socket.send(JSON.stringify(joinedResponse));

    // Broadcast to others in room
    const participantJoinedMessage = {
      type: 'participant.joined',
      payload: {
        participantId: participant.id,
        displayName: socket.data.displayName,
        role: participant.role,
        mediaState: socket.data.mediaState,
        handRaised: false,
      },
    };

    wsState.broadcastToRoom(
      participant.meeting.id,
      participantJoinedMessage,
      participant.id
    );
    await publishToMeeting(participant.meeting.id, participantJoinedMessage);
  } catch (error) {
    console.error('Error handling room.join:', error);
    const response: WSResponse = {
      type: 'error',
      requestId: message.requestId,
      error: 'Failed to join room',
    };
    socket.send(JSON.stringify(response));
  }
};

export const handleRoomLeave = async (
  socket: SocketWithContext,
  message: RoomLeaveMessage
) => {
  try {
    const { participantId, meetingId } = socket.data;

    if (!participantId || !meetingId) {
      return;
    }

    // Update participant left time
    await participantsService.updateLeftAt(participantId);

    // Remove from room state
    wsState.removeFromRoom(meetingId, participantId);

    // Broadcast to others
    const participantLeftMessage = {
      type: 'participant.left',
      payload: {
        participantId,
      },
    };

    wsState.broadcastToRoom(meetingId, participantLeftMessage);
    await publishToMeeting(meetingId, participantLeftMessage);

    // Send confirmation
    const response: WSResponse = {
      type: 'room.left',
      requestId: message.requestId,
    };
    socket.send(JSON.stringify(response));

    // Clear socket context
    socket.data.participantId = undefined;
    socket.data.meetingId = undefined;
  } catch (error) {
    console.error('Error handling room.leave:', error);
  }
};
