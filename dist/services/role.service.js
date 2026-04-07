"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleService = void 0;
const prisma_1 = require("../repositories/prisma");
const errors_1 = require("../utils/errors");
const permission_service_1 = require("./permission.service");
class RoleService {
    static async createRole(name, description) {
        return prisma_1.prisma.role.create({
            data: { name, description },
        });
    }
    static async assignRoleToUser(userId, roleId) {
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new errors_1.NotFoundError('User not found');
        const role = await prisma_1.prisma.role.findUnique({ where: { id: roleId } });
        if (!role)
            throw new errors_1.NotFoundError('Role not found');
        const assigned = await prisma_1.prisma.userRole.create({
            data: { userId, roleId },
        });
        // Invalidate permission cache
        await permission_service_1.PermissionService.invalidateUserCache(userId);
        return assigned;
    }
}
exports.RoleService = RoleService;
