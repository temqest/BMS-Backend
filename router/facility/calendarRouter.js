const express = require('express');
const router = express.Router();
const { verifyToken, checkUserRole, ensureFacilityAccess } = require('../../middleware/authMiddleware');
const {
    create_appointment_slots,
    update_appointment_slots,
    delete_appointment_slots,
    get_facility_schedules,
    get_schedule_by_id,
    save_facility_closed_date,
    get_facility_closed_dates,
    delete_facility_closed_date,
} = require('../../controllers/facility/calendarController');

const adminRoles = ['SystemAdmin', 'Admin', 'SuperAdmin'];
const allRoles = ['SystemAdmin', 'Admin', 'Doctor', 'HealthWorker', 'Nurse', 'Midwife', 'Staff', 'Mother'];

router.post('/slots', verifyToken, checkUserRole(adminRoles), ensureFacilityAccess('facility_id'), create_appointment_slots);

router.put('/slots', verifyToken, checkUserRole(adminRoles), ensureFacilityAccess('facility_id'), update_appointment_slots);

router.delete('/slots/:schedule_id', verifyToken, checkUserRole(adminRoles), delete_appointment_slots);

router.get('/facility/:facility_id/closed-dates', verifyToken, checkUserRole(allRoles), get_facility_closed_dates);

router.post('/facility/:facility_id/closed-dates', verifyToken, checkUserRole(adminRoles), ensureFacilityAccess('facility_id'), save_facility_closed_date);

router.delete('/facility/:facility_id/closed-dates/:schedule_id', verifyToken, checkUserRole(adminRoles), ensureFacilityAccess('facility_id'), delete_facility_closed_date);

router.delete('/facility/:facility_id/closed-dates', verifyToken, checkUserRole(adminRoles), ensureFacilityAccess('facility_id'), delete_facility_closed_date);

router.get('/facility/:facility_id', verifyToken, checkUserRole(allRoles), get_facility_schedules);

router.get('/slots/:schedule_id', verifyToken, checkUserRole(allRoles), get_schedule_by_id);

module.exports = router;



