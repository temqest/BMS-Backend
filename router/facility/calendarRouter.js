const express = require('express');
const router = express.Router();
const { verifyToken, checkUserRole, ensureFacilityAccess } = require('../../middleware/authMiddleware');
const {
    create_appointment_slots,
    update_appointment_slots,
    delete_appointment_slots,
    get_facility_schedules,
    get_schedule_by_id
} = require('../../controllers/facility/calendarController');

const staffRoles = ['SystemAdmin', 'Admin', 'Doctor', 'HealthWorker', 'Nurse', 'Midwife', 'Staff'];
const allRoles = ['SystemAdmin', 'Admin', 'Doctor', 'HealthWorker', 'Nurse', 'Midwife', 'Staff', 'Mother'];

router.post('/slots', verifyToken, checkUserRole(staffRoles), ensureFacilityAccess('facility_id'), create_appointment_slots);

router.put('/slots', verifyToken, checkUserRole(staffRoles), ensureFacilityAccess('facility_id'), update_appointment_slots);

router.delete('/slots/:schedule_id', verifyToken, checkUserRole(staffRoles), delete_appointment_slots);

router.get('/facility/:facility_id', verifyToken, checkUserRole(allRoles), get_facility_schedules);

router.get('/slots/:schedule_id', verifyToken, checkUserRole(allRoles), get_schedule_by_id);

module.exports = router;


