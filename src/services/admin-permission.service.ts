import { prisma } from '../repositories/prisma';
import { NotFoundError } from '../utils/errors';
import { PermissionService } from './permission.service';

export class AdminPermissionService {
  static async createPermission(name: string, description?: string) {
    return prisma.permission.create({
      data: { name, description },
    });
  }

  static async assignPermissionToRole(roleId: string, permissionId: string) {
    // Basic checks
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundError('Role not found');
    
    const permission = await prisma.permission.findUnique({ where: { id: permissionId } });
    if (!permission) throw new NotFoundError('Permission not found');

    return prisma.rolePermission.create({
      data: { roleId, permissionId },
    });
    // In production we should invalidate cache for all users having this role
  }

  static async assignPermissionToUser(userId: string, permissionId: string, isAllowed: boolean, expiresAt?: Date) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');

    const permission = await prisma.permission.findUnique({ where: { id: permissionId } });
    if (!permission) throw new NotFoundError('Permission not found');

    const override = await prisma.userPermission.upsert({
      where: {
        userId_permissionId: { userId, permissionId }
      },
      update: { isAllowed, expiresAt },
      create: { userId, permissionId, isAllowed, expiresAt }
    });

    await PermissionService.invalidateUserCache(userId);

    return override;
  }

  static async removeUserPermission(userId: string, permissionId: string) {
    await prisma.userPermission.delete({
      where: {
        userId_permissionId: { userId, permissionId }
      }
    });

    await PermissionService.invalidateUserCache(userId);
    return true;
  }
}
