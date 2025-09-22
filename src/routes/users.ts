import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { authUtils } from '../utils/auth';
import { db } from '../utils/database';
import { UpdateUserSchema } from '../types';

export const userRoutes = new Elysia({ prefix: '/users' })
  .use(
    jwt({
      name: 'jwt',
      secret:
        process.env.JWT_SECRET ||
        'your-super-secret-jwt-key-change-in-production',
      exp: '7d',
    })
  )
  .derive(async ({ headers, jwt, set }) => {
    const authHeader = headers.authorization;
    const token = authUtils.extractTokenFromHeader(authHeader);

    if (!token) {
      set.status = 401;
      throw new Error('Unauthorized: No token provided');
    }

    const payload = await jwt.verify(token);
    if (!payload || typeof payload.userId !== 'string') {
      set.status = 401;
      throw new Error('Unauthorized: Invalid token');
    }

    const user = await db.getUserById(payload.userId);
    if (!user) {
      set.status = 401;
      throw new Error('Unauthorized: User not found');
    }

    return {
      user,
      token,
      userId: payload.userId,
    };
  })

  // Get user profile by ID
  .get(
    '/:id',
    async ({ params: { id }, set }) => {
      const user = await db.getUserById(id);
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
          avatar: user.avatar,
          status: user.status,
          createdAt: user.createdAt,
        },
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['Users'],
        summary: 'Get user by ID',
        description: 'Get user profile information by user ID',
      },
    }
  )

  .put(
    '/me',
    async ({ body, user, set }) => {
      try {
        const updates = UpdateUserSchema.parse(body);
        const updatedUser = await db.updateUser(user.id, updates);

        if (!updatedUser) {
          set.status = 404;
          return { success: false, message: 'User not found' };
        }

        return {
          success: true,
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            username: updatedUser.username,
            avatar: updatedUser.avatar,
            status: updatedUser.status,
            updatedAt: updatedUser.updatedAt,
          },
        };
      } catch (err) {
        set.status = 400;
        return { success: false, message: 'Invalid update data' };
      }
    },
    {
      body: UpdateUserSchema,
      detail: {
        tags: ['Users'],
        summary: 'Update current user profile',
        description: 'Update the profile of the currently authenticated user',
      },
    }
  )

  .get(
    '/',
    async ({ query, set }) => {
      const { limit = 50, offset = 0 } = query;

      const users = await db.getAllUsers(limit, offset);
      const userList = users.map(user => ({
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        status: user.status,
        createdAt: user.createdAt,
      }));

      return {
        success: true,
        users: userList,
        pagination: {
          limit,
          offset,
          total: userList.length,
        },
      };
    },
    {
      query: t.Object({
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
        offset: t.Optional(t.Number({ minimum: 0 })),
      }),
      detail: {
        tags: ['Users'],
        summary: 'Get all users',
        description: 'Get a list of all users with pagination',
      },
    }
  )

  // Search users by username
  .get(
    '/search/:username',
    async ({ params: { username }, set }) => {
      const users = await db.searchUsersByUsername(username);
      const userList = users.map(user => ({
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        status: user.status,
      }));

      return {
        success: true,
        users: userList,
      };
    },
    {
      params: t.Object({
        username: t.String(),
      }),
      detail: {
        tags: ['Users'],
        summary: 'Search users by username',
        description: 'Search for users by username (partial match)',
      },
    }
  )

  // Delete current user account
  .delete(
    '/me',
    async ({ user, set }) => {
      const deleted = await db.deleteUser(user.id);
      if (!deleted) {
        set.status = 404;
        return { success: false, message: 'User not found' };
      }

      return {
        success: true,
        message: 'User account deleted successfully',
      };
    },
    {
      detail: {
        tags: ['Users'],
        summary: 'Delete current user account',
        description: 'Delete the account of the currently authenticated user',
      },
    }
  );
