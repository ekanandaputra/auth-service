"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const prisma_1 = require("../repositories/prisma");
const errors_1 = require("../utils/errors");
class UserService {
    static async getUsers() {
        return prisma_1.prisma.user.findMany({
            select: { id: true, email: true, createdAt: true },
        });
    }
    static async getUserById(userId) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            include: {
                roles: { include: { role: true } },
                permissions: { include: { permission: true } }
            }
        });
        if (!user)
            throw new errors_1.NotFoundError('User not found');
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
}
exports.UserService = UserService;
