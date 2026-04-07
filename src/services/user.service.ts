import { prisma } from '../repositories/prisma';
import { NotFoundError } from '../utils/errors';

export class UserService {
  static async getUsers() {
    return prisma.user.findMany({
      select: { id: true, email: true, createdAt: true },
    });
  }

  static async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: true } },
        permissions: { include: { permission: true } }
      }
    });

    if (!user) throw new NotFoundError('User not found');
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
