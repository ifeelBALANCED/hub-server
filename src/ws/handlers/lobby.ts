import type {
  SocketWithContext,
  LobbyAdmitMessage,
  LobbyRejectMessage,
} from '../types';
import type { WSResponse } from '../../common/types';
import { wsState } from '../state';

export const handleLobbyAdmit = async (
  socket: SocketWithContext,
  message: LobbyAdmitMessage
) => {
  try {
    const { meetingId, role } = socket.data;

    if (!meetingId || role !== 'host') {
      const response: WSResponse = {
        type: 'error',
        requestId: message.requestId,
        error: 'Only hosts can admit participants',
      };
      socket.send(JSON.stringify(response));
      return;
    }

    const targetId = message.payload!.participantId;
    const targetSocket = wsState.getSocket(meetingId, targetId);

    if (targetSocket) {
      const admittedMessage: WSResponse = {
        type: 'lobby.result',
        payload: {
          admitted: true,
        },
      };
      targetSocket.send(JSON.stringify(admittedMessage));
    }
  } catch (error) {
    console.error('Error handling lobby.admit:', error);
  }
};

export const handleLobbyReject = async (
  socket: SocketWithContext,
  message: LobbyRejectMessage
) => {
  try {
    const { meetingId, role } = socket.data;

    if (!meetingId || role !== 'host') {
      const response: WSResponse = {
        type: 'error',
        requestId: message.requestId,
        error: 'Only hosts can reject participants',
      };
      socket.send(JSON.stringify(response));
      return;
    }

    const targetId = message.payload!.participantId;
    const targetSocket = wsState.getSocket(meetingId, targetId);

    if (targetSocket) {
      const rejectedMessage: WSResponse = {
        type: 'lobby.result',
        payload: {
          admitted: false,
        },
      };
      targetSocket.send(JSON.stringify(rejectedMessage));
    }
  } catch (error) {
    console.error('Error handling lobby.reject:', error);
  }
};
