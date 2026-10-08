const express = require('express');
const router = express.Router();
const { resolveSyncConflict, inspectConflict } = require('../../controllers/sync/syncController');
const { verifyToken, checkUserRole } = require('../../middleware/authMiddleware');

const staffRoles = ['SystemAdmin', 'Admin', 'Doctor', 'HealthWorker', 'Nurse', 'Midwife', 'Staff'];

router.post('/resolve-conflict', verifyToken, checkUserRole(staffRoles), resolveSyncConflict);
router.post('/inspect/:modelName/:recordId', verifyToken, checkUserRole(staffRoles), inspectConflict);

module.exports = router;
