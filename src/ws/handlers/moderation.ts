import type {
  SocketWithContext,
  ModerationMuteMessage,
  ModerationRemoveMessage,
} from '../types';
import type { WSResponse } from '../../common/types';
import { wsState } from '../state';
import { publishToMeeting } from '../redis';

export const handleModerationMute = async (
  socket: SocketWithContext,
  message: ModerationMuteMessage
) => {
  try {
    const { meetingId, participantId, role } = socket.data;

    if (!meetingId || !participantId) {
      return;
    }

    if (role !== 'host' && role !== 'cohost') {
      const response: WSResponse = {
        type: 'error',
        requestId: message.requestId,
        error: 'Insufficient permissions',
      };
      socket.send(JSON.stringify(response));
      return;
    }

    const targetId = message.payload!.participantId;
    const targetSocket = wsState.getSocket(meetingId, targetId);

    if (targetSocket) {
      const muteMessage: WSResponse = {
        type: 'moderation.muted',
        payload: {
          by: participantId,
        },
      };
      targetSocket.send(JSON.stringify(muteMessage));

      if (targetSocket.data.mediaState) {
        targetSocket.data.mediaState.mic = 'off';
      }

      const mediaChangedMessage = {
        type: 'media.changed',
        payload: {
          participantId: targetId,
          patch: { mic: 'off' },
        },
      };

      wsState.broadcastToRoom(meetingId, mediaChangedMessage);
      await publishToMeeting(meetingId, mediaChangedMessage);
    }
  } catch (error) {
    console.error('Error handling moderation.mute:', error);
  }
};

export const handleModerationRemove = async (
  socket: SocketWithContext,
  message: ModerationRemoveMessage
) => {
  try {
    const { meetingId, participantId, role } = socket.data;

    if (!meetingId || !participantId) {
      return;
    }

    if (role !== 'host' && role !== 'cohost') {
      const response: WSResponse = {
        type: 'error',
        requestId: message.requestId,
        error: 'Insufficient permissions',
      };
      socket.send(JSON.stringify(response));
      return;
    }

    const targetId = message.payload!.participantId;
    const targetSocket = wsState.getSocket(meetingId, targetId);

    if (targetSocket) {
      const kickedMessage: WSResponse = {
        type: 'room.kicked',
        payload: {
          by: participantId,
          reason: 'Removed by moderator',
        },
      };
      targetSocket.send(JSON.stringify(kickedMessage));

      wsState.removeFromRoom(meetingId, targetId);

      const participantLeftMessage = {
        type: 'participant.left',
        payload: {
          participantId: targetId,
        },
      };

      wsState.broadcastToRoom(meetingId, participantLeftMessage);
      await publishToMeeting(meetingId, participantLeftMessage);
    }
  } catch (error) {
    console.error('Error handling moderation.remove:', error);
  }
};
