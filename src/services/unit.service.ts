import { prisma } from '../repositories/prisma';
import { NotFoundError } from '../utils/errors';

export class UnitService {
  static async createUnit(name: string, description?: string) {
    return prisma.unit.create({
      data: { name, description },
    });
  }

  static async getUnits(skip: number, limit: number, search?: string) {
    const whereClause = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [total, units] = await prisma.$transaction([
      prisma.unit.count({ where: whereClause }),
      prisma.unit.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
    ]);

    return { total, units };
  }

  static async getUnitById(id: string) {
    const unit = await prisma.unit.findUnique({ where: { id } });
    if (!unit) throw new NotFoundError('Unit not found');
    return unit;
  }

  static async updateUnit(id: string, name?: string, description?: string) {
    const unitExists = await prisma.unit.findUnique({ where: { id } });
    if (!unitExists) throw new NotFoundError('Unit not found');

    return prisma.unit.update({
      where: { id },
      data: { name, description },
    });
  }

  static async deleteUnit(id: string) {
    const unitExists = await prisma.unit.findUnique({ where: { id } });
    if (!unitExists) throw new NotFoundError('Unit not found');

    return prisma.unit.delete({
      where: { id },
    });
  }

  static async assignUsersToUnit(unitId: string, userIds: string[]) {
    const unit = await prisma.unit.findUnique({ where: { id: unitId } });
    if (!unit) throw new NotFoundError('Unit not found');

    const currentAssignments = await prisma.userUnit.findMany({
      where: { unitId },
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
      prisma.userUnit.deleteMany({
        where: {
          unitId,
          userId: { in: usersToRemove }
        }
      }),
      prisma.userUnit.createMany({
        data: usersToAdd.map(userId => ({ unitId, userId }))
      })
    ]);

    return { added: usersToAdd.length, removed: usersToRemove.length };
  }

  static async getUsersByUnitId(unitId: string, skip: number, limit: number, search?: string) {
    const unitExists = await prisma.unit.findUnique({ where: { id: unitId } });
    if (!unitExists) throw new NotFoundError('Unit not found');

    const userWhere: any = {
      deletedAt: null,
      units: {
        some: {
          unitId
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
