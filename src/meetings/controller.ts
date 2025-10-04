import { Elysia, t } from 'elysia';
import { jwt } from '../plugins/jwt';
import { meetingsService } from './service';
import {
  createMeetingDto,
  resolveCodeDto,
  roomTokenDto,
  getMeetingsQueryDto,
} from './dto';
import { parseBearerToken } from '../common/http';
import { errors } from '../common/errors';
import type { AccessTokenPayload } from '../auth/types';
import type { RoomTokenPayload } from '../common/types';
import { env } from '../env';

export const meetingsController = new Elysia({ prefix: '/v1/meetings' })
  .use(jwt)
  .post(
    '/',
    async ({ body, headers, access }) => {
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

      const meeting = await meetingsService.create(payload.sub, body);
      return meeting;
    },
    {
      body: createMeetingDto,
      detail: {
        tags: ['Meetings'],
        summary: 'Create a new meeting',
        description: 'Create a new meeting with a unique code and set the creator as host. Returns the created meeting details.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateMeetingRequest' }
            }
          }
        },
        responses: {
          201: {
            description: 'Meeting created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MeetingResponse' }
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
                      detail: 'Invalid meeting data',
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
          409: {
            description: 'Meeting code already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
                  codeExists: {
                    value: {
                      type: 'meeting/code-exists',
                      title: 'Meeting Code Exists',
                      detail: 'This meeting code is already in use',
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
  .get(
    '/',
    async ({ query, headers, access }) => {
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

      const meetings = await meetingsService.findUserMeetings(
        payload.sub,
        query.upcoming,
        query.limit
      );

      return { meetings };
    },
    {
      query: getMeetingsQueryDto,
      detail: {
        tags: ['Meetings'],
        summary: 'List user meetings',
        description: 'Get meetings where the authenticated user is host or participant. Supports filtering for upcoming meetings and pagination.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'upcoming',
            in: 'query',
            schema: { type: 'boolean' },
            description: 'Filter to show only upcoming meetings (default: false)',
            example: true
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100 },
            description: 'Maximum number of meetings to return (default: 10)',
            example: 20
          }
        ],
        responses: {
          200: {
            description: 'Meetings retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MeetingListResponse' }
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
          }
        }
      },
    }
  )
  .get(
    '/:id',
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

      const meeting = await meetingsService.findById(params.id, payload.sub);
      return { meeting };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['Meetings'],
        summary: 'Get meeting details',
        description: 'Get detailed information about a specific meeting. User must be a participant or host of the meeting.',
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
            description: 'Meeting details retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    meeting: { $ref: '#/components/schemas/MeetingResponse' }
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
                      detail: 'You do not have access to this meeting',
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
    '/resolve-code',
    async ({ body }) => {
      const meeting = await meetingsService.findByCode(body.code);
      return { meetingId: meeting.id };
    },
    {
      body: resolveCodeDto,
      detail: {
        tags: ['Meetings'],
        summary: 'Resolve meeting code',
        description: 'Convert a meeting code (e.g., "abc-defg-hij") to the corresponding meeting ID. This endpoint is public and does not require authentication.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ResolveCodeRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Meeting code resolved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    meetingId: { type: 'string', example: 'meeting-id-123' }
                  }
                }
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
                      detail: 'Invalid meeting code format',
                      status: 400
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
    '/:id/room-token',
    async ({ params, body: _body, headers, access, room }) => {
      const token = parseBearerToken(headers.authorization);

      let userId: string | null = null;
      let role: 'host' | 'cohost' | 'guest' = 'guest';

      if (token) {
        const payload = (await access.verify(token)) as
          | AccessTokenPayload
          | false;
        if (payload) {
          userId = payload.sub;
        }
      }

      // Check if meeting exists
      const meeting = await meetingsService.findById(params.id);

      // Check if user can join
      const canJoin = await meetingsService.canUserJoin(
        params.id,
        userId || undefined
      );
      if (!canJoin) {
        throw errors.meeting.forbidden();
      }

      // Determine role
      if (userId && meeting.hostId === userId) {
        role = 'host';
      }

      // Get or create participant
      const participant = await meetingsService.getOrCreateParticipant(
        params.id,
        userId,
        role
      );

      // Generate room token
      const roomTokenPayload: RoomTokenPayload = {
        sub: participant.id,
        meetingId: params.id,
        role: participant.role,
        perms: role === 'host' ? ['moderate', 'invite', 'record'] : [],
        exp: Math.floor(Date.now() / 1000) + env.ROOM_TOKEN_TTL_SEC,
      };

      const roomToken = await room.sign(roomTokenPayload);

      return { roomToken };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: roomTokenDto,
      detail: {
        tags: ['Meetings'],
        summary: 'Get room token',
        description: 'Generate a short-lived JWT token for joining the meeting room via WebSocket. This token is required for WebSocket authentication.',
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
              schema: { $ref: '#/components/schemas/RoomTokenRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Room token generated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RoomTokenResponse' }
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
                      detail: 'Invalid room token request data',
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
                      detail: 'You do not have access to this meeting',
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
  );
