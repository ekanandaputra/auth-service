import { prisma } from '../repositories/prisma';
import { NotFoundError } from '../utils/errors';
import { PermissionService } from './permission.service';

export class RoleService {
  static async createRole(name: string, description?: string) {
    return prisma.role.create({
      data: { name, description },
    });
  }

  static async assignUsersToRole(roleId: string, userIds: string[]) {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundError('Role not found');

    const currentAssignments = await prisma.userRole.findMany({
      where: { roleId },
      select: { userId: true }
    });
    const currentUserIds = currentAssignments.map(a => a.userId);

    const usersToRemove = currentUserIds.filter(id => !userIds.includes(id));
    const usersToAdd = userIds.filter(id => !currentUserIds.includes(id));

    if (usersToAdd.length > 0) {
      const existingUsersCount = await prisma.user.count({
        where: { id: { in: usersToAdd }, deletedAt: null }
      });
      if (existingUsersCount !== usersToAdd.length) {
        throw new NotFoundError('One or more users not found');
      }
    }

    await prisma.$transaction([
      prisma.userRole.deleteMany({
        where: {
          roleId,
          userId: { in: usersToRemove }
        }
      }),
      prisma.userRole.createMany({
        data: usersToAdd.map(userId => ({ roleId, userId }))
      })
    ]);

    // Invalidate permission cache
    const affectedUsers = [...usersToRemove, ...usersToAdd];
    await Promise.all(affectedUsers.map(userId => PermissionService.invalidateUserCache(userId)));

    return { added: usersToAdd.length, removed: usersToRemove.length };
  }

  static async getRoles(skip: number, limit: number, search?: string) {
    const whereClause = search
      ? {
          name: {
            contains: search,
            mode: 'insensitive' as const,
          },
        }
      : {};

    const [total, roles] = await prisma.$transaction([
      prisma.role.count({ where: whereClause }),
      prisma.role.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
    ]);

    return { total, roles };
  }

  static async getUsersByRoleId(roleId: string, skip: number, limit: number, search?: string) {
    const roleExists = await prisma.role.findUnique({ where: { id: roleId } });
    if (!roleExists) throw new NotFoundError('Role not found');

    const userWhere: any = {
      deletedAt: null,
      roles: {
        some: {
          roleId
        }
      }
    };

    if (search) {
      userWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { nip: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [total, users] = await prisma.$transaction([
      prisma.user.count({ where: userWhere }),
      prisma.user.findMany({
        where: userWhere,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          nip: true,
          type: true,
          isActive: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return { total, users };
  }
}
