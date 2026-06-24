import { prisma } from '../repositories/prisma';
import { hashPassword, verifyPassword } from '../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../utils/errors';
import { redisClient } from '../config/redis';

export class AuthService {
  static async register(data: any) {
    const { email, password, name, nip, type } = data;

    if (!email && !nip) {
      throw new BadRequestError('Either email or NIP must be provided');
    }

    const orConditions: any[] = [];
    if (email) orConditions.push({ email });
    if (nip) orConditions.push({ nip });

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: orConditions
      }
    });

    if (existingUser) {
      if (email && existingUser.email === email) throw new BadRequestError('Email already in use');
      if (nip && existingUser.nip === nip) throw new BadRequestError('NIP already in use');
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        nip,
        type,
      },
    });

    return { id: user.id, email: user.email, name: user.name, nip: user.nip, type: user.type };
  }

  static async login(data: any) {
    const { email, nip, password } = data;

    if (!email && !nip) {
      throw new BadRequestError('Email or NIP must be provided');
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(nip ? [{ nip }] : [])
        ]
      },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (user.deletedAt) {
      throw new UnauthorizedError('User account has been deleted');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('User account is inactive');
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const userRoles = user.roles.map(ur => ({ id: ur.role.id, key: ur.role.key, name: ur.role.name }));

    const payload = { userId: user.id, roles: userRoles };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    return {
      "token": accessToken,
      refreshToken,
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        nip: user.nip, 
        type: user.type,
        roles: userRoles
      },
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

      const user = await prisma.user.findUnique({ 
        where: { id: payload.userId },
        include: {
          roles: {
            include: {
              role: true
            }
          }
        }
      });
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      if (user.deletedAt) {
        throw new UnauthorizedError('User account has been deleted');
      }

      if (!user.isActive) {
        throw new UnauthorizedError('User account is inactive');
      }

      const userRoles = user.roles.map(ur => ({ id: ur.role.id, key: ur.role.key, name: ur.role.name }));
      const newPayload = { userId: user.id, roles: userRoles };
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

  static async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      throw new NotFoundError('User not found');
    }

    const isValid = await verifyPassword(oldPassword, user.password);
    if (!isValid) {
      throw new BadRequestError('Password lama tidak sesuai');
    }

    const hashedNewPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    return true;
  }
}
