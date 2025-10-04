# Hub API

Production-ready backend for a Google Meet-like application built with **Bun**, **ElysiaJS**, **Drizzle ORM (Postgres)**, **Redis**, and **WebSocket** for real-time features.

## Features

- 🔐 **JWT Authentication** - Access + refresh tokens with secure password hashing (argon2)
- 🎯 **Meeting Management** - Create meetings with unique codes, invite participants
- 🔴 **WebRTC Signaling** - Real-time peer-to-peer connection setup
- 💬 **Real-time Chat** - In-meeting chat with Redis pub/sub for multi-node scaling
- 🎥 **Media Control** - Mute/unmute audio/video, screen sharing
- 👋 **Presence Features** - Hand raise, reactions, participant status
- 🛡️ **Moderation** - Host controls for muting and removing participants
- 🚪 **Lobby System** - Control who can join your meetings
- 📚 **OpenAPI/Swagger** - Auto-generated API documentation
- ⚡ **High Performance** - Built on Bun runtime for maximum speed

## Tech Stack

- **Runtime**: Bun
- **Framework**: ElysiaJS
- **Database**: PostgreSQL with Drizzle ORM
- **Cache/PubSub**: Redis (ioredis)
- **Auth**: JWT (@elysiajs/jwt)
- **WebSocket**: @elysiajs/ws
- **Password Hashing**: argon2
- **Validation**: Zod
- **API Docs**: @elysiajs/swagger

## Prerequisites

- [Bun](https://bun.sh) >= 1.0
- PostgreSQL >= 14
- Redis >= 6

## Quick Start

### 1. Clone and Install

```bash
bun install
```

### 2. Start Database Services

Using Docker Compose (recommended):

```bash
docker-compose up -d
```

Or manually start PostgreSQL and Redis on their default ports.

### 3. Configure Environment

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

### 4. Run Migrations

```bash
bun run generate
bun run migrate
```

### 5. Seed Database (Optional)

```bash
bun run seed
```

This creates:

- Demo user: `demo@hub.com` / `password123`
- A sample meeting with a unique code
- A pending guest invite

### 6. Start Development Server

```bash
bun run dev
```

The server will start on `http://localhost:4000`

## API Documentation

Once the server is running, visit:

- **Swagger UI**: http://localhost:4000/docs
- **OpenAPI JSON**: http://localhost:4000/swagger/json

## API Endpoints

### Authentication

- `POST /v1/auth/register` - Register new user
- `POST /v1/auth/login` - Login with email/password
- `POST /v1/auth/oauth/google` - OAuth login (stub)
- `POST /v1/auth/refresh` - Refresh access token
- `POST /v1/auth/logout` - Logout and invalidate refresh token
- `GET /v1/auth/me` - Get current user

### Meetings

- `POST /v1/meetings` - Create a new meeting
- `GET /v1/meetings` - List user's meetings
- `GET /v1/meetings/:id` - Get meeting details
- `POST /v1/meetings/resolve-code` - Get meeting ID from code
- `POST /v1/meetings/:id/room-token` - Get short-lived token for joining

### Invites

- `POST /v1/meetings/:id/invites` - Create invite (host only)
- `GET /v1/meetings/:id/invites` - List invites (host only)
- `POST /v1/invites/:inviteId/accept` - Accept invite
- `POST /v1/invites/:inviteId/decline` - Decline invite

### Users

- `PATCH /v1/me` - Update user profile

## WebSocket API

Connect to `ws://localhost:4000/ws`

### Connection Flow

1. **Authenticate**

```json
{
  "type": "auth.authenticate",
  "requestId": "req-1",
  "payload": { "accessToken": "..." }
}
```

Response:

```json
{
  "type": "auth.ok",
  "requestId": "req-1",
  "payload": { "userId": "..." }
}
```

2. **Join Room**

```json
{
  "type": "room.join",
  "requestId": "req-2",
  "payload": {
    "roomToken": "...",
    "device": { "mic": true, "cam": false }
  }
}
```

Response:

```json
{
  "type": "room.joined",
  "requestId": "req-2",
  "payload": {
    "meeting": {...},
    "selfParticipant": {...},
    "peers": [...]
  }
}
```

### WebSocket Events

#### Room Events

- `room.join` - Join a meeting room
- `room.leave` - Leave the room
- `room.kicked` - You were removed by a moderator
- `participant.joined` - Someone joined
- `participant.left` - Someone left

#### WebRTC Signaling

- `rtc.signal` - Send WebRTC signal (offer/answer/ICE candidate)

#### Media Control

- `media.update` - Update your media state (mic/cam/screen)
- `media.changed` - Broadcast when media state changes

#### Chat & Reactions

- `chat.send` - Send a chat message
- `chat.message` - Receive a chat message
- `reaction.send` - Send a reaction
- `reaction.added` - Broadcast when reaction is added

#### Presence

- `hand.raise` - Raise your hand
- `hand.lower` - Lower your hand
- `hand.changed` - Broadcast when hand state changes

#### Moderation (Host/Cohost only)

- `moderation.mute` - Mute a participant
- `moderation.remove` - Remove a participant

#### Lobby (Host only)

- `lobby.admit` - Admit a waiting participant
- `lobby.reject` - Reject a waiting participant
- `lobby.result` - Notify participant of admission result

## Project Structure

```
/src
  /app.ts                 # Main application bootstrap
  /env.ts                 # Environment validation
  /plugins/               # Elysia plugins
    cors.ts
    jwt.ts
    swagger.ts
    error.ts
  /db/                    # Database layer
    schema.ts             # Drizzle schema
    client.ts             # DB client
    migrate.ts            # Migration runner
    seed.ts               # Seed script
  /auth/                  # Authentication module
    controller.ts
    service.ts
    dto.ts
    types.ts
  /meetings/              # Meetings module
    controller.ts
    service.ts
    dto.ts
    code.ts               # Meeting code generator
  /participants/          # Participants service
    service.ts
  /invites/               # Invites module
    controller.ts
    service.ts
  /users/                 # Users module
    controller.ts
  /ws/                    # WebSocket gateway
    gateway.ts
    redis.ts
    state.ts
    types.ts
    /handlers/
      room.ts
      rtc.ts
      chat.ts
      media.ts
      presence.ts
      moderation.ts
      lobby.ts
  /common/                # Shared utilities
    errors.ts
    http.ts
    pagination.ts
    types.ts
```

## Scripts

- `bun run dev` - Start development server with watch mode
- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run generate` - Generate Drizzle migrations
- `bun run migrate` - Run migrations
- `bun run seed` - Seed database with demo data
- `bun run db:studio` - Open Drizzle Studio
- `bun test` - Run tests

## Environment Variables

| Variable             | Description                  | Default             |
| -------------------- | ---------------------------- | ------------------- |
| `PORT`               | Server port                  | `4000`              |
| `NODE_ENV`           | Environment                  | `development`       |
| `DATABASE_URL`       | PostgreSQL connection URL    | Required            |
| `REDIS_URL`          | Redis connection URL         | Required            |
| `JWT_ACCESS_SECRET`  | Secret for access tokens     | Required            |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens    | Required            |
| `ROOM_TOKEN_SECRET`  | Secret for room tokens       | Required            |
| `ACCESS_TTL_SEC`     | Access token TTL in seconds  | `900` (15 min)      |
| `REFRESH_TTL_SEC`    | Refresh token TTL in seconds | `2592000` (30 days) |
| `ROOM_TOKEN_TTL_SEC` | Room token TTL in seconds    | `120` (2 min)       |
| `CORS_ORIGIN`        | Allowed CORS origin          | Required            |

## Authentication Flow

1. **Register/Login** → Receive access token (15min) + refresh token (30d)
2. **Access protected routes** → Include `Authorization: Bearer <access_token>`
3. **Token expires** → Use refresh token to get new access token
4. **Join meeting** → Request room token with meeting access
5. **WebSocket connection** → Authenticate with access token, then join room with room token

## Meeting Code Format

Meeting codes are human-friendly, lowercase strings in the format: `abc-defg-hij`

- 3 lowercase letters
- 4 lowercase letters
- 3 lowercase letters
- Separated by hyphens

## Redis Pub/Sub

The WebSocket gateway uses Redis pub/sub for multi-node scaling. Each meeting has a channel: `meeting:{meetingId}`.

When a WebSocket event occurs (chat, media change, etc.), it's:

1. Broadcast to all local connections in that room
2. Published to Redis channel
3. Other server nodes receive and broadcast to their local connections

This allows horizontal scaling while maintaining real-time sync.

## Error Handling

All errors follow the [Problem Details](https://datatracker.ietf.org/doc/html/rfc7807) format:

```json
{
  "type": "auth/invalid-credentials",
  "title": "Invalid Credentials",
  "detail": "Email or password is incorrect",
  "status": 401
}
```

## Security Best Practices

- ✅ Passwords hashed with argon2
- ✅ JWT tokens with expiration
- ✅ Refresh token rotation
- ✅ Room tokens for time-limited meeting access
- ✅ Role-based permissions (host, cohost, guest)
- ✅ CORS configuration
- ⚠️ OAuth stub - implement real Google OAuth in production
- ⚠️ Add rate limiting for auth and chat endpoints in production
- ⚠️ Use HTTPS/WSS in production

## Testing

```bash
bun test
```

Tests cover:

- Authentication service (password hashing, token generation)
- Meeting code generation and validation
- E2E tests for auth and meeting endpoints

## Deployment

1. Set environment variables for production
2. Update secrets (JWT secrets should be cryptographically random)
3. Set `NODE_ENV=production`
4. Run migrations: `bun run migrate`
5. Build: `bun run build`
6. Start: `bun run start`

For production deployment, consider:

- Load balancer with sticky sessions or Redis-based session store
- PostgreSQL with replication
- Redis Cluster or Sentinel for HA
- TLS/SSL certificates (use reverse proxy like nginx)
- Process manager (PM2, systemd)
- Monitoring and logging (Prometheus, Grafana, etc.)

## License

MIT

## Contributing

Pull requests welcome! Please ensure:

- Code follows existing style
- Tests pass
- New features include tests
- API changes are documented

---

Built with ❤️ using Bun and ElysiaJS
