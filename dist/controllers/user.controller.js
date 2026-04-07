"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const user_service_1 = require("../services/user.service");
class UserController {
    static async getAll(req, res, next) {
        try {
            const users = await user_service_1.UserService.getUsers();
            res.status(200).json({ success: true, data: users });
        }
        catch (err) {
            next(err);
        }
    }
    static async getById(req, res, next) {
        try {
            const userId = req.params.id;
            const user = await user_service_1.UserService.getUserById(userId);
            res.status(200).json({ success: true, data: user });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.UserController = UserController;
