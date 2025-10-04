import type { SocketWithContext, RTCSignalMessage } from '../types';
import type { WSResponse } from '../../common/types';
import { wsState } from '../state';

export const handleRTCSignal = (
  socket: SocketWithContext,
  message: RTCSignalMessage
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

    const { to, type, sdp, candidate } = message.payload!;

    // Forward signal to target peer
    const targetSocket = wsState.getSocket(meetingId, to);
    if (targetSocket) {
      const signalMessage: WSResponse = {
        type: 'rtc.signal',
        payload: {
          from: participantId,
          type,
          sdp,
          candidate,
        },
      };
      targetSocket.send(JSON.stringify(signalMessage));
    }
  } catch (error) {
    console.error('Error handling rtc.signal:', error);
  }
};
