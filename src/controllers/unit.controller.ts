import { Request, Response, NextFunction } from 'express';
import { UnitService } from '../services/unit.service';
import { parsePaginationParams, createPaginatedResult } from '../utils/pagination';

export class UnitController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description } = req.body;
      const unit = await UnitService.createUnit(name, description);
      res.status(201).json({ success: true, data: unit });
    } catch (err) {
      next(err);
    }
  }

  static async getUnits(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, skip } = parsePaginationParams(req);
      const search = req.query.search as string | undefined;

      const { total, units } = await UnitService.getUnits(skip, limit, search);
      
      const result = createPaginatedResult(units, total, { page, limit });
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  static async getUnitById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const unit = await UnitService.getUnitById(id);
      res.status(200).json({ success: true, data: unit });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { name, description } = req.body;
      const unit = await UnitService.updateUnit(id, name, description);
      res.status(200).json({ success: true, data: unit });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await UnitService.deleteUnit(id);
      res.status(200).json({ success: true, message: 'Unit deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  static async assign(req: Request, res: Response, next: NextFunction) {
    try {
      const unitId = req.params.id as string;
      const { userIds } = req.body;
      
      if (!Array.isArray(userIds)) {
        return res.status(400).json({ success: false, message: 'userIds must be an array of strings' });
      }

      const assigned = await UnitService.assignUsersToUnit(unitId, userIds);
      res.status(200).json({ success: true, data: assigned });
    } catch (err) {
      next(err);
    }
  }

  static async getUsersByUnitId(req: Request, res: Response, next: NextFunction) {
    try {
      const unitId = req.params.id as string;
      const { page, limit, skip } = parsePaginationParams(req);
      const search = (req.query.search as string) || undefined;

      const { total, users } = await UnitService.getUsersByUnitId(unitId, skip, limit, search);
      
      const result = createPaginatedResult(users, total, { page, limit });
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}
