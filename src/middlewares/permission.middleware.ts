import { Request, Response, NextFunction } from 'express';
import { PermissionService } from '../services/permission.service';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

// Jika BYPASS_PERMISSION=true, semua permission check akan di-skip.
// authMiddleware tetap aktif — user harus login, tapi tidak perlu punya permission tertentu.
const isBypassMode = process.env.BYPASS_PERMISSION === 'true';

export const requirePermission = (requiredPermission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Bypass mode aktif: lewati semua pengecekan permission
    if (isBypassMode) {
      return next();
    }

    try {
      const userId = req.userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const hasPerm = await PermissionService.hasPermission(userId, requiredPermission);
      
      if (!hasPerm) {
        throw new ForbiddenError(`Missing required permission: ${requiredPermission}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
