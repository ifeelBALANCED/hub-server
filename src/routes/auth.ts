import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { authUtils } from '../utils/auth';
import { db } from '../utils/database';
import { CreateUserSchema, LoginSchema } from '../types';

export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(
    jwt({
      name: 'jwt',
      secret:
        process.env.JWT_SECRET ||
        'your-super-secret-jwt-key-change-in-production',
      exp: '7d',
    })
  )
  .post(
    '/register',
    async ({ body, jwt, set }) => {
      try {
        const { email, username, password, avatar } =
          CreateUserSchema.parse(body);

        const existingUser = await db.getUserByEmail(email);
        if (existingUser) {
          set.status = 409;
          return {
            success: false,
            message: 'User with this email already exists',
          };
        }

        const hashedPassword = await authUtils.hashPassword(password);

        const user = await db.createUser({
          email,
          username,
          password: password,
          hashedPassword,
          avatar,
        });

        const token = await jwt.sign(authUtils.generateTokenPayload(user));
        await authUtils.createUserSession(token, user.id);

        return {
          success: true,
          message: 'User registered successfully',
          token,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            avatar: user.avatar || undefined,
            status: user.status,
          },
        };
      } catch {
        set.status = 400;
        return { success: false, message: 'Invalid user data' };
      }
    },
    {
      body: CreateUserSchema,
      response: t.Object({
        success: t.Boolean(),
        message: t.String(),
        token: t.Optional(t.String()),
        user: t.Optional(
          t.Object({
            id: t.String(),
            email: t.String(),
            username: t.String(),
            avatar: t.Optional(t.String()),
            status: t.String(),
          })
        ),
      }),
      detail: {
        tags: ['Authentication'],
        summary: 'Register a new user',
        description: 'Registers a new user with email, username, and password.',
      },
    }
  )

  // Login user
  .post(
    '/login',
    async ({ body, jwt, set }) => {
      try {
        const { email, password } = LoginSchema.parse(body);

        // Check if user exists
        const user = await db.getUserByEmail(email);
        if (!user) {
          set.status = 401;
          return { success: false, message: 'Invalid email or password' };
        }

        // Verify password
        const isValidPassword = await authUtils.verifyPassword(
          password,
          user.hashedPassword
        );
        if (!isValidPassword) {
          set.status = 401;
          return { success: false, message: 'Invalid email or password' };
        }

        // Update user status to online
        await db.updateUser(user.id, { status: 'ONLINE' });

        // Generate token
        const token = await jwt.sign(authUtils.generateTokenPayload(user));
        await authUtils.createUserSession(token, user.id);

        return {
          success: true,
          message: 'Logged in successfully',
          token,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            avatar: user.avatar || undefined,
            status: user.status,
          },
        };
      } catch (err) {
        set.status = 400;
        return { success: false, message: 'Invalid login data' };
      }
    },
    {
      body: LoginSchema,
      response: t.Object({
        success: t.Boolean(),
        message: t.String(),
        token: t.Optional(t.String()),
        user: t.Optional(
          t.Object({
            id: t.String(),
            email: t.String(),
            username: t.String(),
            avatar: t.Optional(t.String()),
            status: t.String(),
          })
        ),
      }),
      detail: {
        tags: ['Authentication'],
        summary: 'Login user',
        description: 'Logs in a user and returns a JWT token.',
      },
    }
  )

  // Logout user
  .post(
    '/logout',
    async ({ headers, set }) => {
      const authHeader = headers.authorization;
      const token = authUtils.extractTokenFromHeader(authHeader);

      if (!token) {
        set.status = 401;
        return { success: false, message: 'No token provided' };
      }

      const userId = await db.getUserIdByToken(token);
      if (userId) {
        // Update user status to offline
        await db.updateUser(userId, { status: 'OFFLINE' });
        // Delete session
        await authUtils.deleteUserSession(token);
      }

      return {
        success: true,
        message: 'Logged out successfully',
      };
    },
    {
      detail: {
        tags: ['Authentication'],
        summary: 'Logout user',
        description: 'Logs out the current user by invalidating their session.',
      },
    }
  )

  // Get current user profile
  .get(
    '/me',
    async ({ headers, jwt, set }) => {
      const authHeader = headers.authorization;
      const token = authUtils.extractTokenFromHeader(authHeader);

      if (!token) {
        set.status = 401;
        return { success: false, message: 'No token provided' };
      }

      const payload = await jwt.verify(token);
      if (!payload || typeof payload.userId !== 'string') {
        set.status = 401;
        return { success: false, message: 'Invalid token' };
      }

      const session = await authUtils.verifyUserSession(token);
      if (!session) {
        set.status = 401;
        return { success: false, message: 'Session expired or invalid' };
      }

      const user = await db.getUserById(payload.userId);
      if (!user) {
        set.status = 404;
        return { success: false, message: 'User not found' };
      }

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          avatar: user.avatar || undefined,
          status: user.status,
        },
      };
    },
    {
      response: t.Object({
        success: t.Boolean(),
        message: t.Optional(t.String()),
        user: t.Optional(
          t.Object({
            id: t.String(),
            email: t.String(),
            username: t.String(),
            avatar: t.Optional(t.String()),
            status: t.String(),
          })
        ),
      }),
      detail: {
        tags: ['Authentication'],
        summary: 'Get current user profile',
        description:
          'Retrieves the profile of the currently authenticated user.',
      },
    }
  )

  // Refresh token
  .post(
    '/refresh',
    async ({ headers, jwt, set }) => {
      const authHeader = headers.authorization;
      const token = authUtils.extractTokenFromHeader(authHeader);

      if (!token) {
        set.status = 401;
        return { success: false, message: 'No token provided' };
      }

      const payload = await jwt.verify(token);
      if (!payload || typeof payload.userId !== 'string') {
        set.status = 401;
        return { success: false, message: 'Invalid token' };
      }

      const session = await authUtils.verifyUserSession(token);
      if (!session) {
        set.status = 401;
        return { success: false, message: 'Session expired or invalid' };
      }

      const user = await db.getUserById(payload.userId);
      if (!user) {
        set.status = 404;
        return { success: false, message: 'User not found' };
      }

      // Generate new token
      const newToken = await jwt.sign(authUtils.generateTokenPayload(user));

      // Update session
      await authUtils.deleteUserSession(token);
      await authUtils.createUserSession(newToken, user.id);

      return {
        success: true,
        token: newToken,
      };
    },
    {
      response: t.Object({
        success: t.Boolean(),
        message: t.Optional(t.String()),
        token: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Authentication'],
        summary: 'Refresh authentication token',
        description: 'Refreshes the JWT token for an active session.',
      },
    }
  );
