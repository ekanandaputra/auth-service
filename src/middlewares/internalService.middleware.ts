import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

// Daftar service yang diizinkan untuk mengakses endpoint internal
const ALLOWED_SERVICES = ['sim-iku'];

/**
 * Middleware untuk autentikasi komunikasi antar service (internal).
 * Service harus mengirimkan:
 *   - Header `X-Service-Name`: nama service pengirim (e.g. "sim-iku")
 *   - Header `X-Internal-Key`: secret key yang disepakati bersama
 */
export const internalServiceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const serviceName = req.headers['x-service-name'] as string | undefined;
  const internalKey = req.headers['x-internal-key'] as string | undefined;

  if (!serviceName || !internalKey) {
    return next(new UnauthorizedError('Missing internal service credentials'));
  }

  if (!ALLOWED_SERVICES.includes(serviceName)) {
    return next(new ForbiddenError(`Service '${serviceName}' is not allowed`));
  }

  const validKey = process.env.INTERNAL_SERVICE_KEY;
  if (!validKey || internalKey !== validKey) {
    return next(new UnauthorizedError('Invalid internal service key'));
  }

  next();
};
