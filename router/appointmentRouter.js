const express = require('express');
const router = express.Router();
const {
    createAppointment,
    getAllAppointments,
    getAppointmentById,
    getAppointmentsByUser,
    getAppointmentsByFacility,
    updateAppointment,
    cancelAppointment,
    deleteAppointment,
} = require('../controllers/appointmentController');
const { verifyToken, checkUserRole } = require('../middleware/authMiddleware');

const clinicalStaffRoles = ['SystemAdmin', 'Admin', 'Doctor', 'HealthWorker', 'Nurse', 'Midwife', 'Staff'];
const allowedRoles = ['SystemAdmin', 'Admin', 'Doctor', 'HealthWorker', 'Nurse', 'Midwife', 'Staff', 'Mother'];

router.post('/register', verifyToken, checkUserRole(allowedRoles), createAppointment);

router.put('/update/:appointment_id', verifyToken, checkUserRole(allowedRoles), updateAppointment);

router.put('/cancel/:appointment_id', verifyToken, checkUserRole(allowedRoles), cancelAppointment);

router.delete('/delete/:appointment_id', verifyToken, checkUserRole(clinicalStaffRoles), deleteAppointment);

router.get('/get/:appointment_id', verifyToken, checkUserRole(allowedRoles), getAppointmentById);

router.get('/get/user/:user_id', verifyToken, checkUserRole(allowedRoles), getAppointmentsByUser);

router.get('/get/facility/:facility_id', verifyToken, checkUserRole(clinicalStaffRoles), getAppointmentsByFacility);

router.get('/getAll', verifyToken, checkUserRole(clinicalStaffRoles), getAllAppointments);

module.exports = router;
