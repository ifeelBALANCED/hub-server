import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger';

export const swaggerPlugin = new Elysia({ name: 'swagger' }).use(
  swagger({
    documentation: {
      info: {
        title: 'Hub API Documentation',
        version: '1.0.0',
        description: `
# Hub API

Production-ready backend for a Google Meet-like video conferencing application.

## Features

- **User Authentication**: JWT-based authentication with access and refresh tokens
- **Meeting Management**: Create, join, and manage video meetings with unique codes
- **Real-time Communication**: WebSocket-based real-time messaging, media control, and participant management
- **Meeting Invitations**: Invite system for adding participants to meetings
- **User Profiles**: Manage user information and settings

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

\`\`\`
Authorization: Bearer <access_token>
\`\`\`

## WebSocket Connection

Connect to the WebSocket endpoint for real-time communication:

\`\`\`
ws://localhost:4000/ws
\`\`\`

### WebSocket Authentication

1. Connect to WebSocket
2. Send authentication message:
   \`\`\`json
   {
     "type": "auth.authenticate",
     "requestId": "unique-id",
     "payload": {
       "accessToken": "your-jwt-token"
     }
   }
   \`\`\`

3. Receive authentication response:
   \`\`\`json
   {
     "type": "auth.ok",
     "requestId": "unique-id",
     "payload": {
       "userId": "user-id"
     }
   }
   \`\`\`

## Error Handling

The API uses consistent error responses:

\`\`\`json
{
  "type": "error-type",
  "title": "Error Title",
  "detail": "Detailed error description",
  "status": 400
}
\`\`\`

## Rate Limiting

API endpoints may be subject to rate limiting. Exceeding limits will return a 429 status code.
        `,
      },
      tags: [
        {
          name: 'Auth',
          description: 'Authentication and user management endpoints'
        },
        {
          name: 'Meetings',
          description: 'Meeting creation, management, and participation endpoints'
        },
        {
          name: 'Invites',
          description: 'Meeting invitation management endpoints'
        },
        {
          name: 'Users',
          description: 'User profile and settings management endpoints'
        },
        {
          name: 'WebSocket',
          description: 'Real-time communication via WebSocket'
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT Authorization header using the Bearer scheme. Enter your token in the text input below.',
          },
        },
        schemas: {
          // Common response schemas
          SuccessResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true }
            }
          },
          Error: {
            type: 'object',
            properties: {
              type: { type: 'string', example: 'auth/invalid-credentials' },
              title: { type: 'string', example: 'Invalid Credentials' },
              detail: { type: 'string', example: 'Email or password is incorrect' },
              status: { type: 'integer', example: 401 }
            }
          },
          // Auth schemas
          RegisterRequest: {
            type: 'object',
            required: ['email', 'password', 'displayName'],
            properties: {
              email: { type: 'string', format: 'email', example: 'user@example.com' },
              password: { type: 'string', minLength: 8, example: 'password123' },
              displayName: { type: 'string', minLength: 1, maxLength: 255, example: 'John Doe' }
            }
          },
          LoginRequest: {
            type: 'object',
            required: ['email', 'password'],
            properties: {
              email: { type: 'string', format: 'email', example: 'user@example.com' },
              password: { type: 'string', example: 'password123' }
            }
          },
          OAuthGoogleRequest: {
            type: 'object',
            required: ['idToken'],
            properties: {
              idToken: { type: 'string', example: 'google-id-token' }
            }
          },
          RefreshTokenRequest: {
            type: 'object',
            properties: {
              refreshToken: { type: 'string', example: 'refresh-token' }
            }
          },
          TokensResponse: {
            type: 'object',
            properties: {
              accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
              refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
              accessTokenExpiresIn: { type: 'integer', example: 900 },
              refreshTokenExpiresIn: { type: 'integer', example: 604800 }
            }
          },
          UserResponse: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'user-id' },
              email: { type: 'string', example: 'user@example.com' },
              displayName: { type: 'string', example: 'John Doe' },
              avatarUrl: { type: 'string', example: 'https://example.com/avatar.jpg' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' }
            }
          },
          // Meeting schemas
          CreateMeetingRequest: {
            type: 'object',
            properties: {
              title: { type: 'string', maxLength: 255, example: 'Team Standup' },
              scheduledAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:00:00Z' }
            }
          },
          MeetingResponse: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'meeting-id' },
              code: { type: 'string', pattern: '^[a-z]{3}-[a-z]{4}-[a-z]{3}$', example: 'abc-defg-hij' },
              title: { type: 'string', example: 'Team Standup' },
              hostId: { type: 'string', example: 'user-id' },
              scheduledAt: { type: 'string', format: 'date-time' },
              createdAt: { type: 'string', format: 'date-time' },
              isActive: { type: 'boolean', example: true }
            }
          },
          MeetingListResponse: {
            type: 'object',
            properties: {
              meetings: {
                type: 'array',
                items: { $ref: '#/components/schemas/MeetingResponse' }
              }
            }
          },
          ResolveCodeRequest: {
            type: 'object',
            required: ['code'],
            properties: {
              code: { type: 'string', pattern: '^[a-z]{3}-[a-z]{4}-[a-z]{3}$', example: 'abc-defg-hij' }
            }
          },
          RoomTokenRequest: {
            type: 'object',
            properties: {
              allowGuest: { type: 'boolean', default: false },
              displayName: { type: 'string', example: 'Guest User' }
            }
          },
          RoomTokenResponse: {
            type: 'object',
            properties: {
              roomToken: { type: 'string', example: 'room-jwt-token' }
            }
          },
          // Invite schemas
          CreateInviteRequest: {
            type: 'object',
            required: ['email', 'role'],
            properties: {
              email: { type: 'string', format: 'email', example: 'participant@example.com' },
              role: { type: 'string', enum: ['guest', 'cohost'], default: 'guest' }
            }
          },
          InviteResponse: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'invite-id' },
              meetingId: { type: 'string', example: 'meeting-id' },
              email: { type: 'string', example: 'participant@example.com' },
              role: { type: 'string', enum: ['guest', 'cohost'] },
              status: { type: 'string', enum: ['pending', 'accepted', 'declined'] },
              createdAt: { type: 'string', format: 'date-time' },
              expiresAt: { type: 'string', format: 'date-time' }
            }
          },
          InviteListResponse: {
            type: 'object',
            properties: {
              invites: {
                type: 'array',
                items: { $ref: '#/components/schemas/InviteResponse' }
              }
            }
          },
          // User profile schemas
          UpdateProfileRequest: {
            type: 'object',
            properties: {
              displayName: { type: 'string', minLength: 1, maxLength: 255, example: 'John Doe' },
              avatarUrl: { type: 'string', format: 'uri', example: 'https://example.com/avatar.jpg' }
            }
          },
          // WebSocket message schemas
          WSAuthMessage: {
            type: 'object',
            required: ['type', 'payload'],
            properties: {
              type: { type: 'string', enum: ['auth.authenticate'], example: 'auth.authenticate' },
              requestId: { type: 'string', example: 'unique-request-id' },
              payload: {
                type: 'object',
                required: ['accessToken'],
                properties: {
                  accessToken: { type: 'string', example: 'jwt-access-token' }
                }
              }
            }
          },
          WSErrorResponse: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['error', 'auth.error'], example: 'error' },
              requestId: { type: 'string', example: 'unique-request-id' },
              error: { type: 'string', example: 'Invalid access token' }
            }
          },
          WSAuthSuccessResponse: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['auth.ok'], example: 'auth.ok' },
              requestId: { type: 'string', example: 'unique-request-id' },
              payload: {
                type: 'object',
                properties: {
                  userId: { type: 'string', example: 'user-id' }
                }
              }
            }
          }
        }
      },
    },
    path: '/docs',
  })
  .get('/swagger.json', () => {
    // This should return the OpenAPI specification
    return {
      openapi: '3.0.0',
      info: {
        title: 'Hub API Documentation',
        version: '1.0.0',
        description: 'Production-ready backend for a Google Meet-like video conferencing application'
      },
      servers: [
        {
          url: 'http://localhost:4000',
          description: 'Development server'
        }
      ],
      paths: {
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
                        swagger: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      }
    };
  }),
);
