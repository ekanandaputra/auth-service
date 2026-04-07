"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionController = void 0;
const admin_permission_service_1 = require("../services/admin-permission.service");
class PermissionController {
    static async create(req, res, next) {
        try {
            const { name, description } = req.body;
            const permission = await admin_permission_service_1.AdminPermissionService.createPermission(name, description);
            res.status(201).json({ success: true, data: permission });
        }
        catch (err) {
            next(err);
        }
    }
    static async assignToRole(req, res, next) {
        try {
            const { roleId, permissionId } = req.body;
            const assigned = await admin_permission_service_1.AdminPermissionService.assignPermissionToRole(roleId, permissionId);
            res.status(200).json({ success: true, data: assigned });
        }
        catch (err) {
            next(err);
        }
    }
    static async assignToUser(req, res, next) {
        try {
            const { userId, permissionId, isAllowed, expiresAt } = req.body;
            // expiresAt should be a Date string or null
            const parsedExpiresAt = expiresAt ? new Date(expiresAt) : undefined;
            const override = await admin_permission_service_1.AdminPermissionService.assignPermissionToUser(userId, permissionId, isAllowed, parsedExpiresAt);
            res.status(200).json({ success: true, data: override });
        }
        catch (err) {
            next(err);
        }
    }
    static async removeUserPermission(req, res, next) {
        try {
            const { userId, permissionId } = req.body;
            await admin_permission_service_1.AdminPermissionService.removeUserPermission(userId, permissionId);
            res.status(200).json({ success: true, message: 'Permission override removed' });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.PermissionController = PermissionController;
