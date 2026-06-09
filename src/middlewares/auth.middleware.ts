import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { UnauthorizedError } from '../utils/errors';
import { redisClient } from '../config/redis';

// Daftar service internal yang diizinkan
const ALLOWED_INTERNAL_SERVICES = ['sim-iku'];

// Extend express request to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // ── Mode internal service ─────────────────────────────────
    // Jika request membawa X-Service-Name + X-Internal-Key yang valid,
    // lewati pengecekan JWT dan langsung izinkan akses.
    const serviceName = req.headers['x-service-name'] as string | undefined;
    const internalKey = req.headers['x-internal-key'] as string | undefined;
    const validInternalKey = process.env.INTERNAL_SERVICE_KEY;

    if (serviceName && internalKey) {
      if (
        validInternalKey &&
        internalKey === validInternalKey &&
        ALLOWED_INTERNAL_SERVICES.includes(serviceName)
      ) {
        return next();
      }
      // Header ada tapi tidak valid → tolak langsung
      throw new UnauthorizedError('Invalid internal service credentials');
    }

    // ── Mode JWT (user biasa) ─────────────────────────────────
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid token');
    }

    const token = authHeader.split(' ')[1];

    // Check if token is blacklisted in Redis
    if (redisClient) {
      const isBlacklisted = await redisClient.get(`blacklist:${token}`);
      if (isBlacklisted) {
        throw new UnauthorizedError('Token is expired/invalidated');
      }
    }

    const payload = verifyAccessToken(token);
    req.userId = payload.userId;

    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid or expired token'));
  }
};
