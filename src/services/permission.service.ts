import { prisma } from '../repositories/prisma';
import { redisClient } from '../config/redis';

export class PermissionService {
  /**
   * HasPermission implements the Hybrid RBAC logic.
   * 1. Check UserPermission (direct override)
   * 2. If not overridden, check RolePermission
   */
  static async hasPermission(userId: string, permissionName: string): Promise<boolean> {
    const cacheKey = `user_perm:${userId}:${permissionName}`;

    // 1. Check cache via Redis
    if (redisClient) {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return cached === '1';
      }
    }

    // 2. Fetch permission ID
    const permission = await prisma.permission.findUnique({
      where: { name: permissionName },
    });

    if (!permission) {
      return false; // Permission doesn't exist
    }

    // 3. Check direct override in UserPermission
    const userPermission = await prisma.userPermission.findUnique({
      where: {
        userId_permissionId: {
          userId,
          permissionId: permission.id,
        },
      },
    });

    if (userPermission) {
      // Check expiration
      if (userPermission.expiresAt && userPermission.expiresAt < new Date()) {
        // Expired, ignore override and fall through to roles
        // Or strictly deny? Requirements state optionally expires.
        // Let's assume if it's expired, we ignore the override and check roles.
      } else {
        // Cache and return direct override
        await this.cacheResult(cacheKey, userPermission.isAllowed);
        return userPermission.isAllowed;
      }
    }

    // 4. Fallback to Role Check
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: {
              where: { permissionId: permission.id },
            },
          },
        },
      },
    });

    // Check if any assigned role has the permission
    const hasRolePermission = userRoles.some(
      (ur: any) => ur.role.permissions.length > 0
    );

    await this.cacheResult(cacheKey, hasRolePermission);
    return hasRolePermission;
  }

  private static async cacheResult(key: string, isAllowed: boolean) {
    if (redisClient) {
      // Cache for 15 minutes
      await redisClient.set(key, isAllowed ? '1' : '0', 'EX', 15 * 60);
    }
  }

  // Use this to invalidate cache when permissions change
  static async invalidateUserCache(userId: string) {
    if (redisClient) {
      const keys = await redisClient.keys(`user_perm:${userId}:*`);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    }
  }
}
