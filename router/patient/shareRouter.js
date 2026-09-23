const express = require("express");
const router = express.Router();
const {
  getOrCreateMotherShareToken,
  regenerateShareToken,
  getPublicSharedJourney,
} = require("../../controllers/patient/shareController");
const { verifyToken, checkUserRole } = require("../../middleware/authMiddleware");

const limit = require("../../middleware/rateLimmiter");

const authorizedRoles = ["SystemAdmin", "Admin", "Doctor", "HealthWorker", "Nurse", "Midwife", "Staff", "Mother"];

router.get("/shared/:token", limit.otpLimiter, getPublicSharedJourney);

router.get("/share-token", verifyToken, checkUserRole(authorizedRoles), getOrCreateMotherShareToken);

router.post("/share-token/regenerate", verifyToken, checkUserRole(authorizedRoles), regenerateShareToken);

module.exports = router;
