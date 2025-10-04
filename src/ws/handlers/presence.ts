import type {
  SocketWithContext,
  HandRaiseMessage,
  HandLowerMessage,
  ReactionSendMessage,
} from '../types';
import type { WSResponse } from '../../common/types';
import { wsState } from '../state';
import { publishToMeeting } from '../redis';

export const handleHandRaise = async (
  socket: SocketWithContext,
  message: HandRaiseMessage
) => {
  try {
    const { meetingId, participantId } = socket.data;

    if (!meetingId || !participantId) {
      return;
    }

    socket.data.handRaised = true;

    const handChangedMessage = {
      type: 'hand.changed',
      payload: {
        participantId,
        raised: true,
      },
    };

    wsState.broadcastToRoom(meetingId, handChangedMessage);
    await publishToMeeting(meetingId, handChangedMessage);
  } catch (error) {
    console.error('Error handling hand.raise:', error);
  }
};

export const handleHandLower = async (
  socket: SocketWithContext,
  message: HandLowerMessage
) => {
  try {
    const { meetingId, participantId } = socket.data;

    if (!meetingId || !participantId) {
      return;
    }

    socket.data.handRaised = false;

    const handChangedMessage = {
      type: 'hand.changed',
      payload: {
        participantId,
        raised: false,
      },
    };

    wsState.broadcastToRoom(meetingId, handChangedMessage);
    await publishToMeeting(meetingId, handChangedMessage);
  } catch (error) {
    console.error('Error handling hand.lower:', error);
  }
};

export const handleReactionSend = async (
  socket: SocketWithContext,
  message: ReactionSendMessage
) => {
  try {
    const { meetingId, participantId } = socket.data;

    if (!meetingId || !participantId) {
      return;
    }

    const reactionMessage = {
      type: 'reaction.added',
      payload: {
        participantId,
        type: message.payload!.type,
        ts: new Date().toISOString(),
      },
    };

    wsState.broadcastToRoom(meetingId, reactionMessage);
    await publishToMeeting(meetingId, reactionMessage);
  } catch (error) {
    console.error('Error handling reaction.send:', error);
  }
};
