import { Request, Response, NextFunction } from 'express';
import { RoleService } from '../services/role.service';
import { parsePaginationParams, createPaginatedResult } from '../utils/pagination';

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

  static async getRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, skip } = parsePaginationParams(req);
      const search = req.query.search as string | undefined;

      const { total, roles } = await RoleService.getRoles(skip, limit, search);
      
      const result = createPaginatedResult(roles, total, { page, limit });
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}
