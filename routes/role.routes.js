const express = require('express');
const router = express.Router();
const roleController = require('../controller/role.controller');
const authMiddleware  = require('../middleware/auth.middleware');

router.post('/create-role',authMiddleware,roleController.createRole);
router.post("/:userId/role/:roleId", authMiddleware, roleController.assignRoleToUser);
router.post("/:roleId/bucket/:bucketId", authMiddleware, roleController.assignBucketToRole);
router.get('/list-roles',authMiddleware,roleController.getAllRoles);

module.exports = router;