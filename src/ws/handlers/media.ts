import type { SocketWithContext, MediaUpdateMessage } from '../types';
import type { WSResponse } from '../../common/types';
import { wsState } from '../state';
import { publishToMeeting } from '../redis';

export const handleMediaUpdate = async (
  socket: SocketWithContext,
  message: MediaUpdateMessage
) => {
  try {
    const { meetingId, participantId } = socket.data;

    if (!meetingId || !participantId) {
      const response: WSResponse = {
        type: 'error',
        requestId: message.requestId,
        error: 'Not in a room',
      };
      socket.send(JSON.stringify(response));
      return;
    }

    if (socket.data.mediaState) {
      socket.data.mediaState = {
        ...socket.data.mediaState,
        ...message.payload,
      };
    }

    const mediaChangedMessage = {
      type: 'media.changed',
      payload: {
        participantId,
        patch: message.payload,
      },
    };

    wsState.broadcastToRoom(meetingId, mediaChangedMessage, participantId);
    await publishToMeeting(meetingId, mediaChangedMessage);
  } catch (error) {
    console.error('Error handling media.update:', error);
  }
};
