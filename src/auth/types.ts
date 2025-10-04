export type User = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: Date;
};

export type AuthResponse = {
  user: User;
  accessToken: string;
  refreshToken: string;
};

export type AccessTokenPayload = {
  sub: string; // userId
  email: string;
};

export type RefreshTokenPayload = {
  sub: string; // userId
  tokenId: string;
};
