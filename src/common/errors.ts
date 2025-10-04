export class AppError extends Error {
  constructor(
    public type: string,
    public title: string,
    public detail: string,
    public status: number
  ) {
    super(detail);
    this.name = 'AppError';
  }

  toJSON() {
    return {
      type: this.type,
      title: this.title,
      detail: this.detail,
      status: this.status,
    };
  }
}

export const errors = {
  auth: {
    invalidCredentials: () =>
      new AppError(
        'auth/invalid-credentials',
        'Invalid Credentials',
        'Email or password is incorrect',
        401
      ),
    tokenExpired: () =>
      new AppError(
        'auth/token-expired',
        'Token Expired',
        'The provided token has expired',
        401
      ),
    unauthorized: () =>
      new AppError(
        'auth/unauthorized',
        'Unauthorized',
        'You must be logged in to access this resource',
        401
      ),
    forbidden: () =>
      new AppError(
        'auth/forbidden',
        'Forbidden',
        'You do not have permission to access this resource',
        403
      ),
    userExists: () =>
      new AppError(
        'auth/user-exists',
        'User Already Exists',
        'A user with this email already exists',
        409
      ),
    invalidToken: () =>
      new AppError(
        'auth/invalid-token',
        'Invalid Token',
        'The provided token is invalid',
        401
      ),
  },
  meeting: {
    notFound: () =>
      new AppError(
        'meeting/not-found',
        'Meeting Not Found',
        'The requested meeting does not exist',
        404
      ),
    forbidden: () =>
      new AppError(
        'meeting/forbidden',
        'Meeting Access Forbidden',
        'You do not have access to this meeting',
        403
      ),
    codeExists: () =>
      new AppError(
        'meeting/code-exists',
        'Meeting Code Exists',
        'This meeting code is already in use',
        409
      ),
  },
  room: {
    invalidToken: () =>
      new AppError(
        'room/invalid-token',
        'Invalid Room Token',
        'The provided room token is invalid or expired',
        401
      ),
    alreadyEnded: () =>
      new AppError(
        'room/already-ended',
        'Meeting Ended',
        'This meeting has already ended',
        410
      ),
  },
  lobby: {
    rejected: () =>
      new AppError(
        'lobby/rejected',
        'Access Rejected',
        'The host has rejected your request to join',
        403
      ),
  },
  invite: {
    notFound: () =>
      new AppError(
        'invite/not-found',
        'Invite Not Found',
        'The requested invite does not exist',
        404
      ),
    alreadyProcessed: () =>
      new AppError(
        'invite/already-processed',
        'Invite Already Processed',
        'This invite has already been accepted or declined',
        409
      ),
  },
  validation: {
    invalid: (detail: string) =>
      new AppError('validation/invalid', 'Validation Error', detail, 400),
  },
};
