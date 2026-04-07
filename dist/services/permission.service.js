"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionService = void 0;
const prisma_1 = require("../repositories/prisma");
const redis_1 = require("../config/redis");
class PermissionService {
    /**
     * HasPermission implements the Hybrid RBAC logic.
     * 1. Check UserPermission (direct override)
     * 2. If not overridden, check RolePermission
     */
    static async hasPermission(userId, permissionName) {
        const cacheKey = `user_perm:${userId}:${permissionName}`;
        // 1. Check cache via Redis
        if (redis_1.redisClient) {
            const cached = await redis_1.redisClient.get(cacheKey);
            if (cached) {
                return cached === '1';
            }
        }
        // 2. Fetch permission ID
        const permission = await prisma_1.prisma.permission.findUnique({
            where: { name: permissionName },
        });
        if (!permission) {
            return false; // Permission doesn't exist
        }
        // 3. Check direct override in UserPermission
        const userPermission = await prisma_1.prisma.userPermission.findUnique({
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
            }
            else {
                // Cache and return direct override
                await this.cacheResult(cacheKey, userPermission.isAllowed);
                return userPermission.isAllowed;
            }
        }
        // 4. Fallback to Role Check
        const userRoles = await prisma_1.prisma.userRole.findMany({
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
        const hasRolePermission = userRoles.some((ur) => ur.role.permissions.length > 0);
        await this.cacheResult(cacheKey, hasRolePermission);
        return hasRolePermission;
    }
    static async cacheResult(key, isAllowed) {
        if (redis_1.redisClient) {
            // Cache for 15 minutes
            await redis_1.redisClient.set(key, isAllowed ? '1' : '0', 'EX', 15 * 60);
        }
    }
    // Use this to invalidate cache when permissions change
    static async invalidateUserCache(userId) {
        if (redis_1.redisClient) {
            const keys = await redis_1.redisClient.keys(`user_perm:${userId}:*`);
            if (keys.length > 0) {
                await redis_1.redisClient.del(keys);
            }
        }
    }
}
exports.PermissionService = PermissionService;
