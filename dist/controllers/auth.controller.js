"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const zod_1 = require("zod");
const auth_service_1 = require("../services/auth.service");
const errors_1 = require("../utils/errors");
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email({ message: 'Format email tidak valid. Harap masukkan email yang benar (contoh: nama@domain.com).' }),
    password: zod_1.z.string().min(1, { message: 'Password tidak boleh kosong.' }),
});
class AuthController {
    static async register(req, res, next) {
        try {
            const parsed = registerSchema.safeParse(req.body);
            if (!parsed.success) {
                throw new errors_1.BadRequestError(parsed.error.issues[0].message);
            }
            const user = await auth_service_1.AuthService.register(parsed.data);
            res.status(201).json({ success: true, data: user });
        }
        catch (err) {
            next(err);
        }
    }
    static async login(req, res, next) {
        try {
            const result = await auth_service_1.AuthService.login(req.body);
            res.status(200).json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    }
    static async logout(req, res, next) {
        try {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                await auth_service_1.AuthService.logout(token);
            }
            res.status(200).json({ success: true, message: 'Logged out successfully' });
        }
        catch (err) {
            next(err);
        }
    }
    static async refresh(req, res, next) {
        try {
            const { refreshToken } = req.body;
            const result = await auth_service_1.AuthService.refreshToken(refreshToken);
            res.status(200).json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    }
    static validateToken(req, res) {
        // If it reaches this controller, authMiddleware passed
        res.status(200).json({
            success: true,
            data: {
                userId: req.userId,
            },
        });
    }
}
exports.AuthController = AuthController;
