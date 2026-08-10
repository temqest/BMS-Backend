const express = require('express');
const router = express.Router();
const {
    createAuditTrail,
    getAllAuditLogs,
    getAllAuditLogsByUser,
    getAuditLogByTable
} = require('../controllers/auditTrailController');
const { verifyToken, checkUserRole } = require('../middleware/authMiddleware');

const adminRolesOnly = ['SystemAdmin', 'Admin'];
const allUserRoles = ['SystemAdmin', 'Admin', 'HealthWorker', 'Nurse', 'Midwife', 'Mother'];

router.post('/create', verifyToken, checkUserRole(allUserRoles), createAuditTrail);

router.get('/getAll', verifyToken, checkUserRole(adminRolesOnly), getAllAuditLogs);

router.get('/user/:user_id', verifyToken, checkUserRole(adminRolesOnly), getAllAuditLogsByUser);

router.get('/table/:table_name', verifyToken, checkUserRole(adminRolesOnly), getAuditLogByTable);

module.exports = router;
