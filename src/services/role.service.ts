import { prisma } from '../repositories/prisma';
import { NotFoundError } from '../utils/errors';
import { PermissionService } from './permission.service';

export class RoleService {
  static async createRole(name: string, description?: string) {
    return prisma.role.create({
      data: { name, description },
    });
  }

  static async assignRoleToUser(userId: string, roleId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundError('Role not found');

    const assigned = await prisma.userRole.create({
      data: { userId, roleId },
    });

    // Invalidate permission cache
    await PermissionService.invalidateUserCache(userId);

    return assigned;
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
