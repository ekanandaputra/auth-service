import { Request, Response, NextFunction } from 'express';
import { AdminPermissionService } from '../services/admin-permission.service';

export class PermissionController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description } = req.body;
      const permission = await AdminPermissionService.createPermission(name, description);
      res.status(201).json({ success: true, data: permission });
    } catch (err) {
      next(err);
    }
  }

  static async assignToRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { roleId, permissionId } = req.body;
      const assigned = await AdminPermissionService.assignPermissionToRole(roleId, permissionId);
      res.status(200).json({ success: true, data: assigned });
    } catch (err) {
      next(err);
    }
  }

  static async assignToUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, permissionId, isAllowed, expiresAt } = req.body;
      // expiresAt should be a Date string or null
      const parsedExpiresAt = expiresAt ? new Date(expiresAt) : undefined;
      const override = await AdminPermissionService.assignPermissionToUser(userId, permissionId, isAllowed, parsedExpiresAt);
      res.status(200).json({ success: true, data: override });
    } catch (err) {
      next(err);
    }
  }

  static async removeUserPermission(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, permissionId } = req.body;
      await AdminPermissionService.removeUserPermission(userId, permissionId);
      res.status(200).json({ success: true, message: 'Permission override removed' });
    } catch (err) {
      next(err);
    }
  }
}
