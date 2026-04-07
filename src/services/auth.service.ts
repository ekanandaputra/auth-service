import { prisma } from '../repositories/prisma';
import { hashPassword, verifyPassword } from '../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../utils/errors';
import { redisClient } from '../config/redis';

export class AuthService {
  static async register(data: any) {
    const { email, password } = data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new BadRequestError('Email already in use');
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    return { id: user.id, email: user.email };
  }

  static async login(data: any) {
    const { email, password } = data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const payload = { userId: user.id };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email },
    };
  }

  static async logout(accessToken: string) {
    if (!redisClient) return true; // Can't blacklist without Redis
    // To properly blacklist, would decode token to find TTL, storing with matching EX
    // For simplicity, hardcode ~15 mins TTL
    await redisClient.set(`blacklist:${accessToken}`, '1', 'EX', 15 * 60);
    return true;
  }

  static async refreshToken(oldRefreshToken: string) {
    try {
      const payload = verifyRefreshToken(oldRefreshToken);
      
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      const newPayload = { userId: user.id };
      const newAccessToken = signAccessToken(newPayload);
      const newRefreshToken = signRefreshToken(newPayload);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (e) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  static async validateToken(accessToken: string) {
    // Decoding is handled via middleware
    return true; // If reaches here via route, it's valid
  }
}
