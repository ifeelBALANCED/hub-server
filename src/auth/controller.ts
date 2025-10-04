import { Elysia } from 'elysia';
import { jwt } from '../plugins/jwt';
import { authService } from './service';
import {
  registerDto,
  loginDto,
  oauthGoogleDto,
  refreshDto,
} from './dto';
import { parseBearerToken } from '../common/http';
import { errors } from '../common/errors';
import type { AccessTokenPayload, RefreshTokenPayload } from './types';

export const authController = new Elysia({ prefix: '/v1/auth' })
  .use(jwt)
  .post(
    '/register',
    async ({ body, access, refresh }) => {
      const result = await authService.register(
        body,
        payload => access.sign(payload),
        payload => refresh.sign(payload)
      );

      return result;
    },
    {
      body: registerDto,
      detail: {
        tags: ['Auth'],
        summary: 'Register a new user',
        description: 'Create a new user account with email and password. Returns access and refresh tokens upon successful registration.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' }
            }
          }
        },
        responses: {
          201: {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TokensResponse' }
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
                      detail: 'Invalid email format',
                      status: 400
                    }
                  }
                }
              }
            }
          },
          409: {
            description: 'User already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
                  userExists: {
                    value: {
                      type: 'auth/user-exists',
                      title: 'User Already Exists',
                      detail: 'A user with this email already exists',
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
    '/login',
    async ({ body, access, refresh }) => {
      const result = await authService.login(
        body,
        payload => access.sign(payload),
        payload => refresh.sign(payload)
      );

      return result;
    },
    {
      body: loginDto,
      detail: {
        tags: ['Auth'],
        summary: 'Login with email and password',
        description: 'Authenticate user with email and password. Returns access and refresh tokens upon successful authentication.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TokensResponse' }
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
                      detail: 'Invalid email format',
                      status: 400
                    }
                  }
                }
              }
            }
          },
          401: {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
                  invalidCredentials: {
                    value: {
                      type: 'auth/invalid-credentials',
                      title: 'Invalid Credentials',
                      detail: 'Email or password is incorrect',
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
  .post(
    '/oauth/google',
    async ({ body, access, refresh }) => {
      const result = await authService.oauthGoogle(
        body.idToken,
        payload => access.sign(payload),
        payload => refresh.sign(payload)
      );

      return result;
    },
    {
      body: oauthGoogleDto,
      detail: {
        tags: ['Auth'],
        summary: 'OAuth login with Google',
        description: 'Authenticate user using Google OAuth ID token. Returns access and refresh tokens upon successful authentication.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OAuthGoogleRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'OAuth login successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TokensResponse' }
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
                      detail: 'Invalid ID token format',
                      status: 400
                    }
                  }
                }
              }
            }
          },
          401: {
            description: 'Invalid Google token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
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
  .post(
    '/refresh',
    async ({ body, cookie, refresh, access }) => {
      const token = body.refreshToken || cookie.refreshToken?.value;
      if (!token || typeof token !== 'string') {
        throw errors.auth.invalidToken();
      }

      const result = await authService.refresh(
        token,
        async (tokenToVerify: string) => refresh.verify(tokenToVerify) as Promise<RefreshTokenPayload | false>,
        async (payload: AccessTokenPayload) => await access.sign(payload)
      );

      return result;
    },
    {
      body: refreshDto,
      detail: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        description: 'Get a new access token using a refresh token. Can be sent in request body or as HTTP-only cookie.',
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshTokenRequest' }
            }
          }
        },
        parameters: [
          {
            name: 'Cookie',
            in: 'header',
            schema: {
              type: 'string'
            },
            description: 'HTTP-only cookie containing refresh token (alternative to body parameter)'
          }
        ],
        responses: {
          200: {
            description: 'Token refreshed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                    accessTokenExpiresIn: { type: 'integer' }
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
                      detail: 'Invalid refresh token format',
                      status: 400
                    }
                  }
                }
              }
            }
          },
          401: {
            description: 'Invalid or expired refresh token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
                  invalidToken: {
                    value: {
                      type: 'auth/invalid-token',
                      title: 'Invalid Token',
                      detail: 'The provided token is invalid',
                      status: 401
                    }
                  },
                  tokenExpired: {
                    value: {
                      type: 'auth/token-expired',
                      title: 'Token Expired',
                      detail: 'The provided token has expired',
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
  .post(
    '/logout',
    async ({ headers, cookie, access }) => {
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

      const refreshToken = cookie.refreshToken?.value;
      if (refreshToken && typeof refreshToken === 'string') {
        await authService.logout(payload.sub, refreshToken);
      }

      return { success: true };
    },
    {
      detail: {
        tags: ['Auth'],
        summary: 'Logout user',
        description: 'Invalidate the current refresh token, effectively logging out the user.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Logout successful',
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
          }
        }
      },
    }
  )
  .get(
    '/me',
    async ({ headers, access }) => {
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

      const user = await authService.getUserById(payload.sub);
      if (!user) {
        throw errors.auth.invalidToken();
      }

      return { user };
    },
    {
      detail: {
        tags: ['Auth'],
        summary: 'Get current user',
        description: 'Get the profile information of the currently authenticated user.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'User profile retrieved successfully',
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
