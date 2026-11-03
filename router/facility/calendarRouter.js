const express = require('express');
const router = express.Router();
const { verifyToken, checkUserRole } = require('../../middleware/authMiddleware');
const {
    create_appointment_slots,
    update_appointment_slots,
    delete_appointment_slots,
    get_facility_schedules,
    get_schedule_by_id
} = require('../../controllers/facility/calendarController');

const staffRoles = ['SystemAdmin', 'Admin', 'Doctor', 'HealthWorker', 'Nurse', 'Midwife', 'Staff'];
const allRoles = ['SystemAdmin', 'Admin', 'Doctor', 'HealthWorker', 'Nurse', 'Midwife', 'Staff', 'Mother'];

// Plot new appointment slots
router.post('/slots', verifyToken, checkUserRole(staffRoles), create_appointment_slots);

// Update appointment slots (capacity, time, availability)
router.put('/slots', verifyToken, checkUserRole(staffRoles), update_appointment_slots);

// Delete an unbooked appointment slot
router.delete('/slots/:schedule_id', verifyToken, checkUserRole(staffRoles), delete_appointment_slots);

// Fetch schedules for a specific facility (available to mothers and staff)
router.get('/facility/:facility_id', verifyToken, checkUserRole(allRoles), get_facility_schedules);

// Get single schedule details
router.get('/slots/:schedule_id', verifyToken, checkUserRole(allRoles), get_schedule_by_id);

module.exports = router;
