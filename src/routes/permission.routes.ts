import { Router } from 'express';
import { PermissionController } from '../controllers/permission.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/permission.middleware';

const router = Router();

router.use(authMiddleware);

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
router.post('/', requirePermission('manage_permissions'), PermissionController.create);

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
router.post('/assign-role', requirePermission('manage_permissions'), PermissionController.assignToRole);

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
router.post('/assign-user', requirePermission('manage_permissions'), PermissionController.assignToUser);

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
router.delete('/remove-user', requirePermission('manage_permissions'), PermissionController.removeUserPermission);

export default router;
