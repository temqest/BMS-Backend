const express = require('express');
const router = express.Router();
const { verifyToken, checkUserRole } = require('../middleware/authMiddleware');
const { registerPrenatalVisit, updatePrenatalVisit, deletePrenatalVisit, getAllPrenatalVisits, getPrentalVisitByPregnancy, getAllPrenatalVisitsByMother, getAllPrenatalVisitsByHealthWorker, getAllPrenatalVisitByFacility, getPrenatalVisitById } = require('../controllers/prenatalVisitController');

const staffRoles = ['SystemAdmin', 'Admin', 'HealthWorker', 'Nurse', 'Midwife'];

router.post('/register', verifyToken, checkUserRole(staffRoles), registerPrenatalVisit);

router.put('/update/:visit_id', verifyToken, checkUserRole(staffRoles), updatePrenatalVisit);

router.delete('/delete/:visit_id', verifyToken, checkUserRole(staffRoles), deletePrenatalVisit);

router.get('/all', verifyToken, checkUserRole(staffRoles), getAllPrenatalVisits);

router.get('/pregnancy/:pregnancy_id', verifyToken, checkUserRole(staffRoles), getPrentalVisitByPregnancy);

router.get('/mother/:mother_id', verifyToken, checkUserRole(staffRoles), getAllPrenatalVisitsByMother);

router.get('/health-worker/:health_worker_id', verifyToken, checkUserRole(staffRoles), getAllPrenatalVisitsByHealthWorker);

router.get('/facility/:facility_id', verifyToken, checkUserRole(staffRoles), getAllPrenatalVisitByFacility);

router.get('/visit/:visit_id', verifyToken, checkUserRole(staffRoles), getPrenatalVisitById);

module.exports = router;