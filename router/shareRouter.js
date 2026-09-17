const express = require("express");
const router = express.Router();
const {
  getOrCreateMotherShareToken,
  regenerateShareToken,
  getPublicSharedJourney,
} = require("../controllers/shareController");
const { verifyToken, checkUserRole } = require("../middleware/authMiddleware");

const limit = require("../middleware/rateLimmiter");

const authorizedRoles = ["SystemAdmin", "Admin", "Doctor", "HealthWorker", "Nurse", "Midwife", "Staff", "Mother"];

// Public shared pregnancy journey endpoint (No Auth, PIN verified with rate limiting)
router.get("/shared/:token", limit.otpLimiter, getPublicSharedJourney);

// Authenticated endpoints for mother to manage her share token & PIN
router.get("/share-token", verifyToken, checkUserRole(authorizedRoles), getOrCreateMotherShareToken);
router.post("/share-token/regenerate", verifyToken, checkUserRole(authorizedRoles), regenerateShareToken);

module.exports = router;
