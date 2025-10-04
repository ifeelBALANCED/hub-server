import { hash, verify } from 'argon2';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client';
import { users, refreshTokens } from '../db/schema';
import { errors } from '../common/errors';
import { ulid } from 'ulid';
import type { RegisterDto, LoginDto, UpdateProfileDto } from './dto';
import type {
  User,
  AuthResponse,
  AccessTokenPayload,
  RefreshTokenPayload,
} from './types';
import { env } from '../env';

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    return hash(password);
  }

  async verifyPassword(hash: string, password: string): Promise<boolean> {
    try {
      return await verify(hash, password);
    } catch {
      return false;
    }
  }

  async register(
    data: RegisterDto,
    signAccess: (payload: AccessTokenPayload) => Promise<string>,
    signRefresh: (payload: RefreshTokenPayload) => Promise<string>
  ): Promise<AuthResponse> {
    // Check if user exists
    const existing = await db.query.users.findFirst({
      where: eq(users.email, data.email),
    });

    if (existing) {
      throw errors.auth.userExists();
    }

    // Hash password
    const passwordHash = await this.hashPassword(data.password);

    // Create user
    const [user] = await db
      .insert(users)
      .values({
        email: data.email,
        passwordHash,
        displayName: data.displayName,
      })
      .returning();

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.email,
      signAccess,
      signRefresh
    );

    return {
      user: this.toUserResponse(user),
      accessToken,
      refreshToken,
    };
  }

  async login(
    data: LoginDto,
    signAccess: (payload: AccessTokenPayload) => Promise<string>,
    signRefresh: (payload: RefreshTokenPayload) => Promise<string>
  ): Promise<AuthResponse> {
    // Find user
    const user = await db.query.users.findFirst({
      where: eq(users.email, data.email),
    });

    if (!user || !user.passwordHash) {
      throw errors.auth.invalidCredentials();
    }

    // Verify password
    const isValid = await this.verifyPassword(user.passwordHash, data.password);
    if (!isValid) {
      throw errors.auth.invalidCredentials();
    }

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.email,
      signAccess,
      signRefresh
    );

    return {
      user: this.toUserResponse(user),
      accessToken,
      refreshToken,
    };
  }

  async oauthGoogle(
    idToken: string,
    signAccess: (payload: AccessTokenPayload) => Promise<string>,
    signRefresh: (payload: RefreshTokenPayload) => Promise<string>
  ): Promise<AuthResponse> {
    // Stub verifier - in production, verify with Google's API
    const googleUser = await this.verifyGoogleToken(idToken);

    // Find or create user
    let user = await db.query.users.findFirst({
      where: eq(users.email, googleUser.email),
    });

    if (!user) {
      [user] = await db
        .insert(users)
        .values({
          email: googleUser.email,
          displayName: googleUser.name,
          passwordHash: null,
        })
        .returning();
    }

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.email,
      signAccess,
      signRefresh
    );

    return {
      user: this.toUserResponse(user),
      accessToken,
      refreshToken,
    };
  }

  async refresh(
    token: string,
    verifyRefresh: (token: string) => Promise<RefreshTokenPayload | false>,
    signAccess: (payload: AccessTokenPayload) => Promise<string>
  ): Promise<{ accessToken: string }> {
    const payload = await verifyRefresh(token);
    if (!payload) {
      throw errors.auth.invalidToken();
    }

    // Verify refresh token exists in DB
    const tokenHash = await this.hashPassword(token);
    const storedToken = await db.query.refreshTokens.findFirst({
      where: and(
        eq(refreshTokens.userId, payload.sub),
        eq(refreshTokens.tokenHash, tokenHash)
      ),
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw errors.auth.tokenExpired();
    }

    // Find user
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.sub),
    });

    if (!user) {
      throw errors.auth.invalidToken();
    }

    // Generate new access token
    const accessToken = await signAccess({
      sub: user.id,
      email: user.email,
    });

    return { accessToken };
  }

  async logout(userId: string, token: string): Promise<void> {
    const tokenHash = await this.hashPassword(token);
    await db
      .delete(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.tokenHash, tokenHash)
        )
      );
  }

  async getUserById(userId: string): Promise<User | null> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    return user ? this.toUserResponse(user) : null;
  }

  async updateProfile(userId: string, data: UpdateProfileDto): Promise<User> {
    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, userId))
      .returning();

    return this.toUserResponse(user);
  }

  private async generateTokens(
    userId: string,
    email: string,
    signAccess: (payload: AccessTokenPayload) => Promise<string>,
    signRefresh: (payload: RefreshTokenPayload) => Promise<string>
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenId = ulid();

    const accessToken = await signAccess({
      sub: userId,
      email,
    });

    const refreshToken = await signRefresh({
      sub: userId,
      tokenId,
    });

    // Store refresh token hash
    const tokenHash = await this.hashPassword(refreshToken);
    const expiresAt = new Date(Date.now() + env.REFRESH_TTL_SEC * 1000);

    await db.insert(refreshTokens).values({
      userId,
      tokenHash,
      expiresAt,
    });

    return { accessToken, refreshToken };
  }

  private async verifyGoogleToken(
    _idToken: string
  ): Promise<{ email: string; name: string }> {
    // Stub implementation - in production, verify with Google's API
    // For now, return demo data
    return {
      email: 'demo@gmail.com',
      name: 'Google User',
    };
  }

  private toUserResponse(user: any): User {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };
  }
}

export const authService = new AuthService();
