const express = require('express');
const router = express.Router();
const {verifyToken, checkUserRole} = require('../middleware/authMiddleware');
const {registerPrenatalVisit, updatePrenatalVisit, deletePrenatalVisit, getAllPrenatalVisits, getPrentalVisitByPregnancy, getAllPrenatalVisitsByMother, getAllPrenatalVisitsByHealthWorker, getAllPrenatalVisitByFacility, getPrenatalVisitById} = require('../controllers/prenatalVisitController');

router.post('/register', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Nurse', 'Midwife', 'health_worker']), registerPrenatalVisit);

router.put('/update/:visit_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Nurse', 'Midwife', 'health_worker']), updatePrenatalVisit);

router.delete('/delete/:visit_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Nurse', 'Midwife', 'health_worker']), deletePrenatalVisit);

router.get('/all', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Nurse', 'Midwife', 'health_worker']), getAllPrenatalVisits);

router.get('/pregnancy/:pregnancy_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Nurse', 'Midwife', 'health_worker']), getPrentalVisitByPregnancy);

router.get('/mother/:mother_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Nurse', 'Midwife', 'health_worker']), getAllPrenatalVisitsByMother);

router.get('/health-worker/:health_worker_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Nurse', 'Midwife', 'health_worker']), getAllPrenatalVisitsByHealthWorker);

router.get('/facility/:facility_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Nurse', 'Midwife', 'health_worker']), getAllPrenatalVisitByFacility);

router.get('/visit/:visit_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Nurse', 'Midwife', 'health_worker']), getPrenatalVisitById);

module.exports = router;