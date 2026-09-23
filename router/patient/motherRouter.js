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
    updateMyProfile,
    uploadAvatar,
    assignFacilityByCode,
    getCompositeMotherProfile,
    enrollMotherInFacility,
    getMotherFacilities,
    assignStaffToMother
} = require("../../controllers/patient/motherController");
const { verifyToken, checkUserRole } = require("../../middleware/authMiddleware");
const { upload } = require("../../util/storage");

const sysAdminOnly = ['SystemAdmin'];
const adminRoles = ['SystemAdmin', 'Admin'];
const staffRoles = ['SystemAdmin', 'Admin', 'Doctor', 'HealthWorker', 'Nurse', 'Midwife', 'Staff'];
const allUserRoles = ['SystemAdmin', 'Admin', 'Doctor', 'HealthWorker', 'Nurse', 'Midwife', 'Staff', 'Mother'];
const motherOnly = ['Mother'];

router.get('/all', verifyToken, checkUserRole(staffRoles), getAllMother);
router.get('/active', verifyToken, checkUserRole(staffRoles), getAllActiveMother);
router.get('/active/:facility_id', verifyToken, checkUserRole(staffRoles), getAllActiveMotherByFacility);
router.get('/composite/:mother_id', verifyToken, checkUserRole(staffRoles), getCompositeMotherProfile);
router.get('/get/:mother_id', verifyToken, checkUserRole(staffRoles), searchMotherByID);
router.get('/search/:mother_id', verifyToken, checkUserRole(staffRoles), searchMotherByID);
router.get('/:mother_id/facilities', verifyToken, checkUserRole(staffRoles), getMotherFacilities);

router.post('/register', verifyToken, checkUserRole(staffRoles), registerMother);
router.post('/enroll', verifyToken, checkUserRole(staffRoles), enrollMotherInFacility);
router.post('/self-register', selfRegisterMother);
router.post('/assign-facility', verifyToken, checkUserRole(staffRoles), assignFacilityByCode);
router.post('/avatar/upload', verifyToken, checkUserRole(allUserRoles), upload.single('file'), uploadAvatar);

router.put('/assign-staff/:mother_id', verifyToken, checkUserRole(adminRoles), assignStaffToMother);
router.put('/:mother_id/assign-staff', verifyToken, checkUserRole(adminRoles), assignStaffToMother);
router.put('/update/:mother_id', verifyToken, checkUserRole(staffRoles), updateMother);
router.put('/deactivate/:mother_id', verifyToken, checkUserRole(staffRoles), softDeleteMother);
router.delete('/delete/soft/:mother_id', verifyToken, checkUserRole(staffRoles), softDeleteMother);
router.delete('/delete/:mother_id', verifyToken, checkUserRole(sysAdminOnly), hardDeleteMother);

router.get('/profile', verifyToken, checkUserRole(allUserRoles), getProfile);
router.put('/profile/update', verifyToken, checkUserRole(allUserRoles), updateMyProfile);

module.exports = router;
