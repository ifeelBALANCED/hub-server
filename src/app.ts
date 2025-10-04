import { Elysia } from 'elysia';
import { env } from './env';
import { cors } from './plugins/cors';
import { swaggerPlugin } from './plugins/swagger';
import { errorHandler } from './plugins/error';
import { authController } from './auth/controller';
import { meetingsController } from './meetings/controller';
import { invitesController } from './invites/controller';
import { usersController } from './users/controller';
import { wsGateway } from './ws/gateway';

let app: ReturnType<typeof createApp>;

function createApp() {
  return new Elysia()
    .use(cors)
    .use(errorHandler)
    .use(swaggerPlugin)
    .get('/swagger/json', () => {
      return {
        openapi: '3.0.0',
        info: {
          title: 'Hub API Documentation',
          version: '1.0.0',
          description:
            'Production-ready backend for a Google Meet-like video conferencing application',
        },
        servers: [
          {
            url: `http://localhost:${env.PORT}`,
            description: 'Development server',
          },
        ],
        paths: {
          // Base endpoint
          '/': {
            get: {
              summary: 'API Status',
              description: 'Check if the API is running',
              responses: {
                200: {
                  description: 'API is running',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          success: { type: 'boolean' },
                          message: { type: 'string' },
                          version: { type: 'string' },
                          timestamp: { type: 'string' },
                          docs: { type: 'string' },
                          swagger: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },

          // Authentication endpoints
          '/v1/auth/register': {
            post: {
              tags: ['Auth'],
              summary: 'Register a new user',
              description: 'Create a new user account with email and password',
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['email', 'password', 'displayName'],
                      properties: {
                        email: { type: 'string', format: 'email' },
                        password: { type: 'string', minLength: 8 },
                        displayName: {
                          type: 'string',
                          minLength: 1,
                          maxLength: 255,
                        },
                      },
                    },
                  },
                },
              },
              responses: {
                201: {
                  description: 'User registered successfully',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          accessToken: { type: 'string' },
                          refreshToken: { type: 'string' },
                          accessTokenExpiresIn: { type: 'integer' },
                          refreshTokenExpiresIn: { type: 'integer' },
                        },
                      },
                    },
                  },
                },
                400: {
                  description: 'Validation error',
                },
                409: {
                  description: 'User already exists',
                },
              },
            },
          },

          '/v1/auth/login': {
            post: {
              tags: ['Auth'],
              summary: 'Login with email and password',
              description:
                'Authenticate user and return access and refresh tokens',
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['email', 'password'],
                      properties: {
                        email: { type: 'string', format: 'email' },
                        password: { type: 'string' },
                      },
                    },
                  },
                },
              },
              responses: {
                200: {
                  description: 'Login successful',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          accessToken: { type: 'string' },
                          refreshToken: { type: 'string' },
                          accessTokenExpiresIn: { type: 'integer' },
                          refreshTokenExpiresIn: { type: 'integer' },
                        },
                      },
                    },
                  },
                },
                401: {
                  description: 'Invalid credentials',
                },
              },
            },
          },

          '/v1/auth/oauth/google': {
            post: {
              tags: ['Auth'],
              summary: 'OAuth login with Google',
              description: 'Authenticate user using Google OAuth ID token',
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['idToken'],
                      properties: {
                        idToken: { type: 'string' },
                      },
                    },
                  },
                },
              },
              responses: {
                200: {
                  description: 'OAuth login successful',
                },
                401: {
                  description: 'Invalid Google token',
                },
              },
            },
          },

          '/v1/auth/refresh': {
            post: {
              tags: ['Auth'],
              summary: 'Refresh access token',
              description: 'Get a new access token using refresh token',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        refreshToken: { type: 'string' },
                      },
                    },
                  },
                },
              },
              responses: {
                200: {
                  description: 'Token refreshed successfully',
                },
                401: {
                  description: 'Invalid or expired refresh token',
                },
              },
            },
          },

          '/v1/auth/logout': {
            post: {
              tags: ['Auth'],
              summary: 'Logout user',
              description: 'Invalidate the current refresh token',
              security: [{ bearerAuth: [] }],
              responses: {
                200: {
                  description: 'Logout successful',
                },
                401: {
                  description: 'Unauthorized',
                },
              },
            },
          },

          '/v1/auth/me': {
            get: {
              tags: ['Auth'],
              summary: 'Get current user',
              description:
                'Get the profile information of the currently authenticated user',
              security: [{ bearerAuth: [] }],
              responses: {
                200: {
                  description: 'User profile retrieved successfully',
                },
                401: {
                  description: 'Unauthorized',
                },
              },
            },
          },

          // Meeting endpoints
          '/v1/meetings/': {
            post: {
              tags: ['Meetings'],
              summary: 'Create a new meeting',
              description:
                'Create a new meeting with a unique code and set the creator as host',
              security: [{ bearerAuth: [] }],
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        title: { type: 'string', maxLength: 255 },
                        scheduledAt: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
              responses: {
                201: {
                  description: 'Meeting created successfully',
                },
                401: {
                  description: 'Unauthorized',
                },
              },
            },
            get: {
              tags: ['Meetings'],
              summary: 'List user meetings',
              description:
                'Get meetings where the authenticated user is host or participant',
              security: [{ bearerAuth: [] }],
              parameters: [
                {
                  name: 'upcoming',
                  in: 'query',
                  schema: { type: 'boolean' },
                  description: 'Filter to show only upcoming meetings',
                },
                {
                  name: 'limit',
                  in: 'query',
                  schema: { type: 'integer', minimum: 1, maximum: 100 },
                  description: 'Maximum number of meetings to return',
                },
              ],
              responses: {
                200: {
                  description: 'Meetings retrieved successfully',
                },
                401: {
                  description: 'Unauthorized',
                },
              },
            },
          },

          '/v1/meetings/{id}': {
            get: {
              tags: ['Meetings'],
              summary: 'Get meeting details',
              description: 'Get detailed information about a specific meeting',
              security: [{ bearerAuth: [] }],
              parameters: [
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                  description: 'Meeting ID',
                },
              ],
              responses: {
                200: {
                  description: 'Meeting details retrieved successfully',
                },
                401: {
                  description: 'Unauthorized',
                },
                403: {
                  description: 'Forbidden',
                },
                404: {
                  description: 'Meeting not found',
                },
              },
            },
          },

          '/v1/meetings/resolve-code': {
            post: {
              tags: ['Meetings'],
              summary: 'Resolve meeting code',
              description:
                'Convert a meeting code to the corresponding meeting ID',
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['code'],
                      properties: {
                        code: {
                          type: 'string',
                          pattern: '^[a-z]{3}-[a-z]{4}-[a-z]{3}$',
                        },
                      },
                    },
                  },
                },
              },
              responses: {
                200: {
                  description: 'Meeting code resolved successfully',
                },
                404: {
                  description: 'Meeting not found',
                },
              },
            },
          },

          '/v1/meetings/{id}/room-token': {
            post: {
              tags: ['Meetings'],
              summary: 'Get room token',
              description:
                'Generate a short-lived JWT token for joining the meeting room',
              parameters: [
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                  description: 'Meeting ID',
                },
              ],
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        allowGuest: { type: 'boolean', default: false },
                        displayName: { type: 'string' },
                      },
                    },
                  },
                },
              },
              responses: {
                200: {
                  description: 'Room token generated successfully',
                },
                401: {
                  description: 'Unauthorized',
                },
                403: {
                  description: 'Forbidden',
                },
                404: {
                  description: 'Meeting not found',
                },
              },
            },
          },

          // Invite endpoints
          '/v1/meetings/{id}/invites': {
            post: {
              tags: ['Invites'],
              summary: 'Create meeting invite',
              description: 'Send an invitation to a user to join the meeting',
              security: [{ bearerAuth: [] }],
              parameters: [
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                  description: 'Meeting ID',
                },
              ],
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['email', 'role'],
                      properties: {
                        email: { type: 'string', format: 'email' },
                        role: {
                          type: 'string',
                          enum: ['guest', 'cohost'],
                          default: 'guest',
                        },
                      },
                    },
                  },
                },
              },
              responses: {
                201: {
                  description: 'Invite created successfully',
                },
                401: {
                  description: 'Unauthorized',
                },
                403: {
                  description: 'Forbidden',
                },
                404: {
                  description: 'Meeting not found',
                },
              },
            },
            get: {
              tags: ['Invites'],
              summary: 'List meeting invites',
              description:
                'Retrieve all pending and processed invitations for a specific meeting',
              security: [{ bearerAuth: [] }],
              parameters: [
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                  description: 'Meeting ID',
                },
              ],
              responses: {
                200: {
                  description: 'Invites retrieved successfully',
                },
                401: {
                  description: 'Unauthorized',
                },
                403: {
                  description: 'Forbidden',
                },
                404: {
                  description: 'Meeting not found',
                },
              },
            },
          },

          '/v1/invites/{inviteId}/accept': {
            post: {
              tags: ['Invites'],
              summary: 'Accept invite',
              description: 'Accept a pending meeting invitation',
              security: [{ bearerAuth: [] }],
              parameters: [
                {
                  name: 'inviteId',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                  description: 'Invite ID',
                },
              ],
              responses: {
                200: {
                  description: 'Invite accepted successfully',
                },
                401: {
                  description: 'Unauthorized',
                },
                404: {
                  description: 'Invite not found',
                },
                409: {
                  description: 'Invite already processed',
                },
              },
            },
          },

          '/v1/invites/{inviteId}/decline': {
            post: {
              tags: ['Invites'],
              summary: 'Decline invite',
              description: 'Decline a pending meeting invitation',
              security: [{ bearerAuth: [] }],
              parameters: [
                {
                  name: 'inviteId',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                  description: 'Invite ID',
                },
              ],
              responses: {
                200: {
                  description: 'Invite declined successfully',
                },
                401: {
                  description: 'Unauthorized',
                },
                404: {
                  description: 'Invite not found',
                },
                409: {
                  description: 'Invite already processed',
                },
              },
            },
          },

          // User endpoints
          '/v1/me': {
            patch: {
              tags: ['Users'],
              summary: 'Update profile',
              description:
                'Update the profile information of the currently authenticated user',
              security: [{ bearerAuth: [] }],
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        displayName: {
                          type: 'string',
                          minLength: 1,
                          maxLength: 255,
                        },
                        avatarUrl: { type: 'string', format: 'uri' },
                      },
                    },
                  },
                },
              },
              responses: {
                200: {
                  description: 'Profile updated successfully',
                },
                401: {
                  description: 'Unauthorized',
                },
              },
            },
          },
        },
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
              description: 'JWT Authorization header using the Bearer scheme',
            },
          },
          schemas: {
            Error: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                title: { type: 'string' },
                detail: { type: 'string' },
                status: { type: 'integer' },
              },
            },
            UserResponse: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                displayName: { type: 'string' },
                avatarUrl: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
            },
            MeetingResponse: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                code: { type: 'string' },
                title: { type: 'string' },
                hostId: { type: 'string' },
                scheduledAt: { type: 'string', format: 'date-time' },
                createdAt: { type: 'string', format: 'date-time' },
                isActive: { type: 'boolean' },
              },
            },
            TokensResponse: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                accessTokenExpiresIn: { type: 'integer' },
                refreshTokenExpiresIn: { type: 'integer' },
              },
            },
          },
        },
        tags: [
          {
            name: 'Auth',
            description: 'Authentication and user management endpoints',
          },
          {
            name: 'Meetings',
            description:
              'Meeting creation, management, and participation endpoints',
          },
          {
            name: 'Invites',
            description: 'Meeting invitation management endpoints',
          },
          {
            name: 'Users',
            description: 'User profile and settings management endpoints',
          },
        ],
      };
    })
    .get('/', () => ({
      success: true,
      message: 'Hub API is running!',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      docs: '/docs',
      swagger: '/swagger/json',
    }))
    .use(authController)
    .use(meetingsController)
    .use(invitesController)
    .use(usersController)
    .use(wsGateway);
}

try {
  console.log('🔧 Initializing Hub API Server...');

  app = createApp().listen(
    {
      port: env.PORT,
      hostname: '0.0.0.0',
      reusePort: true,
    },
    server => {
      if (!server) {
        console.error(`❌ Failed to start server on port ${env.PORT}`);
        console.error(`💡 Try one of these solutions:`);
        console.error(`   • Close other applications using port ${env.PORT}`);
        console.error(`   • Run: lsof -ti:${env.PORT} | xargs kill -9`);
        console.error(`   • Change PORT in your .env file`);
        process.exit(1);
      }
    }
  );
} catch (error) {
  console.error('❌ Failed to initialize server:', error);
  console.error('\n🔍 Common issues and solutions:');
  console.error(
    '   • Check if PostgreSQL and Redis are running (run: docker compose up -d)'
  );
  console.error('   • Verify .env file has correct DATABASE_URL and REDIS_URL');
  console.error('   • Check if all required environment variables are set');
  console.error('   • Ensure Node.js version compatibility');
  process.exit(1);
}

console.log(`
╔════════════════════════════════════════╗
║   🚀 Hub API Server is running!        ║
╚════════════════════════════════════════╝

📍 Server URL:    http://localhost:${env.PORT}
📚 Documentation: http://localhost:${env.PORT}/docs
📄 OpenAPI JSON:  http://localhost:${env.PORT}/swagger/json
🔌 WebSocket:     ws://localhost:${env.PORT}/ws
🌍 Environment:   ${env.NODE_ENV}

Ready to accept connections!
`);

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  try {
    app.stop();
    console.log('✅ Server closed successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during server shutdown:', err);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
