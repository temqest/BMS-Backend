const prisma = require('../../util/db');
const validate = require('../../util/validation');
const crypto = require('crypto');
const { updateWithMVCC } = require('../../services/conflicResolution');

const referralPinAttempts = new Map();

function checkReferralLockout(refId) {
    const record = referralPinAttempts.get(refId);

    if (!record) return { isLocked: false };

    const now = Date.now();

    if (record.lockedUntil && now < record.lockedUntil) {
        const minutesLeft = Math.ceil((record.lockedUntil - now) / 60000);
        return { isLocked: true, minutesLeft };
    }

    if (record.lockedUntil && now >= record.lockedUntil) {
        referralPinAttempts.delete(refId);
        return { isLocked: false };
    }

    return { isLocked: false };
}

function recordFailedReferralPin(refId) {
    const now = Date.now();
    const record = referralPinAttempts.get(refId) || { count: 0 };

    record.count += 1;

    if (record.count >= 5) {
        record.lockedUntil = now + 15 * 60 * 1000;
    }

    referralPinAttempts.set(refId, record);
    return record;
}

function clearReferralPin(refId) {
    referralPinAttempts.delete(refId);
}

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
            pregnancy_id: rawPregnancyId,
            mother_id,
            from_facility_id,
            to_facility_id,
            external_facility_name,
            reason,
        } = req.body;

        if ((!rawPregnancyId && !mother_id) || !from_facility_id || !reason) {
            return res.status(400).json({ error: "Missing required fields, please check your input" });
        }

        if (!to_facility_id && !external_facility_name) {
            return res.status(400).json({ error: "Please specify where this referral is going (select facility or enter external name)" });
        }

        if (req.user?.role !== 'SystemAdmin' && from_facility_id !== req.user?.facility_id) {
            return res.status(403).json({ error: "Access denied. Referrals must originate from your facility." });
        }

        let pregnancy = null;
        let resolvedPregnancyId = rawPregnancyId;

        if (resolvedPregnancyId && !resolvedPregnancyId.startsWith("temp-") && !resolvedPregnancyId.startsWith("mock-")) {
            pregnancy = await prisma.pregnancy.findUnique({
                where: { pregnancy_id: resolvedPregnancyId },
                include: {
                    mother: {
                        include: {
                            user: true,
                            facilityEnrollments: true,
                        }
                    }
                }
            });
        }

        // Fallback: If pregnancy not found by pregnancy_id, find the latest pregnancy by mother_id
        if (!pregnancy && mother_id) {
            pregnancy = await prisma.pregnancy.findFirst({
                where: { mother_id: mother_id },
                orderBy: { created_at: 'desc' },
                include: {
                    mother: {
                        include: {
                            user: true,
                            facilityEnrollments: true,
                        }
                    }
                }
            });
            if (pregnancy) {
                resolvedPregnancyId = pregnancy.pregnancy_id;
            }
        }

        const [fromFacility, toFacility] = await Promise.all([
            prisma.facility.findUnique({ where: { facility_id: from_facility_id } }),
            to_facility_id ? prisma.facility.findUnique({ where: { facility_id: to_facility_id } }) : Promise.resolve(true),
        ]);

        if (!pregnancy) {
            return res.status(404).json({ error: "Pregnancy record not found" });
        }

        if (!fromFacility) {
            return res.status(404).json({ error: "Origin facility not found" });
        }

        if (to_facility_id && !toFacility) {
            return res.status(404).json({ error: "Destination facility not found" });
        }

        if (req.user?.role !== 'SystemAdmin') {
            const mother = pregnancy.mother;
            const isHomeFacility = mother?.user?.facility_id === from_facility_id;
            const isEnrolled = Array.isArray(mother?.facilityEnrollments) && mother.facilityEnrollments.some(
                e => e.facility_id === from_facility_id && (e.status === 'Active' || !e.status)
            );
            const isAssignedOrCreatedByStaff = mother?.assigned_worker_id === req.user?.user_id || mother?.created_by_id === req.user?.user_id;

            if (!isHomeFacility && !isEnrolled && !isAssignedOrCreatedByStaff) {
                return res.status(403).json({ error: "Access denied. Patient is not registered or enrolled in your facility." });
            }
        }

        const secure_link = await createSecuredLink.generateLink();
        const shared_pin = await generatePin.generateUniquePin();

        const newReferral = await prisma.online_Referral.create({
            data: {
                pregnancy_id: resolvedPregnancyId,
                from_facility_id: from_facility_id,
                to_facility_id: to_facility_id ? to_facility_id : null,
                external_facility_name: external_facility_name ? external_facility_name : null,
                reason: reason,
                secure_link: secure_link,
                shared_pin: shared_pin,
            },
        });

        return res.status(201).json({
            message: "Referral created successfully",
            data: newReferral,
        });

    } catch (error) {
        return next(error);
    }
};

const getAllReferrals = async (req, res, next) => {
    try {
        const userRole = req.user?.role;
        const currentUserId = req.user?.user_id || req.user?.id;
        const staffFacilityId = req.user?.facility_id;
        const isSystemAdmin = userRole === 'SystemAdmin';
        const isAdmin = ['Admin', 'Administrator', 'FacilityAdmin'].includes(userRole);

        let facilityFilter = {};

        if (isSystemAdmin) {
            facilityFilter = {};
        } else if (staffFacilityId) {
            facilityFilter = {
                OR: [
                    { from_facility_id: staffFacilityId },
                    { to_facility_id: staffFacilityId },
                    { pregnancy: { mother: { assigned_worker_id: currentUserId } } },
                    { pregnancy: { mother: { created_by_id: currentUserId } } },
                ]
            };
        } else {
            facilityFilter = {
                OR: [
                    { pregnancy: { mother: { assigned_worker_id: currentUserId } } },
                    { pregnancy: { mother: { created_by_id: currentUserId } } },
                ]
            };
        }

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
                        deliveryOutcomes: {
                            include: {
                                newbornRecords: true,
                                postpartumVisits: {
                                    orderBy: { visit_date: 'desc' },
                                },
                            },
                            orderBy: { delivery_date: 'desc' },
                        },
                    },
                },
                fromFacility: true,
                toFacility: true,
            },
            orderBy: { date_referred: 'desc' },
        });

        return res.status(200).json({
            message: "Referral records loaded",
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
                        deliveryOutcomes: {
                            include: {
                                newbornRecords: true,
                                postpartumVisits: {
                                    orderBy: { visit_date: 'desc' },
                                },
                            },
                            orderBy: { delivery_date: 'desc' },
                        },
                    },
                },
                fromFacility: true,
                toFacility: true,
            },
        });

        if (!referral) {
            return res.status(404).json({ error: "Referral not found" });
        }

        return res.status(200).json({
            message: "Referral details fetched",
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
            return res.status(400).json({ error: "Missing referral ID" });
        }

        if (!(await validate.isOnlineReferralExist(referral_id))) {
            return res.status(404).json({ error: "Referral record not found" });
        }

        if (pregnancy_id && !(await validate.isPregnancyExist(pregnancy_id))) {
            return res.status(404).json({ error: "Pregnancy record not found" });
        }

        if (from_facility_id && !(await validate.isFacilityExist(from_facility_id))) {
            return res.status(404).json({ error: "Origin facility not found" });
        }

        if (to_facility_id && !(await validate.isFacilityExist(to_facility_id))) {
            return res.status(404).json({ error: "Destination facility not found" });
        }

        const { strategy, version, ...clientData } = req.body;

        const mvccResult = await updateWithMVCC('online_Referral', referral_id, { version, ...clientData }, {
            strategy,
            userId: req.user?.user_id || req.user?.id
        });

        if (!mvccResult.resolved) {
            return res.status(409).json({
                error: "Conflict detected, manual review is needed",
                details: mvccResult
            });
        }

        return res.status(200).json({
            message: "Referral updated",
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
            return res.status(400).json({ error: "Missing required fields" });
        }

        const existingReferral = await prisma.online_Referral.findUnique({
            where: { referral_id: referral_id }
        });

        if (!existingReferral) {
            return res.status(404).json({ error: "Referral record not found" });
        }

        const userFacilityId = req.user?.facility_id;
        const isSystemAdmin = req.user?.role === 'SystemAdmin';
        const isDestination = Boolean(userFacilityId && existingReferral.to_facility_id === userFacilityId);
        const isOrigin = Boolean(userFacilityId && existingReferral.from_facility_id === userFacilityId);

        const normalizedStatus = status.toLowerCase();

        if (['accepted', 'rejected', 'completed'].includes(normalizedStatus)) {
            if (!isSystemAdmin && !isDestination) {
                return res.status(403).json({
                    error: "Access denied. Only the receiving destination facility can accept, decline or complete this referral."
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
                error: "Conflict detected, manual review is needed",
                details: mvccResult
            });
        }

        return res.status(200).json({
            message: "Referral response saved successfully",
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
            return res.status(400).json({ error: "Missing referral ID" });
        }

        const existing = await prisma.online_Referral.findUnique({
            where: { referral_id: referral_id },
        });

        if (!existing) {
            return res.status(404).json({ error: "Referral record not found" });
        }

        if (req.user?.role !== 'SystemAdmin' && existing.from_facility_id !== req.user?.facility_id) {
            return res.status(403).json({ error: "Access denied. You can only delete referrals originating from your facility." });
        }

        await prisma.online_Referral.delete({
            where: { referral_id: referral_id },
        });

        return res.status(200).json({
            message: "Referral deleted",
        });

    } catch (error) {
        return next(error);
    }
};

const getReferralByFacility = async (req, res, next) => {
    try {
        const { facility_id } = req.params;

        if (!facility_id) {
            return res.status(400).json({ error: "Missing facility ID" });
        }

        const userRole = req.user?.role;
        const currentUserId = req.user?.user_id || req.user?.id;
        const isSystemAdmin = userRole === 'SystemAdmin';
        const isAdmin = ['Admin', 'Administrator', 'FacilityAdmin'].includes(userRole);

        if (!isSystemAdmin && req.user?.facility_id !== facility_id) {
            return res.status(403).json({ error: "Access denied. Cannot view referrals for another facility." });
        }

        if (!(await validate.isFacilityExist(facility_id))) {
            return res.status(404).json({ error: "Facility not found" });
        }

        let whereCondition = {
            OR: [
                { from_facility_id: facility_id },
                { to_facility_id: facility_id }
            ]
        };

        if (!isSystemAdmin && !isAdmin && currentUserId) {
            whereCondition = {
                AND: [
                    {
                        OR: [
                            { from_facility_id: facility_id },
                            { to_facility_id: facility_id }
                        ]
                    },
                    {
                        OR: [
                            { pregnancy: { mother: { assigned_worker_id: currentUserId } } },
                            { pregnancy: { mother: { created_by_id: currentUserId } } },
                            { pregnancy: { mother: { user_id: currentUserId } } },
                        ]
                    }
                ]
            };
        }

        const referralList = await prisma.online_Referral.findMany({
            where: whereCondition,
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
                        deliveryOutcomes: {
                            include: {
                                newbornRecords: true,
                                postpartumVisits: {
                                    orderBy: { visit_date: 'desc' },
                                },
                            },
                            orderBy: { delivery_date: 'desc' },
                        },
                    },
                },
                fromFacility: true,
                toFacility: true,
            },
            orderBy: { date_referred: 'desc' }
        });

        return res.status(200).json({
            message: "Referrals list retrieved",
            data: referralList
        });

    } catch (error) {
        return next(error);
    }
};

const getAllReferralByPregnancy = async (req, res, next) => {
    try {
        const { pregnancy_id } = req.params;

        if (!pregnancy_id) {
            return res.status(400).json({ error: "Missing pregnancy ID" });
        }

        if (!(await validate.isPregnancyExist(pregnancy_id))) {
            return res.status(404).json({ error: "Pregnancy record not found" });
        }

        const referralList = await prisma.online_Referral.findMany({
            where: { pregnancy_id: pregnancy_id },
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
                        deliveryOutcomes: {
                            include: {
                                newbornRecords: true,
                                postpartumVisits: {
                                    orderBy: { visit_date: 'desc' },
                                },
                            },
                            orderBy: { delivery_date: 'desc' },
                        },
                    },
                },
                fromFacility: true,
                toFacility: true,
            },
            orderBy: { date_referred: 'desc' }
        });

        return res.status(200).json({
            message: "Referrals list retrieved",
            data: referralList
        });

    } catch (error) {
        return next(error);
    }
};

const getPublicReferral = async (req, res, next) => {
    try {
        const { identifier } = req.params;
        const { pin } = req.query;

        if (!identifier) {
            return res.status(400).json({ error: "Referral identifier is required" });
        }

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
                                        user_id: true,
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
                        deliveryOutcomes: {
                            include: {
                                newbornRecords: true,
                                postpartumVisits: {
                                    orderBy: { visit_date: 'desc' },
                                },
                            },
                            orderBy: { delivery_date: 'desc' },
                        },
                    }
                },
                fromFacility: true,
                toFacility: true,
            }
        });

        if (!referral) {
            return res.status(404).json({ error: "Referral record not found or link might have expired" });
        }

        const lockout = checkReferralLockout(referral.referral_id);

        if (lockout.isLocked) {
            return res.status(429).json({ error: `Too many wrong PIN attempts. Link locked for ${lockout.minutesLeft} more minute(s).` });
        }

        const isPinRequired = Boolean(referral.shared_pin);
        const providedPin = (pin || "").toString().trim();
        const isPinValid = !isPinRequired || (providedPin && providedPin === referral.shared_pin.toString().trim());

        if (isPinRequired && providedPin && !isPinValid) {
            const attempt = recordFailedReferralPin(referral.referral_id);
            if (attempt.count >= 5) {
                return res.status(429).json({ error: "Too many wrong PIN attempts. Link is locked for 15 minutes." });
            }
        } else if (isPinValid) {
            clearReferralPin(referral.referral_id);
        }

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

            let deliveryOutcomes = referral.pregnancy?.deliveryOutcomes || [];

            if (deliveryOutcomes.length === 0 && referral.pregnancy?.mother_id) {
                const motherId = referral.pregnancy.mother_id;
                const motherUser = referral.pregnancy?.mother?.user;

                const motherDeliveries = await prisma.delivery_Outcome.findMany({
                    where: {
                        OR: [
                            { pregnancy: { mother_id: motherId } },
                            ...(motherUser?.user_id ? [{ pregnancy: { mother: { user_id: motherUser.user_id } } }] : []),
                            ...(motherUser?.last_name ? [{ pregnancy: { mother: { user: { last_name: { equals: motherUser.last_name, mode: 'insensitive' } } } } }] : []),
                        ]
                    },
                    include: {
                        newbornRecords: true,
                        postpartumVisits: {
                            orderBy: { visit_date: 'desc' }
                        }
                    },
                    orderBy: { delivery_date: 'desc' }
                });

                if (motherDeliveries && motherDeliveries.length > 0) {
                    deliveryOutcomes = motherDeliveries;
                }
            }

            publicData.delivery_outcomes = deliveryOutcomes;

            // Fetch recent appointments for patient if available
            try {
                if (motherUser?.user_id) {
                    const appointments = await prisma.appointment.findMany({
                        where: { user_id: motherUser.user_id },
                        orderBy: { appointment_date: 'desc' },
                        take: 5
                    });
                    publicData.appointments = appointments || [];
                } else {
                    publicData.appointments = [];
                }
            } catch (appErr) {
                console.warn("[getPublicReferral] Appointments fetch notice:", appErr.message);
                publicData.appointments = [];
            }

            // Fetch previous referrals for the same pregnancy/mother for continuity of care
            try {
                const prevReferrals = await prisma.online_Referral.findMany({
                    where: {
                        pregnancy_id: referral.pregnancy_id,
                        referral_id: { not: referral.referral_id }
                    },
                    select: {
                        referral_id: true,
                        date_referred: true,
                        status: true,
                        reason: true,
                        fromFacility: { select: { facility_name: true } },
                        toFacility: { select: { facility_name: true } },
                        external_facility_name: true,
                    },
                    orderBy: { date_referred: 'desc' },
                    take: 3
                });
                publicData.previous_referrals = prevReferrals || [];
            } catch (prevErr) {
                console.warn("[getPublicReferral] Previous referrals fetch notice:", prevErr.message);
                publicData.previous_referrals = [];
            }
        }

        return res.status(200).json({
            message: "Public referral retrieved",
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
            return res.status(400).json({ error: "Missing required fields, status is required" });
        }

        const validStatuses = [
            "pending",
            "acknowledged",
            "accepted",
            "in_progress",
            "in progress",
            "completed",
            "transferred",
            "rejected",
            "declined",
            "cancelled"
        ];

        const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');

        if (!validStatuses.includes(status.toLowerCase()) && !validStatuses.includes(normalizedStatus)) {
            return res.status(400).json({ error: `Invalid status option. Must be one of: ${validStatuses.join(", ")}` });
        }

        let referral = await prisma.online_Referral.findFirst({
            where: {
                OR: [
                    { referral_id: identifier },
                    { secure_link: { endsWith: identifier } }
                ]
            }
        });

        if (!referral) {
            return res.status(404).json({ error: "Referral record not found" });
        }

        if (referral.shared_pin) {
            if (!pin || pin.toString().trim() !== referral.shared_pin.toString().trim()) {
                return res.status(403).json({ error: "Invalid security PIN, action unauthorized" });
            }
        }

        const standardStatus = normalizedStatus === "declined" ? "rejected" : normalizedStatus;

        const updated = await prisma.online_Referral.update({
            where: { referral_id: referral.referral_id },
            data: {
                status: standardStatus,
                ...(response_notes !== undefined && { response_notes: response_notes }),
                ...(outcome !== undefined && { outcome: outcome }),
                is_completed: standardStatus === "completed" || standardStatus === "accepted",
                date_responded: new Date(),
                version: { increment: 1 },
            }
        });

        return res.status(200).json({
            message: `Referral status updated to ${standardStatus}`,
            data: updated
        });

    } catch (error) {
        return next(error);
    }
};

const clarifyPublicReferral = async (req, res, next) => {
    try {
        const { identifier } = req.params;
        const { pin, topic, priority, message, sender_name, sender_contact } = req.body;

        if (!identifier || !message || !message.trim()) {
            return res.status(400).json({ error: "Missing required fields: message is required" });
        }

        let referral = await prisma.online_Referral.findFirst({
            where: {
                OR: [
                    { referral_id: identifier },
                    { secure_link: { endsWith: identifier } }
                ]
            },
            include: {
                fromFacility: true,
                pregnancy: {
                    include: {
                        mother: {
                            include: { user: true }
                        }
                    }
                }
            }
        });

        if (!referral) {
            return res.status(404).json({ error: "Referral record not found" });
        }

        if (referral.shared_pin) {
            if (!pin || pin.toString().trim() !== referral.shared_pin.toString().trim()) {
                return res.status(403).json({ error: "Invalid security PIN, action unauthorized" });
            }
        }

        const patientName = referral.pregnancy?.mother?.user 
            ? `${referral.pregnancy.mother.user.first_name} ${referral.pregnancy.mother.user.last_name}`
            : "Referred Patient";

        const logTimestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });
        const senderInfo = sender_name ? ` (from ${sender_name}${sender_contact ? ' - ' + sender_contact : ''})` : "";
        const clarificationEntry = `\n[${logTimestamp}] INQUIRY [${(priority || 'urgent').toUpperCase()} - ${topic || 'General'}]${senderInfo}: ${message.trim()}`;
        
        const updatedResponseNotes = referral.response_notes 
            ? `${referral.response_notes}\n${clarificationEntry}`
            : clarificationEntry;

        const updated = await prisma.online_Referral.update({
            where: { referral_id: referral.referral_id },
            data: {
                response_notes: updatedResponseNotes,
                updated_at: new Date()
            }
        });

        // Dispatch in-app notification if referring facility user exists
        const recipientUserId = referral.pregnancy?.mother?.assigned_worker_id || referral.pregnancy?.mother?.created_by_id;
        if (recipientUserId) {
            await prisma.notification.create({
                data: {
                    user_id: recipientUserId,
                    title: `Referral Inquiry: ${patientName}`,
                    message: `[${(priority || 'urgent').toUpperCase()}] ${topic ? topic + ': ' : ''}${message.trim()}`,
                    type: 'referral_clarification',
                }
            }).catch(e => console.warn("[clarifyPublicReferral] Notification create notice:", e.message));
        }

        return res.status(200).json({
            message: "Clinical inquiry recorded and dispatched to referring facility.",
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
    clarifyPublicReferral,
};
