import { Elysia } from 'elysia';
import { jwt } from '../plugins/jwt';
import { authService } from '../auth/service';
import { updateProfileDto } from '../auth/dto';
import { parseBearerToken } from '../common/http';
import { errors } from '../common/errors';
import type { AccessTokenPayload } from '../auth/types';

export const usersController = new Elysia({ prefix: '/v1' }).use(jwt).patch(
  '/me',
  async ({ body, headers, access }) => {
    const token = parseBearerToken(headers.authorization);
    if (!token) {
      throw errors.auth.unauthorized();
    }

    const payload = (await access.verify(token)) as AccessTokenPayload | false;
    if (!payload) {
      throw errors.auth.invalidToken();
    }

    const user = await authService.updateProfile(payload.sub, body);
    return { user };
  },
  {
    body: updateProfileDto,
    detail: {
      tags: ['Users'],
      summary: 'Update profile',
      description: 'Update the profile information of the currently authenticated user. Only displayName and avatarUrl can be updated.',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UpdateProfileRequest' }
          }
        }
      },
      responses: {
        200: {
          description: 'Profile updated successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  user: { $ref: '#/components/schemas/UserResponse' }
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
                    detail: 'Invalid profile data',
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
        }
      }
    },
  }
);
