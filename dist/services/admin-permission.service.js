"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminPermissionService = void 0;
const prisma_1 = require("../repositories/prisma");
const errors_1 = require("../utils/errors");
const permission_service_1 = require("./permission.service");
class AdminPermissionService {
    static async createPermission(name, description) {
        return prisma_1.prisma.permission.create({
            data: { name, description },
        });
    }
    static async assignPermissionToRole(roleId, permissionId) {
        // Basic checks
        const role = await prisma_1.prisma.role.findUnique({ where: { id: roleId } });
        if (!role)
            throw new errors_1.NotFoundError('Role not found');
        const permission = await prisma_1.prisma.permission.findUnique({ where: { id: permissionId } });
        if (!permission)
            throw new errors_1.NotFoundError('Permission not found');
        return prisma_1.prisma.rolePermission.create({
            data: { roleId, permissionId },
        });
        // In production we should invalidate cache for all users having this role
    }
    static async assignPermissionToUser(userId, permissionId, isAllowed, expiresAt) {
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new errors_1.NotFoundError('User not found');
        const permission = await prisma_1.prisma.permission.findUnique({ where: { id: permissionId } });
        if (!permission)
            throw new errors_1.NotFoundError('Permission not found');
        const override = await prisma_1.prisma.userPermission.upsert({
            where: {
                userId_permissionId: { userId, permissionId }
            },
            update: { isAllowed, expiresAt },
            create: { userId, permissionId, isAllowed, expiresAt }
        });
        await permission_service_1.PermissionService.invalidateUserCache(userId);
        return override;
    }
    static async removeUserPermission(userId, permissionId) {
        await prisma_1.prisma.userPermission.delete({
            where: {
                userId_permissionId: { userId, permissionId }
            }
        });
        await permission_service_1.PermissionService.invalidateUserCache(userId);
        return true;
    }
}
exports.AdminPermissionService = AdminPermissionService;
