const express = require('express')
const router = express.Router()
const {verifyToken, checkUserRole} = require('../middleware/authMiddleware')
const {registerFacility, searchFacility, updateFacility, deleteFacility, viewAllFacility} = require('../controllers/facilityController')

router.post('/register', verifyToken, checkUserRole(['SystemAdmin']), registerFacility);

router.get('/search', searchFacility);

router.put('/update', verifyToken, checkUserRole(['Admin', 'SystemAdmin']), updateFacility);

router.delete('/delete', verifyToken, checkUserRole(['SystemAdmin']), deleteFacility);

router.get('/getAll', verifyToken, checkUserRole(['SystemAdmin']), viewAllFacility);

module.exports = router;