"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jwt_1 = require("../utils/jwt");
const errors_1 = require("../utils/errors");
const redis_1 = require("../config/redis");
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            throw new errors_1.UnauthorizedError('Missing or invalid token');
        }
        const token = authHeader.split(' ')[1];
        // Check if token is blacklisted in Redis
        if (redis_1.redisClient) {
            const isBlacklisted = await redis_1.redisClient.get(`blacklist:${token}`);
            if (isBlacklisted) {
                throw new errors_1.UnauthorizedError('Token is expired/invalidated');
            }
        }
        const payload = (0, jwt_1.verifyAccessToken)(token);
        req.userId = payload.userId;
        next();
    }
    catch (error) {
        next(new errors_1.UnauthorizedError('Invalid or expired token'));
    }
};
exports.authMiddleware = authMiddleware;
