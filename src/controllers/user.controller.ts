import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { parsePaginationParams } from '../utils/pagination';
import { BadRequestError } from '../utils/errors';

export class UserController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePaginationParams(req);
      const search = req.query.search as string | undefined;

      const usersResult = await UserService.getUsers(page, limit, search);
      res.status(200).json({
        success: true,
        data: usersResult.data,
        pagination: usersResult.pagination
      });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.id as string;
      const user = await UserService.getUserById(userId);
      res.status(200).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }

  static async importUsers(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new BadRequestError('No file uploaded');
      }

      const result = await UserService.importUsersFromBuffer(req.file.buffer);
      res.status(200).json({
        success: true,
        message: 'Import process completed',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.id as string;
      await UserService.softDeleteUser(userId);
      res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.id as string;
      const { isActive } = req.body;
      
      if (typeof isActive !== 'boolean') {
        throw new BadRequestError('isActive field must be a boolean');
      }

      await UserService.updateUserStatus(userId, isActive);
      res.status(200).json({ success: true, message: 'User status updated successfully' });
    } catch (err) {
      next(err);
    }
  }

  static async exportUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const buffer = await UserService.exportUsersToExcel();
      
      res.setHeader('Content-Disposition', 'attachment; filename="users_export.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      res.status(200).send(buffer);
    } catch (err) {
      next(err);
    }
  }
}
