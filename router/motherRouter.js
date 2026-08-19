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
const { verifyToken, checkUserRole } = require("../middleware/authMiddleware");

const sysAdminOnly = ['SystemAdmin'];
const staffRoles = ['SystemAdmin', 'Admin', 'HealthWorker', 'Nurse', 'Midwife'];
const allUserRoles = ['SystemAdmin', 'Admin', 'HealthWorker', 'Nurse', 'Midwife', 'Mother'];
const motherOnly = ['Mother'];

router.get('/all', verifyToken, checkUserRole(staffRoles), getAllMother);
router.get('/active', verifyToken, checkUserRole(staffRoles), getAllActiveMother);
router.get('/active/:facility_id', verifyToken, checkUserRole(staffRoles), getAllActiveMotherByFacility);
router.get('/get/:mother_id', verifyToken, checkUserRole(staffRoles), searchMotherByID);
router.get('/search/:mother_id', verifyToken, checkUserRole(staffRoles), searchMotherByID);

router.post('/register', verifyToken, checkUserRole(staffRoles), registerMother);
router.post('/self-register', selfRegisterMother);

router.put('/update/:mother_id', verifyToken, checkUserRole(staffRoles), updateMother);
router.put('/deactivate/:mother_id', verifyToken, checkUserRole(staffRoles), softDeleteMother);
router.delete('/delete/:mother_id', verifyToken, checkUserRole(sysAdminOnly), hardDeleteMother);

router.get('/profile', verifyToken, checkUserRole(allUserRoles), getProfile);
router.put('/profile/update', verifyToken, checkUserRole(motherOnly), updateMyProfile);

module.exports = router;
