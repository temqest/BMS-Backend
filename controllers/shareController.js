const prisma = require("../util/db");
const crypto = require("crypto");

/**
 * Helper to generate a 6-digit PIN code (e.g., "491823")
 */
const generate6DigitPin = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Helper to compute gestational age weeks from LMP date
 */
const calculateGAWeeks = (lmpDate) => {
  if (!lmpDate) return 0;
  const lmp = new Date(lmpDate);
  if (isNaN(lmp.getTime())) return 0;
  const diffTime = new Date().getTime() - lmp.getTime();
  const weeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
  return Math.max(0, weeks);
};

/**
 * Helper to compute estimated due date from LMP date
 */
const calculateEDD = (lmpDate) => {
  if (!lmpDate) return null;
  const lmp = new Date(lmpDate);
  if (isNaN(lmp.getTime())) return null;
  return new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000);
};

/**
 * Get or create active Share Token & PIN for the authenticated mother
 * GET /api/v1/mother/share-token
 */
const getOrCreateMotherShareToken = async (req, res, next) => {
  try {
    const my_user_id = req.user?.user_id || req.user?.id;
    let targetMotherId = req.query.mother_id;

    if (!targetMotherId) {
      const motherRec = await prisma.mother.findUnique({
        where: { user_id: my_user_id },
      });
      if (!motherRec) {
        return res.status(404).json({ error: "Mother profile not found for this user" });
      }
      targetMotherId = motherRec.mother_id;
    }

    // Find existing active share link
    let shareLink = await prisma.mother_Share_Link.findFirst({
      where: {
        mother_id: targetMotherId,
        is_active: true,
      },
      orderBy: { created_at: "desc" },
    });

    // If none exists, create a new one
    if (!shareLink) {
      const pin = generate6DigitPin();
      const token = crypto.randomUUID();
      shareLink = await prisma.mother_Share_Link.create({
        data: {
          mother_id: targetMotherId,
          share_token: token,
          pin_code: pin,
          is_active: true,
        },
      });
    }

    const siteUrl = process.env.SITE_URL || "http://localhost:5173";
    const webUrl = `${siteUrl}/shared-journey/${shareLink.share_token}`;

    return res.status(200).json({
      message: "Share token retrieved successfully",
      data: {
        share_id: shareLink.share_id,
        share_token: shareLink.share_token,
        pin_code: shareLink.pin_code,
        web_url: webUrl,
        short_url: `${siteUrl}/m/${shareLink.share_token}`,
        is_active: shareLink.is_active,
        created_at: shareLink.created_at,
        expires_at: shareLink.expires_at,
        access_count: shareLink.access_count,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Regenerate / Reset Share Token & PIN
 * POST /api/v1/mother/share-token/regenerate
 */
const regenerateShareToken = async (req, res, next) => {
  try {
    const my_user_id = req.user?.user_id || req.user?.id;
    let targetMotherId = req.body.mother_id;

    if (!targetMotherId) {
      const motherRec = await prisma.mother.findUnique({
        where: { user_id: my_user_id },
      });
      if (!motherRec) {
        return res.status(404).json({ error: "Mother profile not found for this user" });
      }
      targetMotherId = motherRec.mother_id;
    }

    // Deactivate all existing links
    await prisma.mother_Share_Link.updateMany({
      where: { mother_id: targetMotherId, is_active: true },
      data: { is_active: false },
    });

    // Create fresh link with new PIN and token
    const pin = generate6DigitPin();
    const token = crypto.randomUUID();
    const newShareLink = await prisma.mother_Share_Link.create({
      data: {
        mother_id: targetMotherId,
        share_token: token,
        pin_code: pin,
        is_active: true,
      },
    });

    const siteUrl = process.env.SITE_URL || "http://localhost:5173";
    const webUrl = `${siteUrl}/shared-journey/${newShareLink.share_token}`;

    return res.status(200).json({
      message: "New share PIN and link generated successfully",
      data: {
        share_id: newShareLink.share_id,
        share_token: newShareLink.share_token,
        pin_code: newShareLink.pin_code,
        web_url: webUrl,
        short_url: `${siteUrl}/m/${newShareLink.share_token}`,
        is_active: newShareLink.is_active,
        created_at: newShareLink.created_at,
        expires_at: newShareLink.expires_at,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Public Web View Endpoint for Clinicians
 * GET /api/v1/mother/shared/:token
 */
const getPublicSharedJourney = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { pin } = req.query;

    console.log(`[ShareController] 📥 Inbound public journey request: token="${token}", pin="${pin || ""}"`);

    if (!token) {
      return res.status(400).json({ error: "Share token is required" });
    }

    // Find active share link
    const shareLink = await prisma.mother_Share_Link.findFirst({
      where: {
        OR: [
          { share_token: token },
          { share_id: token },
        ],
        is_active: true,
      },
      include: {
        mother: {
          include: {
            user: {
              include: {
                facility: true,
              },
            },
          },
        },
      },
    });

    if (!shareLink || !shareLink.mother) {
      console.warn(`[ShareController] ❌ Share link not found or inactive for token: ${token}`);
      return res.status(404).json({
        error: "This pregnancy share link is invalid, inactive, or has expired.",
      });
    }

    const mother = shareLink.mother;
    const user = mother.user;

    // Build masked initial info for PIN lock screen
    const rawName = user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() : "Patient";
    const maskedName = user?.first_name ? `${user.first_name.charAt(0)}. ${user.last_name || ""}` : "Protected Record";

    // 1. PIN Gate Verification Check
    const providedPin = (pin || "").toString().trim();
    const isPinMatch = providedPin === shareLink.pin_code.toString().trim();
    console.log(`[ShareController] 🔐 PIN check: provided="${providedPin}", expected="${shareLink.pin_code}", match=${isPinMatch}`);

    if (!isPinMatch) {
      return res.status(200).json({
        message: "PIN verification required",
        data: {
          isPinRequired: true,
          isPinVerified: false,
          pinError: providedPin ? "Invalid 6-digit security PIN. Please request the current code from the mother." : null,
          patient_preview: {
            initials: maskedName,
            facility_name: user?.facility?.facility_name || "Community Health Center",
            created_at: shareLink.created_at,
          },
        },
      });
    }

    // 2. PIN is Valid - Record access metrics
    console.log(`[ShareController] ✅ PIN verified! Fetching composite pregnancy records for mother: ${mother.mother_id}`);
    await prisma.mother_Share_Link.update({
      where: { share_id: shareLink.share_id },
      data: {
        last_accessed_at: new Date(),
        access_count: { increment: 1 },
      },
    });

    // 3. Fetch composite pregnancy records in parallel (optimized for PgBouncer & speed)
    const targetMotherId = mother.mother_id;
    const [fullMother, pregnancies, prenatalVisits, labScreenings, supplements, deliveryOutcomes, referrals] = await Promise.all([
      prisma.mother.findUnique({
        where: { mother_id: targetMotherId },
        include: {
          user: {
            include: {
              facility: true,
            },
          },
        },
      }),
      prisma.pregnancy.findMany({
        where: { mother_id: targetMotherId },
        orderBy: { date_of_registration: "desc" },
      }),
      prisma.prenatalVisit.findMany({
        where: { pregnancy: { mother_id: targetMotherId } },
        orderBy: { visit_date: "desc" },
        include: {
          healthWorker: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              role: true,
              facility: {
                select: {
                  facility_id: true,
                  facility_name: true,
                  type: true,
                },
              },
            },
          },
        },
      }),
      prisma.lab_Screening.findMany({
        where: { pregnancy: { mother_id: targetMotherId } },
        orderBy: { date_of_screening: "desc" },
      }),
      prisma.supplementation_Record.findMany({
        where: { pregnancy: { mother_id: targetMotherId } },
        orderBy: { date_given: "desc" },
      }),
      prisma.delivery_Outcome.findMany({
        where: { pregnancy: { mother_id: targetMotherId } },
        orderBy: { delivery_date: "desc" },
        include: {
          newbornRecords: true,
          postpartumVisits: {
            orderBy: { visit_date: "desc" },
          },
        },
      }),
      prisma.online_Referral.findMany({
        where: { pregnancy: { mother_id: targetMotherId } },
        orderBy: { date_referred: "desc" },
        include: {
          fromFacility: true,
          toFacility: true,
        },
      }),
    ]);

    const activePregnancy = pregnancies.find((p) => (p.pregnancy_status || "").toLowerCase() === "active") || pregnancies[0] || null;
    const latestVisit = prenatalVisits[0] || null;

    const gaWeeks = activePregnancy?.lmp_date ? calculateGAWeeks(activePregnancy.lmp_date) : (latestVisit?.age_of_gestation_weeks || 0);
    const eddDate = activePregnancy?.lmp_date ? calculateEDD(activePregnancy.lmp_date) : null;

    // Assemble comprehensive shared payload
    const responsePayload = {
      isPinRequired: true,
      isPinVerified: true,
      patient: {
        mother_id: fullMother.mother_id,
        user_id: user?.user_id,
        name: rawName,
        first_name: user?.first_name,
        middle_name: user?.middle_name,
        last_name: user?.last_name,
        birth_date: fullMother.birth_date,
        age: fullMother.age,
        blood_type: fullMother.blood_type,
        civil_status: fullMother.civil_status,
        phone_number: user?.phone_number,
        email: user?.email,
        address: user?.address,
        profile_url: user?.profile_url,
        family_serial_no: fullMother.family_serial_no,
        primary_facility: user?.facility ? {
          facility_id: user.facility.facility_id,
          facility_name: user.facility.facility_name,
          address: user.facility.address,
          contact_number: user.facility.contact_number,
          email: user.facility.email,
          type: user.facility.type,
        } : null,
      },
      current_pregnancy: activePregnancy ? {
        pregnancy_id: activePregnancy.pregnancy_id,
        date_of_registration: activePregnancy.date_of_registration,
        lmp_date: activePregnancy.lmp_date,
        edd: eddDate,
        gestational_age_weeks: gaWeeks,
        gravida: activePregnancy.gravida,
        parity: activePregnancy.parity,
        pregnancy_status: activePregnancy.pregnancy_status,
        previous_delivery_history: activePregnancy.previous_delivery_history,
        co_morbidities: activePregnancy.co_morbidities,
        age_group: activePregnancy.age_group,
        bmi_1st_trimester: activePregnancy.bmi_1st_trimester,
        bmi_category: activePregnancy.bmi_category,
        deworming_given: activePregnancy.deworming_given,
        deworming_date: activePregnancy.deworming_date,
        latest_vitals: latestVisit ? {
          visit_date: latestVisit.visit_date,
          gestational_age_weeks: latestVisit.age_of_gestation_weeks,
          bp: `${latestVisit.bp_systolic}/${latestVisit.bp_diastolic}`,
          bp_systolic: latestVisit.bp_systolic,
          bp_diastolic: latestVisit.bp_diastolic,
          pulse_rate: latestVisit.pulse_rate_bpm,
          temp: latestVisit.temperature_celsius,
          weight_kg: latestVisit.weight_kg,
          fundic_height: latestVisit.fundic_height_cm,
          fetal_heart_tone: latestVisit.fetal_heart_tone_bpm,
          risk_level: latestVisit.risk_level_assessed,
          danger_signs: latestVisit.danger_signs_observed,
          chief_complaint: latestVisit.chief_complaint,
        } : null,
      } : null,
      all_pregnancies: pregnancies,
      prenatal_visits: allVisits,
      lab_screenings: allLabScreenings,
      supplements: allSupplements,
      delivery_outcomes: allDeliveries,
      referrals: allReferrals,
      share_metadata: {
        share_id: shareLink.share_id,
        created_at: shareLink.created_at,
        last_accessed_at: new Date(),
        access_count: shareLink.access_count + 1,
      },
    };

    return res.status(200).json({
      message: "Pregnancy Journey records retrieved successfully",
      data: responsePayload,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getOrCreateMotherShareToken,
  regenerateShareToken,
  getPublicSharedJourney,
};
