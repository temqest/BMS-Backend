const express = require("express");
const router = express.Router();
const {
    getAllMother, 
    getAllActiveMother, 
    searchMotherByID, 
    getAllActiveMotherByFacility,
    registerMother,
    selfRegisterMother,
    updateMother,
    softDeleteMother,
    hardDeleteMother,
    getProfile,
    updateMyProfile
} = require("../controllers/motherController");
const {verifyToken, checkUserRole} = require("../middleware/authMiddleware");

router.get('/all', verifyToken, checkUserRole(['SystemAdmin']), getAllMother);
router.get('/active', verifyToken, checkUserRole(['SystemAdmin']), getAllActiveMother);
router.get('/active/:facility_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin','HealthWorker', 'Nurse', 'Midwife']), getAllActiveMotherByFacility);
router.get('/search/:mother_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'HealthWorker', 'Nurse', 'Midwife']), searchMotherByID);

router.post('/register', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'HealthWorker', 'Nurse', 'Midwife']), registerMother);

router.post('/self-register', selfRegisterMother);

router.put('/update/:mother_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'HealthWorker', 'Nurse', 'Midwife']), updateMother);

router.put('/deactivate/:mother_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'HealthWorker', 'Nurse', 'Midwife']), softDeleteMother);

router.delete('/delete/:mother_id', verifyToken, checkUserRole(['SystemAdmin']), hardDeleteMother);

router.get('/profile', verifyToken, checkUserRole(['Mother', 'SystemAdmin', 'Admin', 'HealthWorker', 'Nurse', 'Midwife']), getProfile);
router.put('/profile/update', verifyToken, checkUserRole(['Mother']), updateMyProfile);

module.exports = router;
