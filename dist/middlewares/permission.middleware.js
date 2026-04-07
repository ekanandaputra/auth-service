"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermission = void 0;
const permission_service_1 = require("../services/permission.service");
const errors_1 = require("../utils/errors");
const requirePermission = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            const userId = req.userId;
            if (!userId) {
                throw new errors_1.UnauthorizedError('User not authenticated');
            }
            const hasPerm = await permission_service_1.PermissionService.hasPermission(userId, requiredPermission);
            if (!hasPerm) {
                throw new errors_1.ForbiddenError(`Missing required permission: ${requiredPermission}`);
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.requirePermission = requirePermission;
