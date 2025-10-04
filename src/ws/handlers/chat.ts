import type { SocketWithContext, ChatSendMessage } from '../types';
import type { WSResponse } from '../../common/types';
import { wsState } from '../state';
import { publishToMeeting } from '../redis';
import { ulid } from 'ulid';

export const handleChatSend = async (
  socket: SocketWithContext,
  message: ChatSendMessage
) => {
  try {
    const { meetingId, participantId, displayName } = socket.data;

    if (!meetingId || !participantId) {
      const response: WSResponse = {
        type: 'error',
        requestId: message.requestId,
        error: 'Not in a room',
      };
      socket.send(JSON.stringify(response));
      return;
    }

    const { text } = message.payload!;

    const chatMessage = {
      type: 'chat.message',
      payload: {
        id: ulid(),
        participantId,
        sender: displayName,
        text,
        ts: new Date().toISOString(),
      },
    };

    wsState.broadcastToRoom(meetingId, chatMessage);
    await publishToMeeting(meetingId, chatMessage);
  } catch (error) {
    console.error('Error handling chat.send:', error);
  }
};
