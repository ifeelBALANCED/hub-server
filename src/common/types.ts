export type ParticipantRole = 'host' | 'cohost' | 'guest';
export type InviteStatus = 'pending' | 'accepted' | 'declined';

export type MediaState = {
  mic: 'on' | 'off';
  cam: 'on' | 'off';
  screen: 'on' | 'off';
};

export type DeviceState = {
  mic: boolean;
  cam: boolean;
};

export type WSMessage<T = any> = {
  type: string;
  requestId?: string;
  payload?: T;
};

export type WSResponse<T = any> = {
  type: string;
  requestId?: string;
  payload?: T;
  error?: string;
};

export type RoomTokenPayload = {
  sub: string; // participantId
  meetingId: string;
  role: ParticipantRole;
  perms: string[];
  exp: number;
};
