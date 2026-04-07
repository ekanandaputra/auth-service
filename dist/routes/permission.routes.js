"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const permission_controller_1 = require("../controllers/permission.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const permission_middleware_1 = require("../middlewares/permission.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware);
/**
 * @swagger
 * /api/permissions:
 *   post:
 *     summary: Create a new permission
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Permission created
 */
router.post('/', (0, permission_middleware_1.requirePermission)('manage_permissions'), permission_controller_1.PermissionController.create);
/**
 * @swagger
 * /api/permissions/assign-role:
 *   post:
 *     summary: Assign permission to a role
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roleId
 *               - permissionId
 *             properties:
 *               roleId:
 *                 type: integer
 *               permissionId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Permission assigned to role
 */
router.post('/assign-role', (0, permission_middleware_1.requirePermission)('manage_permissions'), permission_controller_1.PermissionController.assignToRole);
/**
 * @swagger
 * /api/permissions/assign-user:
 *   post:
 *     summary: Assign direct permission override to a user
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - permissionId
 *               - isAllowed
 *             properties:
 *               userId:
 *                 type: integer
 *               permissionId:
 *                 type: integer
 *               isAllowed:
 *                 type: boolean
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Permission override assigned
 */
router.post('/assign-user', (0, permission_middleware_1.requirePermission)('manage_permissions'), permission_controller_1.PermissionController.assignToUser);
/**
 * @swagger
 * /api/permissions/remove-user:
 *   delete:
 *     summary: Remove direct permission override from user
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - permissionId
 *             properties:
 *               userId:
 *                 type: integer
 *               permissionId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Override removed
 */
router.delete('/remove-user', (0, permission_middleware_1.requirePermission)('manage_permissions'), permission_controller_1.PermissionController.removeUserPermission);
exports.default = router;
