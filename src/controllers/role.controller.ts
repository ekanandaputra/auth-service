import { Request, Response, NextFunction } from 'express';
import { RoleService } from '../services/role.service';

export class RoleController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description } = req.body;
      const role = await RoleService.createRole(name, description);
      res.status(201).json({ success: true, data: role });
    } catch (err) {
      next(err);
    }
  }

  static async assign(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, roleId } = req.body;
      const assigned = await RoleService.assignRoleToUser(userId, roleId);
      res.status(200).json({ success: true, data: assigned });
    } catch (err) {
      next(err);
    }
  }
}
