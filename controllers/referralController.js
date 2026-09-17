const prisma = require('../util/db');
const validate = require('../util/validation');
const crypto = require('crypto');
const { updateWithMVCC } = require('../services/conflicResolution');

const generatePin = {

    async generateUniquePin() {
        const pin = Math.floor(100000 + Math.random() * 900000);
        const existingPin = await prisma.online_Referral.findFirst({
            where: { shared_pin: pin.toString() },
        });
        if (existingPin) {
            return this.generateUniquePin();
        }
        return pin.toString();
    },

};

const createSecuredLink = {

    async generateLink() {

        const SITE_URL = process.env.SITE_URL || "http://localhost:5173";
        const unique_id = crypto.randomUUID();

        return `${SITE_URL}/referral/${unique_id}`;
    },
};

const createReferral = async (req, res, next) => {
    try {
        const {
            pregnancy_id,
            from_facility_id,
            to_facility_id,
            external_facility_name,
            reason,
        } = req.body;

        if (!pregnancy_id || !from_facility_id || !reason) {
            return res.status(400).json({ error: "Missing Required Fields!" });
        }

        if (!to_facility_id && !external_facility_name) {
            return res.status(400).json({ error: "Either a destination facility or external facility name must be provided." });
        }

        if (req.user?.role !== 'SystemAdmin' && from_facility_id !== req.user?.facility_id) {
            return res.status(403).json({ error: "Access Denied. Referrals must originate from your facility." });
        }

        const [pregnancy, fromFacility, toFacility] = await Promise.all([
            prisma.pregnancy.findUnique({ where: { pregnancy_id } }),
            prisma.facility.findUnique({ where: { facility_id: from_facility_id } }),
            to_facility_id ? prisma.facility.findUnique({ where: { facility_id: to_facility_id } }) : Promise.resolve(true),
        ]);

        if (!pregnancy) {
            return res.status(404).json({ error: "Pregnancy Record Doesn't Exist" });
        }
        if (!fromFacility) {
            return res.status(404).json({ error: "Origin Facility Doesn't Exist" });
        }
        if (to_facility_id && !toFacility) {
            return res.status(404).json({ error: "Destination Facility Doesn't Exist" });
        }

        const secure_link = await createSecuredLink.generateLink();
        const shared_pin = await generatePin.generateUniquePin();

        const newReferral = await prisma.online_Referral.create({
            data: {
                pregnancy_id: pregnancy_id,
                from_facility_id: from_facility_id,
                to_facility_id: to_facility_id ? to_facility_id : null,
                external_facility_name: external_facility_name ? external_facility_name : null,
                reason: reason,
                secure_link: secure_link,
                shared_pin: shared_pin,
            },
        });

        return res.status(201).json({
            message: "Referral Successfully Created",
            data: newReferral,
        });

    } catch (error) {
        return next(error);
    }
};

const getAllReferrals = async (req, res, next) => {
    try {
        const facilityFilter = req.user?.role === 'SystemAdmin' ? {} : {
            OR: [
                { from_facility_id: req.user?.facility_id },
                { to_facility_id: req.user?.facility_id },
            ]
        };

        const referrals = await prisma.online_Referral.findMany({
            where: facilityFilter,
            include: {
                pregnancy: {
                    include: {
                        mother: {
                            include: {
                                user: true,
                            },
                        },
                        prenatalVisits: {
                            orderBy: { visit_date: 'desc' },
                            take: 1,
                        },
                        cdssAlerts: {
                            where: { is_resolved: false },
                            orderBy: { updated_at: 'desc' },
                        },
                    },
                },
                fromFacility: true,
                toFacility: true,
            },
            orderBy: { date_referred: 'desc' },
        });

        return res.status(200).json({
            message: "Referrals Retrieved Successfully",
            data: referrals,
        });

    } catch (error) {
        return next(error);
    }
};

const getReferralById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const referral = await prisma.online_Referral.findUnique({
            where: { referral_id: id },
            include: {
                pregnancy: {
                    include: {
                        mother: {
                            include: {
                                user: true,
                            },
                        },
                        prenatalVisits: {
                            orderBy: { visit_date: 'desc' },
                            take: 1,
                        },
                        cdssAlerts: {
                            where: { is_resolved: false },
                            orderBy: { updated_at: 'desc' },
                        },
                    },
                },
                fromFacility: true,
                toFacility: true,
            },
        });

        if (!referral) {
            return res.status(404).json({ error: "Referral Not Found!" });
        }

        return res.status(200).json({
            message: "Referral Details Retrieved Successfully",
            data: referral,
        });

    } catch (error) {
        return next(error);
    }
};

const updateReferral = async (req, res, next) => {
    try {
        const { referral_id } = req.params;
        const {
            pregnancy_id,
            from_facility_id,
            to_facility_id,
            external_facility_name,
            reason,
            status,
            is_completed,
        } = req.body;

        if (!referral_id) {
            return res.status(400).json({ error: "Missing Required Fields!" });
        }

        if (!(await validate.isOnlineReferralExist(referral_id))) {
            return res.status(404).json({ error: "Referral Doesn't Exist!" });
        }

        if (pregnancy_id && !(await validate.isPregnancyExist(pregnancy_id))) {
            return res.status(404).json({ error: "Pregnancy Record Doesn't Exist" });
        }

        if (from_facility_id && !(await validate.isFacilityExist(from_facility_id))) {
            return res.status(404).json({ error: "Origin Facility Doesn't Exist" });
        }

        if (to_facility_id && !(await validate.isFacilityExist(to_facility_id))) {
            return res.status(404).json({ error: "Destination Facility Doesn't Exist" });
        }

        const { strategy, version, ...clientData } = req.body;
        const mvccResult = await updateWithMVCC('online_Referral', referral_id, { version, ...clientData }, {
            strategy,
            userId: req.user?.user_id || req.user?.id
        });

        if (!mvccResult.resolved) {
            return res.status(409).json({
                error: "Conflict detected requiring manual review",
                details: mvccResult
            });
        }

        return res.status(200).json({
            message: "Referral Updated Successfully",
            data: mvccResult.record,
            strategyUsed: mvccResult.strategyUsed
        });

    } catch (error) {
        return next(error);
    }
};

const respondToReferral = async (req, res, next) => {
    try {
        const { referral_id } = req.params;
        const { status, response_notes, outcome, is_completed, strategy, version } = req.body;

        if (!referral_id || !status) {
            return res.status(400).json({ error: "Missing Required Fields!" });
        }

        const existingReferral = await prisma.online_Referral.findUnique({
            where: { referral_id: referral_id }
        });

        if (!existingReferral) {
            return res.status(404).json({ error: "Referral Doesn't Exist!" });
        }

        // Security check: only the destination facility or a SystemAdmin can accept, reject, or complete a referral.
        // Origin facility can only cancel/withdraw an outgoing referral.
        const userFacilityId = req.user?.facility_id;
        const isSystemAdmin = req.user?.role === 'SystemAdmin';
        const isDestination = Boolean(userFacilityId && existingReferral.to_facility_id === userFacilityId);
        const isOrigin = Boolean(userFacilityId && existingReferral.from_facility_id === userFacilityId);

        const normalizedStatus = status.toLowerCase();
        if (['accepted', 'rejected', 'completed'].includes(normalizedStatus)) {
            if (!isSystemAdmin && !isDestination) {
                return res.status(403).json({
                    error: "Access Denied. Only the receiving destination facility can accept, decline, or complete this referral."
                });
            }
        }

        const mvccResult = await updateWithMVCC('online_Referral', referral_id, {
            version,
            status: status,
            ...(response_notes !== undefined && { response_notes: response_notes }),
            ...(outcome !== undefined && { outcome: outcome }),
            is_completed: is_completed !== undefined ? is_completed : (status === "completed" || status === "accepted"),
            date_responded: new Date(),
        }, {
            strategy,
            userId: req.user?.user_id || req.user?.id
        });

        if (!mvccResult.resolved) {
            return res.status(409).json({
                error: "Conflict detected requiring manual review",
                details: mvccResult
            });
        }

        return res.status(200).json({
            message: "Referral Feedback/Response Recorded Successfully",
            data: mvccResult.record,
            strategyUsed: mvccResult.strategyUsed
        });

    } catch (error) {
        return next(error);
    }
};

const deleteReferral = async (req, res, next) => {
    try {
        const { referral_id } = req.params;

        if (!referral_id) {
            return res.status(400).json({ error: "Missing Required Fields!" });
        }

        try {
            await prisma.online_Referral.delete({
                where: { referral_id: referral_id },
            });
        } catch (err) {
            if (err.code === 'P2025') {
                return res.status(404).json({ error: "Referral Doesn't Exist!" });
            }
            throw err;
        }

        return res.status(200).json({
            message: "Referral Deleted Successfully",
        });

    } catch (error) {
        return next(error);
    }
};

const getReferralByFacility = async (req, res, next) => {

    try {

        const {facility_id} = req.params;

        if(!facility_id) {
            return res.status(400).json({error : "Missing Required Fields!"});
        }

        if(!(await validate.isFacilityExist(facility_id))) {
            return res.status(404).json({error : "Facility Doesn't Exist!"});
        }

        const referralList = await prisma.online_Referral.findMany({
            where : {
                OR: [
                    { from_facility_id : facility_id },
                    { to_facility_id : facility_id }
                ]
            },
            include: {
                pregnancy: {
                    include: {
                        mother: {
                            include: {
                                user: true,
                            },
                        },
                        prenatalVisits: {
                            orderBy: { visit_date: 'desc' },
                            take: 1,
                        },
                        cdssAlerts: {
                            where: { is_resolved: false },
                            orderBy: { updated_at: 'desc' },
                        },
                    },
                },
                fromFacility: true,
                toFacility: true,
            },
            orderBy: { date_referred: 'desc' }
        });

        return res.status(200).json({
            message : "Referral List Retrieved Successfully",
            data : referralList
        });
        
    } catch (error) {
        return next(error);
    }
}

const getAllReferralByPregnancy = async (req, res, next) => {

    try {

        const {pregnancy_id} = req.params;

        if(!pregnancy_id) {
            return res.status(400).json({error : "Missing Required Fields!"});
        }

        if(!(await validate.isPregnancyExist(pregnancy_id))) {
            return res.status(404).json({error : "Pregnancy Record Doesn't Exist"});
        }

        const referralList = await prisma.online_Referral.findMany({
            where : {pregnancy_id : pregnancy_id},
            include: {
                pregnancy: {
                    include: {
                        mother: {
                            include: {
                                user: true,
                            },
                        },
                        prenatalVisits: {
                            orderBy: { visit_date: 'desc' },
                            take: 1,
                        },
                        cdssAlerts: {
                            where: { is_resolved: false },
                            orderBy: { updated_at: 'desc' },
                        },
                    },
                },
                fromFacility: true,
                toFacility: true,
            },
            orderBy: { date_referred: 'desc' }
        });

        return res.status(200).json({
            message : "Referral List Retrieved Successfully",
            data : referralList
        });

    } catch (error) {
        return next(error);
    }
}

const getPublicReferral = async (req, res, next) => {
    try {
        const { identifier } = req.params;
        const { pin } = req.query;

        if (!identifier) {
            return res.status(400).json({ error: "Referral identifier is required." });
        }

        // Find referral by referral_id or matching secure_link ending with identifier
        let referral = await prisma.online_Referral.findFirst({
            where: {
                OR: [
                    { referral_id: identifier },
                    { secure_link: { endsWith: identifier } }
                ]
            },
            include: {
                pregnancy: {
                    include: {
                        mother: {
                            include: {
                                user: {
                                    select: {
                                        first_name: true,
                                        middle_name: true,
                                        last_name: true,
                                        phone_number: true,
                                        address: true,
                                        email: true,
                                        profile_url: true,
                                    }
                                }
                            }
                        },
                        prenatalVisits: {
                            orderBy: { visit_date: 'desc' },
                            include: {
                                healthWorker: {
                                    select: {
                                        first_name: true,
                                        last_name: true,
                                        role: true
                                    }
                                }
                            }
                        },
                        labScreenings: {
                            orderBy: { date_of_screening: 'desc' },
                        },
                        supplementationRecords: {
                            orderBy: { date_given: 'desc' },
                        },
                        cdssAlerts: {
                            orderBy: { updated_at: 'desc' },
                        },
                        deliveryOutcomes: true,
                    }
                },
                fromFacility: true,
                toFacility: true,
            }
        });

        if (!referral) {
            return res.status(404).json({ error: "Referral record not found or link has expired." });
        }

        // Check if referral requires PIN protection
        const isPinRequired = Boolean(referral.shared_pin);
        const isPinValid = !isPinRequired || (pin && pin.toString().trim() === referral.shared_pin.toString().trim());

        // Construct safe response
        const motherUser = referral.pregnancy?.mother?.user;
        const motherDetails = referral.pregnancy?.mother;
        const latestVisit = referral.pregnancy?.prenatalVisits?.[0];

        const publicData = {
            referral_id: referral.referral_id,
            status: referral.status,
            date_referred: referral.date_referred,
            reason: referral.reason,
            response_notes: referral.response_notes,
            outcome: referral.outcome,
            date_responded: referral.date_responded,
            version: referral.version,
            isPinRequired,
            isPinVerified: isPinValid,
            referring_facility: {
                facility_id: referral.fromFacility?.facility_id,
                name: referral.fromFacility?.facility_name || "Origin Clinic",
                address: referral.fromFacility?.address,
                contact: referral.fromFacility?.contact_number,
                email: referral.fromFacility?.email,
                type: referral.fromFacility?.type,
                profile_url: referral.fromFacility?.facility_profile_url,
            },
            destination_facility: referral.toFacility ? {
                facility_id: referral.toFacility.facility_id,
                name: referral.toFacility.facility_name,
                address: referral.toFacility.address,
                contact: referral.toFacility.contact_number,
                email: referral.toFacility.email,
            } : {
                name: referral.external_facility_name || "External Hospital / Clinic"
            },
        };

        if (isPinValid) {
            publicData.patient = {
                mother_id: motherDetails?.mother_id,
                name: motherUser ? `${motherUser.first_name || ""} ${motherUser.middle_name || ""} ${motherUser.last_name || ""}`.trim() : "Confidential Patient",
                first_name: motherUser?.first_name,
                middle_name: motherUser?.middle_name,
                last_name: motherUser?.last_name,
                age: motherDetails?.age,
                birth_date: motherDetails?.birth_date,
                blood_type: motherDetails?.blood_type,
                civil_status: motherDetails?.civil_status,
                phone: motherUser?.phone_number,
                address: motherUser?.address,
                email: motherUser?.email,
                profile_url: motherUser?.profile_url,
                family_serial_no: motherDetails?.family_serial_no,
            };
            publicData.obstetric_info = {
                pregnancy_id: referral.pregnancy?.pregnancy_id,
                gravida: referral.pregnancy?.gravida,
                parity: referral.pregnancy?.parity,
                lmp_date: referral.pregnancy?.lmp_date,
                age_group: referral.pregnancy?.age_group,
                bmi_category: referral.pregnancy?.bmi_category,
                pregnancy_status: referral.pregnancy?.pregnancy_status,
                co_morbidities: referral.pregnancy?.co_morbidities,
                previous_delivery_history: referral.pregnancy?.previous_delivery_history,
                deworming_given: referral.pregnancy?.deworming_given,
                deworming_date: referral.pregnancy?.deworming_date,
                latest_vitals: latestVisit ? {
                    visit_date: latestVisit.visit_date,
                    gestational_age_weeks: latestVisit.age_of_gestation_weeks,
                    bp: `${latestVisit.bp_systolic}/${latestVisit.bp_diastolic}`,
                    pulse_rate: latestVisit.pulse_rate_bpm,
                    temp: latestVisit.temperature_celsius,
                    fundic_height: latestVisit.fundic_height_cm,
                    fetal_heart_tone: latestVisit.fetal_heart_tone_bpm,
                    risk_level: latestVisit.risk_level_assessed,
                    danger_signs: latestVisit.danger_signs_observed,
                    chief_complaint: latestVisit.chief_complaint,
                } : null
            };
            publicData.prenatal_visits = referral.pregnancy?.prenatalVisits || [];
            publicData.lab_screenings = referral.pregnancy?.labScreenings || [];
            publicData.supplements = referral.pregnancy?.supplementationRecords || [];
            publicData.cdss_alerts = referral.pregnancy?.cdssAlerts || [];
        }

        return res.status(200).json({
            message: "Public Referral Retrieved Successfully",
            data: publicData
        });

    } catch (error) {
        return next(error);
    }
};

const respondPublicReferral = async (req, res, next) => {
    try {
        const { identifier } = req.params;
        const { pin, status, response_notes, outcome } = req.body;

        if (!identifier || !status) {
            return res.status(400).json({ error: "Missing required fields (status is required)." });
        }

        const validStatuses = ["pending", "accepted", "rejected", "completed", "transferred"];
        if (!validStatuses.includes(status.toLowerCase())) {
            return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
        }

        // Find referral by referral_id or matching secure_link ending with identifier
        let referral = await prisma.online_Referral.findFirst({
            where: {
                OR: [
                    { referral_id: identifier },
                    { secure_link: { endsWith: identifier } }
                ]
            }
        });

        if (!referral) {
            return res.status(404).json({ error: "Referral record not found." });
        }

        // Validate PIN if configured
        if (referral.shared_pin) {
            if (!pin || pin.toString().trim() !== referral.shared_pin.toString().trim()) {
                return res.status(403).json({ error: "Invalid security PIN. Action unauthorized." });
            }
        }

        const updated = await prisma.online_Referral.update({
            where: { referral_id: referral.referral_id },
            data: {
                status: status.toLowerCase(),
                ...(response_notes !== undefined && { response_notes: response_notes }),
                ...(outcome !== undefined && { outcome: outcome }),
                is_completed: status.toLowerCase() === "completed" || status.toLowerCase() === "accepted",
                date_responded: new Date(),
                version: { increment: 1 },
            }
        });

        return res.status(200).json({
            message: `Referral status successfully updated to ${status}.`,
            data: updated
        });

    } catch (error) {
        return next(error);
    }
};

module.exports = {
    generatePin,
    createSecuredLink,
    createReferral,
    getAllReferrals,
    getReferralById,
    updateReferral,
    respondToReferral,
    deleteReferral,
    getReferralByFacility,
    getAllReferralByPregnancy,
    getPublicReferral,
    respondPublicReferral,
};

