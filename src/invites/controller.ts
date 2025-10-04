import { Elysia, t } from 'elysia';
import { z } from 'zod';
import { jwt } from '../plugins/jwt';
import { invitesService } from './service';
import { parseBearerToken } from '../common/http';
import { errors } from '../common/errors';
import type { AccessTokenPayload } from '../auth/types';
import { meetingsService } from '../meetings/service';

const createInviteDto = z.object({
  email: z.string().email(),
  role: z.enum(['guest', 'cohost']).default('guest'),
});

export const invitesController = new Elysia({ prefix: '/v1' })
  .use(jwt)
  .post(
    '/meetings/:id/invites',
    async ({ params, body, headers, access }) => {
      const token = parseBearerToken(headers.authorization);
      if (!token) {
        throw errors.auth.unauthorized();
      }

      const payload = (await access.verify(token)) as
        | AccessTokenPayload
        | false;
      if (!payload) {
        throw errors.auth.invalidToken();
      }

      // Check if user is host
      const meeting = await meetingsService.findById(params.id, payload.sub);
      if (meeting.hostId !== payload.sub) {
        throw errors.meeting.forbidden();
      }

      const invite = await invitesService.create(
        params.id,
        body.email,
        body.role
      );
      return invite;
    },
    {
      params: t.Object({ id: t.String() }),
      body: createInviteDto,
      detail: {
        tags: ['Invites'],
        summary: 'Create meeting invite',
        description: 'Send an invitation to a user to join the meeting. Only the meeting host can create invites.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Meeting ID',
            example: 'meeting-id-123'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateInviteRequest' }
            }
          }
        },
        responses: {
          201: {
            description: 'Invite created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/InviteResponse' }
              }
            }
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
                  validation: {
                    value: {
                      type: 'validation/invalid',
                      title: 'Validation Error',
                      detail: 'Invalid email format or role',
                      status: 400
                    }
                  }
                }
              }
            }
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
                  unauthorized: {
                    value: {
                      type: 'auth/unauthorized',
                      title: 'Unauthorized',
                      detail: 'You must be logged in to access this resource',
                      status: 401
                    }
                  },
                  invalidToken: {
                    value: {
                      type: 'auth/invalid-token',
                      title: 'Invalid Token',
                      detail: 'The provided token is invalid',
                      status: 401
                    }
                  }
                }
              }
            }
          },
          403: {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
                  forbidden: {
                    value: {
                      type: 'meeting/forbidden',
                      title: 'Meeting Access Forbidden',
                      detail: 'Only the meeting host can create invites',
                      status: 403
                    }
                  }
                }
              }
            }
          },
          404: {
            description: 'Meeting not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
                  notFound: {
                    value: {
                      type: 'meeting/not-found',
                      title: 'Meeting Not Found',
                      detail: 'The requested meeting does not exist',
                      status: 404
                    }
                  }
                }
              }
            }
          }
        }
      },
    }
  )
  .get(
    '/meetings/:id/invites',
    async ({ params, headers, access }) => {
      const token = parseBearerToken(headers.authorization);
      if (!token) {
        throw errors.auth.unauthorized();
      }

      const payload = (await access.verify(token)) as
        | AccessTokenPayload
        | false;
      if (!payload) {
        throw errors.auth.invalidToken();
      }

      // Check if user is host
      const meeting = await meetingsService.findById(params.id, payload.sub);
      if (meeting.hostId !== payload.sub) {
        throw errors.meeting.forbidden();
      }

      const invites = await invitesService.findByMeeting(params.id);
      return { invites };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ['Invites'],
        summary: 'List meeting invites',
        description: 'Retrieve all pending and processed invitations for a specific meeting. Only the meeting host can access this information.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Meeting ID',
            example: 'meeting-id-123'
          }
        ],
        responses: {
          200: {
            description: 'Invites retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/InviteListResponse' }
              }
            }
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
                  unauthorized: {
                    value: {
                      type: 'auth/unauthorized',
                      title: 'Unauthorized',
                      detail: 'You must be logged in to access this resource',
                      status: 401
                    }
                  },
                  invalidToken: {
                    value: {
                      type: 'auth/invalid-token',
                      title: 'Invalid Token',
                      detail: 'The provided token is invalid',
                      status: 401
                    }
                  }
                }
              }
            }
          },
          403: {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
                  forbidden: {
                    value: {
                      type: 'meeting/forbidden',
                      title: 'Meeting Access Forbidden',
                      detail: 'Only the meeting host can view invites',
                      status: 403
                    }
                  }
                }
              }
            }
          },
          404: {
            description: 'Meeting not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
                  notFound: {
                    value: {
                      type: 'meeting/not-found',
                      title: 'Meeting Not Found',
                      detail: 'The requested meeting does not exist',
                      status: 404
                    }
                  }
                }
              }
            }
          }
        }
      },
    }
  )
  .post(
    '/invites/:inviteId/accept',
    async ({ params, headers, access }) => {
      const token = parseBearerToken(headers.authorization);
      if (!token) {
        throw errors.auth.unauthorized();
      }

      const payload = (await access.verify(token)) as
        | AccessTokenPayload
        | false;
      if (!payload) {
        throw errors.auth.invalidToken();
      }

      const participant = await invitesService.accept(
        params.inviteId,
        payload.sub
      );
      return { participant };
    },
    {
      params: t.Object({ inviteId: t.String() }),
      detail: {
        tags: ['Invites'],
        summary: 'Accept invite',
        description: 'Accept a pending meeting invitation. The authenticated user must be the intended recipient of the invitation.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'inviteId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Invite ID',
            example: 'invite-id-123'
          }
        ],
        responses: {
          200: {
            description: 'Invite accepted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    participant: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', example: 'participant-id' },
                        meetingId: { type: 'string', example: 'meeting-id' },
                        userId: { type: 'string', example: 'user-id' },
                        role: { type: 'string', enum: ['host', 'cohost', 'guest'] },
                        joinedAt: { type: 'string', format: 'date-time' }
                      }
                    }
                  }
                }
              }
            }
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
                  unauthorized: {
                    value: {
                      type: 'auth/unauthorized',
                      title: 'Unauthorized',
                      detail: 'You must be logged in to access this resource',
                      status: 401
                    }
                  },
                  invalidToken: {
                    value: {
                      type: 'auth/invalid-token',
                      title: 'Invalid Token',
                      detail: 'The provided token is invalid',
                      status: 401
                    }
                  }
                }
              }
            }
          },
          404: {
            description: 'Invite not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
                  notFound: {
                    value: {
                      type: 'invite/not-found',
                      title: 'Invite Not Found',
                      detail: 'The requested invite does not exist',
                      status: 404
                    }
                  }
                }
              }
            }
          },
          409: {
            description: 'Invite already processed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
                  alreadyProcessed: {
                    value: {
                      type: 'invite/already-processed',
                      title: 'Invite Already Processed',
                      detail: 'This invite has already been accepted or declined',
                      status: 409
                    }
                  }
                }
              }
            }
          }
        }
      },
    }
  )
  .post(
    '/invites/:inviteId/decline',
    async ({ params, headers, access }) => {
      const token = parseBearerToken(headers.authorization);
      if (!token) {
        throw errors.auth.unauthorized();
      }

      const payload = (await access.verify(token)) as
        | AccessTokenPayload
        | false;
      if (!payload) {
        throw errors.auth.invalidToken();
      }

      await invitesService.decline(params.inviteId);
      return { success: true };
    },
    {
      params: t.Object({ inviteId: t.String() }),
      detail: {
        tags: ['Invites'],
        summary: 'Decline invite',
        description: 'Decline a pending meeting invitation. The authenticated user must be the intended recipient of the invitation.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'inviteId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Invite ID',
            example: 'invite-id-123'
          }
        ],
        responses: {
          200: {
            description: 'Invite declined successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' }
              }
            }
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
                  unauthorized: {
                    value: {
                      type: 'auth/unauthorized',
                      title: 'Unauthorized',
                      detail: 'You must be logged in to access this resource',
                      status: 401
                    }
                  },
                  invalidToken: {
                    value: {
                      type: 'auth/invalid-token',
                      title: 'Invalid Token',
                      detail: 'The provided token is invalid',
                      status: 401
                    }
                  }
                }
              }
            }
          },
          404: {
            description: 'Invite not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
                  notFound: {
                    value: {
                      type: 'invite/not-found',
                      title: 'Invite Not Found',
                      detail: 'The requested invite does not exist',
                      status: 404
                    }
                  }
                }
              }
            }
          },
          409: {
            description: 'Invite already processed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
                  alreadyProcessed: {
                    value: {
                      type: 'invite/already-processed',
                      title: 'Invite Already Processed',
                      detail: 'This invite has already been accepted or declined',
                      status: 409
                    }
                  }
                }
              }
            }
          }
        }
      },
    }
  );
