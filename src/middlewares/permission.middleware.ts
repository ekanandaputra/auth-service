import { Request, Response, NextFunction } from 'express';
import { PermissionService } from '../services/permission.service';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

export const requirePermission = (requiredPermission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
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
