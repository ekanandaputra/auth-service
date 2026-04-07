"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const prisma_1 = require("../repositories/prisma");
const password_1 = require("../utils/password");
const jwt_1 = require("../utils/jwt");
const errors_1 = require("../utils/errors");
const redis_1 = require("../config/redis");
class AuthService {
    static async register(data) {
        const { email, password } = data;
        const existingUser = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new errors_1.BadRequestError('Email already in use');
        }
        const hashedPassword = await (0, password_1.hashPassword)(password);
        const user = await prisma_1.prisma.user.create({
            data: {
                email,
                password: hashedPassword,
            },
        });
        return { id: user.id, email: user.email };
    }
    static async login(data) {
        const { email, password } = data;
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new errors_1.UnauthorizedError('Invalid credentials');
        }
        const isValid = await (0, password_1.verifyPassword)(password, user.password);
        if (!isValid) {
            throw new errors_1.UnauthorizedError('Invalid credentials');
        }
        const payload = { userId: user.id };
        const accessToken = (0, jwt_1.signAccessToken)(payload);
        const refreshToken = (0, jwt_1.signRefreshToken)(payload);
        return {
            accessToken,
            refreshToken,
            user: { id: user.id, email: user.email },
        };
    }
    static async logout(accessToken) {
        if (!redis_1.redisClient)
            return true; // Can't blacklist without Redis
        // To properly blacklist, would decode token to find TTL, storing with matching EX
        // For simplicity, hardcode ~15 mins TTL
        await redis_1.redisClient.set(`blacklist:${accessToken}`, '1', 'EX', 15 * 60);
        return true;
    }
    static async refreshToken(oldRefreshToken) {
        try {
            const payload = (0, jwt_1.verifyRefreshToken)(oldRefreshToken);
            const user = await prisma_1.prisma.user.findUnique({ where: { id: payload.userId } });
            if (!user) {
                throw new errors_1.UnauthorizedError('User not found');
            }
            const newPayload = { userId: user.id };
            const newAccessToken = (0, jwt_1.signAccessToken)(newPayload);
            const newRefreshToken = (0, jwt_1.signRefreshToken)(newPayload);
            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            };
        }
        catch (e) {
            throw new errors_1.UnauthorizedError('Invalid or expired refresh token');
        }
    }
    static async validateToken(accessToken) {
        // Decoding is handled via middleware
        return true; // If reaches here via route, it's valid
    }
}
exports.AuthService = AuthService;
