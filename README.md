# Hub - Google Meet Clone Backend

A fully-featured backend for a Google Meet clone built with Elysia.js, featuring real-time video conferencing, chat, and WebRTC capabilities.

## 🚀 Features

### 🔐 Authentication & User Management

- JWT-based authentication with refresh tokens
- User registration and login
- Profile management with avatars and status
- Secure password hashing with bcrypt

### 📅 Room Management

- Create, join, and manage meeting rooms
- Public and private rooms with password protection
- Room settings and participant limits
- Host controls and permissions

### 🎥 Video/Audio Conferencing

- WebRTC peer-to-peer connections
- Multi-participant video/audio support
- Screen sharing capabilities
- Device management (camera, microphone, speakers)

### 📡 Real-time Communication

- WebSocket-based real-time messaging
- Chat system with emoji reactions
- Participant status updates (mute/unmute, hand raising)
- Live participant management

### 🎛️ Advanced Features

- TURN/STUN server configuration for NAT traversal
- Bandwidth recommendations based on participant count
- WebRTC statistics and monitoring
- Device testing and validation

## 🛠️ Tech Stack

- **Framework**: [Elysia.js](https://elysiajs.com/) - Fast, ergonomic web framework
- **Runtime**: [Bun](https://bun.sh/) - Fast JavaScript runtime
- **Database**: [Prisma ORM](https://www.prisma.io/) - Type-safe database access
- **Database**: SQLite - Lightweight, serverless database
- **Authentication**: JWT with refresh token rotation
- **Real-time**: WebSocket for live communication
- **Validation**: Zod for schema validation
- **Documentation**: Swagger/OpenAPI integration
- **Linting**: Oxlint for fast linting
- **Formatting**: Prettier for code formatting
- **Git Hooks**: Lefthook for pre-commit checks

## 📦 Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd hub-server
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Set up environment variables**

   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**

   ```bash
   # Generate Prisma client
   bun run db:generate

   # Push schema to database (creates tables)
   bun run db:push

   # Seed the database with sample data
   bun run db:seed
   ```

5. **Install git hooks**
   ```bash
   bun run prepare
   ```

## 🚀 Development

### Start development server

```bash
bun run dev
```

### Build for production

```bash
bun run build
bun run start
```

### Code quality

```bash
# Lint code
bun run lint

# Fix linting issues
bun run lint:fix

# Format code
bun run format

# Check formatting
bun run format:check

# Type check
bun run type-check
```

### Database management

```bash
# Generate Prisma client
bun run db:generate

# Push schema changes to database
bun run db:push

# Run database migrations
bun run db:migrate

# Open Prisma Studio (database GUI)
bun run db:studio

# Seed database with sample data
bun run db:seed
```

## 📚 API Documentation

Once the server is running, visit:

- **API Documentation**: http://localhost:3000/swagger
- **Health Check**: http://localhost:3000/

## 🔌 API Endpoints

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout user
- `GET /auth/me` - Get current user profile
- `POST /auth/refresh` - Refresh token

### Users

- `GET /users` - Get all users
- `GET /users/:id` - Get user by ID
- `PUT /users/me` - Update current user
- `GET /users/search/:username` - Search users

### Rooms

- `GET /rooms` - Get public rooms
- `POST /rooms` - Create new room
- `GET /rooms/:id` - Get room details
- `POST /rooms/:id/join` - Join room
- `POST /rooms/:id/leave` - Leave room
- `PUT /rooms/:id` - Update room (host only)
- `DELETE /rooms/:id` - Delete room (host only)
- `GET /rooms/my-rooms` - Get my rooms

### Chat

- `GET /chat/rooms/:roomId/messages` - Get chat messages
- `GET /chat/messages/:messageId/reactions` - Get emoji reactions

### Devices

- `GET /devices/media` - Get media devices
- `GET /devices/audio/input` - Get audio input devices
- `GET /devices/audio/output` - Get audio output devices
- `GET /devices/video/input` - Get video input devices
- `POST /devices/test/:deviceId` - Test device

### WebRTC

- `GET /webrtc/config` - Get TURN/STUN config
- `GET /webrtc/stats/:roomId` - Get WebRTC stats
- `GET /webrtc/codecs` - Get available codecs
- `GET /webrtc/bandwidth/:roomId` - Get bandwidth recommendations

### Participants

- `GET /participants/rooms/:roomId` - Get room participants
- `PUT /participants/rooms/:roomId/me` - Update participant settings
- `GET /participants/rooms/:roomId/users/:userId` - Get participant
- `POST /participants/rooms/:roomId/users/:userId/audio/:action` - Mute/unmute audio
- `POST /participants/rooms/:roomId/users/:userId/video/:action` - Mute/unmute video
- `DELETE /participants/rooms/:roomId/users/:userId` - Remove participant

## 🔌 WebSocket Events

Connect to: `ws://localhost:3000/ws/room/{roomId}`

### Client → Server Events

- `join_room` - Join a room
- `leave_room` - Leave a room
- `chat_message` - Send chat message
- `emoji_reaction` - Send emoji reaction
- `webrtc_offer` - WebRTC offer
- `webrtc_answer` - WebRTC answer
- `webrtc_ice_candidate` - WebRTC ICE candidate
- `mute_audio/unmute_audio` - Audio mute toggle
- `mute_video/unmute_video` - Video mute toggle
- `raise_hand/lower_hand` - Hand raising
- `screen_share_start/screen_share_stop` - Screen sharing

### Server → Client Events

- `user_joined` - User joined notification
- `user_left` - User left notification
- `chat_message` - New chat message
- `emoji_reaction` - New emoji reaction
- `webrtc_offer` - WebRTC offer received
- `webrtc_answer` - WebRTC answer received
- `webrtc_ice_candidate` - WebRTC ICE candidate received
- `participant_update` - Participant status update
- `screen_share_update` - Screen sharing status update

## 🏗️ Project Structure

```
src/
├── index.ts                 # Main application entry point
├── types/                   # TypeScript type definitions
│   └── index.ts
├── utils/                   # Utility functions
│   ├── auth.ts             # Authentication utilities
│   └── database.ts         # In-memory database
├── middleware/              # Custom middleware
│   └── auth.ts             # Authentication middleware
├── routes/                  # API route handlers
│   ├── auth.ts             # Authentication routes
│   ├── users.ts            # User management routes
│   ├── rooms.ts            # Room management routes
│   ├── chat.ts             # Chat routes
│   ├── devices.ts          # Device management routes
│   ├── webrtc.ts           # WebRTC configuration routes
│   └── participants.ts     # Participant management routes
└── websocket/              # WebSocket handlers
    └── room.ts             # Room WebSocket logic
```

## 🔧 Configuration

### Environment Variables

- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

### TURN/STUN Servers

Configure TURN/STUN servers in the WebRTC configuration endpoint for production use. The current setup includes Google's public STUN servers.

## 🚀 Deployment

### Production Build

```bash
bun run build
bun run start
```

### Environment Setup

1. Set production environment variables
2. Configure TURN/STUN servers
3. Set up proper CORS origins
4. Use a production database (PostgreSQL, MongoDB, etc.)
5. Set up Redis for session management (optional)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Elysia.js](https://elysiajs.com/) for the amazing web framework
- [Bun](https://bun.sh/) for the fast JavaScript runtime
- [WebRTC](https://webrtc.org/) for real-time communication capabilities
