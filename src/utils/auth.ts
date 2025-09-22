import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import { db } from './database';

export const authUtils = {
  // Hash password
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  },

  // Verify password
  async verifyPassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  },

  // Generate JWT token (this will be handled by the JWT plugin in routes)
  generateTokenPayload(user: User) {
    return {
      userId: user.id,
      email: user.email,
      username: user.username,
    };
  },

  // Extract token from Authorization header
  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) return null;

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  },

  // Create user session
  async createUserSession(token: string, userId: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    await db.createSession(token, userId, expiresAt);
  },

  // Verify user session
  async verifyUserSession(token: string): Promise<string | null> {
    return await db.getUserIdByToken(token);
  },

  // Delete user session
  async deleteUserSession(token: string): Promise<void> {
    await db.deleteSession(token);
  },
};
