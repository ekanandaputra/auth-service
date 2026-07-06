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

  static async assignUsersToUnit(unitId: string, users: { userId: string; type?: 'PIC' | 'MEMBER' }[]) {
    const unit = await prisma.unit.findUnique({ where: { id: unitId } });
    if (!unit) throw new NotFoundError('Unit not found');

    const incomingUserIds = users.map(u => u.userId);

    if (incomingUserIds.length > 0) {
      const existingUsersCount = await prisma.user.count({
        where: { id: { in: incomingUserIds }, deletedAt: null }
      });
      if (existingUsersCount !== incomingUserIds.length) {
        throw new NotFoundError('One or more users not found');
      }
    }

    await prisma.$transaction([
      prisma.userUnit.deleteMany({
        where: { unitId }
      }),
      prisma.userUnit.createMany({
        data: users.map(u => ({ 
          unitId, 
          userId: u.userId, 
          type: u.type || 'MEMBER' 
        }))
      })
    ]);

    return { assignedCount: users.length };
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

    const [total, rawUsers] = await prisma.$transaction([
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
          createdAt: true,
          units: {
            where: { unitId },
            select: { type: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const users = rawUsers.map(user => {
      const { units, ...userData } = user;
      return {
        ...userData,
        memberType: units[0]?.type || 'MEMBER'
      };
    });

    return { total, users };
  }
}
