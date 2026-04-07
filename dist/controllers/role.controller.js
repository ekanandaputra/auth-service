"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleController = void 0;
const role_service_1 = require("../services/role.service");
class RoleController {
    static async create(req, res, next) {
        try {
            const { name, description } = req.body;
            const role = await role_service_1.RoleService.createRole(name, description);
            res.status(201).json({ success: true, data: role });
        }
        catch (err) {
            next(err);
        }
    }
    static async assign(req, res, next) {
        try {
            const { userId, roleId } = req.body;
            const assigned = await role_service_1.RoleService.assignRoleToUser(userId, roleId);
            res.status(200).json({ success: true, data: assigned });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.RoleController = RoleController;
