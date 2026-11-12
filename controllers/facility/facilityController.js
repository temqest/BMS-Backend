const prisma = require('../../util/db');
const validate = require('../../util/validation');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const checkOtp = require('../../services/otpServices');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn("Warning: JWT_SECRET environment variable is missing.");
}

const registerFacility = async (req, res, next) => {
    try {
        const { facility_name, address, contact_number, email, type } = req.body;

        if (!facility_name || !address || !contact_number || !type) {
            return res.status(400).json({ error: "Required fields are missing for facility registration" });
        }

        const isFacilityExist = await prisma.facility.findFirst({
            where: {
                OR: [
                    { facility_name: facility_name },
                    { email: email },
                ]
            },
        });

        if (isFacilityExist) {
            return res.status(400).json({ error: "Facility with this name or email already exist" });
        }

        const facility = await prisma.facility.create({
            data: {
                facility_name: facility_name,
                address: address,
                contact_number: contact_number,
                email: email,
                type: type,
            }
        });

        return res.status(200).json({
            message: "Facility successfully created",
            result: facility
        });

    } catch (error) {
        return next(error);
    }
};

const publicRegisterFacility = async (req, res, next) => {
    try {
        const {
            facility_name,
            type,
            address: facility_address,
            contact_number: facility_contact,
            facility_email,
            first_name,
            middle_name,
            last_name,
            phone_number,
            email,
            password,
            otp
        } = req.body;

        if (!facility_name || !type || !facility_address || !first_name || !last_name || !password || !otp) {
            return res.status(400).json({ error: "Missing required fields for registration" });
        }

        const identifier = email || phone_number;

        if (!identifier) {
            return res.status(400).json({ error: "Email or Phone Number is required for verification" });
        }

        const isValidOtp = await checkOtp.verifyOTP(identifier, otp, 'registration');

        if (!isValidOtp) {
            return res.status(400).json({ error: "Invalid or expired OTP code" });
        }

        const isFacilityExist = await prisma.facility.findFirst({
            where: {
                OR: [
                    { facility_name: facility_name },
                    facility_email ? { email: facility_email } : undefined,
                ].filter(Boolean)
            }
        });

        if (isFacilityExist) {
            return res.status(400).json({ error: "Facility name or email is already taken" });
        }

        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    phone_number ? { phone_number } : undefined,
                    email ? { email: email } : undefined,
                ].filter(Boolean)
            }
        });

        if (existingUser) {
            return res.status(400).json({ error: "An account with this phone or email already exists" });
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        const result = await prisma.$transaction(async (tx) => {
            const newFacility = await tx.facility.create({
                data: {
                    facility_name,
                    address: facility_address,
                    contact_number: facility_contact || phone_number,
                    email: facility_email || email || "",
                    type,
                }
            });

            const adminUser = await tx.user.create({
                data: {
                    first_name,
                    middle_name: middle_name || "",
                    last_name,
                    role: "Admin",
                    phone_number: phone_number || null,
                    email: email || null,
                    password: hashedPassword,
                    address: facility_address,
                    facility_id: newFacility.facility_id,
                    sync_status: "synced",
                }
            });

            return { newFacility, adminUser };
        });

        const token = jwt.sign(
            { user_id: result.adminUser.user_id, role: result.adminUser.role, facility_id: result.newFacility.facility_id },
            JWT_SECRET,
            { expiresIn: "30d" }
        );

        return res.status(201).json({
            message: "Facility and Admin account registered successfully",
            token: token,
            user: {
                user_id: result.adminUser.user_id,
                first_name: result.adminUser.first_name,
                middle_name: result.adminUser.middle_name || "",
                last_name: result.adminUser.last_name,
                role: result.adminUser.role,
                email: result.adminUser.email || "",
                phone_number: result.adminUser.phone_number || "",
                facility_id: result.newFacility.facility_id,
                facility_name: result.newFacility.facility_name,
            },
            facility: result.newFacility
        });

    } catch (error) {
        next(error);
    }
};

const getPublicFacilities = async (req, res, next) => {
    try {
        const facilities = await prisma.facility.findMany({
            select: {
                facility_id: true,
                facility_name: true,
                address: true,
                contact_number: true,
                type: true
            },
            orderBy: {
                facility_name: 'asc'
            }
        });

        return res.status(200).json({
            result: facilities
        });

    } catch (error) {
        next(error);
    }
};

const searchFacility = async (req, res, next) => {
    try {
        const { search } = req.query;

        if (!search) {
            return res.status(400).json({ error: "Search query is required" });
        }

        const facility = await prisma.facility.findMany({
            where: {
                OR: [
                    { facility_name: { contains: search, mode: 'insensitive' } },
                    { address: { contains: search, mode: 'insensitive' } },
                    { contact_number: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { type: { contains: search, mode: 'insensitive' } }
                ]
            },
        });

        if (facility.length === 0) {
            return res.status(404).json({ error: "No facility found" });
        }

        return res.status(200).json({
            result: facility
        });

    } catch (error) {
        return next(error);
    }
};

const updateFacility = async (req, res, next) => {
    try {
        const facility_id = req.params.facility_id || req.body.facility_id || req.query.facility_id || req.user?.facility_id;
        const { facility_name, contact_number, address, email, type, facility_profile_url } = req.body;

        if (!facility_id) {
            return res.status(400).json({ error: "Facility ID is required" });
        }

        const isFacilityExist = await prisma.facility.findUnique({
            where: { facility_id: facility_id },
        });

        if (!isFacilityExist) {
            return res.status(404).json({ error: "Facility not found" });
        }

        const updatedFacility = await prisma.facility.update({
            where: { facility_id: facility_id },
            data: {
                facility_name: facility_name,
                address: address,
                contact_number: contact_number,
                email: email,
                type: type,
                facility_profile_url: facility_profile_url !== undefined ? facility_profile_url : isFacilityExist.facility_profile_url,
            },
        });

        return res.status(200).json({
            message: "Facility successfully updated",
            result: updatedFacility,
        });

    } catch (error) {
        return next(error);
    }
};

const deleteFacility = async (req, res, next) => {
    try {
        const facility_id = req.params.facility_id || req.body?.facility_id || req.query?.facility_id;

        if (!facility_id) {
            return res.status(400).json({ error: "Facility ID is required" });
        }

        if (!(await validate.isFacilityExist(facility_id))) {
            return res.status(404).json({ error: "Facility not found" });
        }

        const relatedUsers = await prisma.user.count({ where: { facility_id } });
        const relatedEnrollments = await prisma.mother_Facility_Enrollment.count({ where: { facility_id } });
        if (relatedUsers > 0 || relatedEnrollments > 0) {
            return res.status(400).json({ 
                error: "Cannot delete facility with active staff members or enrolled mothers. Deactivate or reassign them first." 
            });
        }

        await prisma.facility.delete({
            where: { facility_id: facility_id }
        });

        return res.status(200).json({
            message: "Facility successfully deleted"
        });

    } catch (error) {
        if (error.code === 'P2003') {
            return res.status(400).json({ 
                error: "Cannot delete facility because related clinical records exist." 
            });
        }
        return next(error);
    }
};

const viewAllFacility = async (req, res, next) => {
    try {
        const facility = await prisma.facility.findMany({
            select: {
                facility_id: true,
                facility_name: true,
                address: true,
                contact_number: true,
                email: true,
                type: true
            }
        });

        return res.status(200).json({
            message: "Fetched all facilities",
            result: facility
        });

    } catch (error) {
        return next(error);
    }
};

const getFacilityById = async (req, res, next) => {
    try {
        const { facility_id } = req.params;

        if (!facility_id) {
            return res.status(400).json({ error: "Facility ID is required" });
        }

        const facility = await prisma.facility.findUnique({
            where: { facility_id: facility_id }
        });

        if (!facility) {
            return res.status(404).json({ error: "Facility not found" });
        }

        return res.status(200).json({
            message: "Facility retrieved successfully",
            result: facility
        });

    } catch (error) {
        return next(error);
    }
};

const getFacilityHubDetails = async (req, res, next) => {
    try {
        const { facility_id } = req.params;

        if (!facility_id) {
            return res.status(400).json({ error: "Facility ID is required" });
        }

        const facility = await prisma.facility.findUnique({
            where: { facility_id },
            include: {
                users: {
                    where: {
                        role: { notIn: ['Mother', 'MOTHER'] }
                    },
                    select: {
                        user_id: true,
                        facility_id: true,
                        first_name: true,
                        middle_name: true,
                        last_name: true,
                        role: true,
                        phone_number: true,
                        email: true,
                        address: true,
                        profile_url: true,
                        is_active: true,
                        updated_at: true
                    },
                    orderBy: { last_name: 'asc' }
                },
                motherEnrollments: {
                    select: {
                        enrollment_id: true,
                        status: true,
                        enrolled_at: true,
                        mother: {
                            select: {
                                mother_id: true,
                                family_serial_no: true,
                                birth_date: true,
                                blood_type: true,
                                user: {
                                    select: {
                                        first_name: true,
                                        last_name: true,
                                        phone_number: true,
                                        address: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { enrolled_at: 'desc' },
                    take: 50
                },
                onlineReferralsFrom: {
                    select: {
                        referral_id: true,
                        reason: true,
                        status: true,
                        date_referred: true,
                        external_facility_name: true,
                        toFacility: {
                            select: {
                                facility_name: true,
                                type: true
                            }
                        }
                    },
                    orderBy: { date_referred: 'desc' },
                    take: 30
                },
                onlineReferralsTo: {
                    select: {
                        referral_id: true,
                        reason: true,
                        status: true,
                        date_referred: true,
                        fromFacility: {
                            select: {
                                facility_name: true,
                                type: true
                            }
                        }
                    },
                    orderBy: { date_referred: 'desc' },
                    take: 30
                },
                schedules: {
                    select: {
                        schedule_id: true,
                        available_date: true,
                        available_time_slot: true,
                        max_slots: true,
                        booked_slots: true,
                        is_available: true
                    },
                    orderBy: { available_date: 'desc' },
                    take: 30
                },
                _count: {
                    select: {
                        users: true,
                        motherEnrollments: true,
                        appointments: true,
                        onlineReferralsFrom: true,
                        onlineReferralsTo: true
                    }
                }
            }
        });

        if (!facility) {
            return res.status(404).json({ error: "Facility not found" });
        }

        return res.status(200).json({
            message: "Facility hub details retrieved successfully",
            result: facility
        });
    } catch (error) {
        return next(error);
    }
};

const reassignStaffFacility = async (req, res, next) => {
    try {
        const isSuperAdmin = req.user?.role === 'SystemAdmin' || req.user?.role === 'SuperAdmin';
        if (!isSuperAdmin) {
            return res.status(403).json({ error: "Only Super Admin can reassign staff across facilities." });
        }

        const { user_id, target_facility_id } = req.body;
        if (!user_id || !target_facility_id) {
            return res.status(400).json({ error: "User ID and target facility ID are required." });
        }

        const targetFacility = await prisma.facility.findUnique({
            where: { facility_id: target_facility_id }
        });

        if (!targetFacility) {
            return res.status(404).json({ error: "Target facility not found." });
        }

        const updatedUser = await prisma.user.update({
            where: { user_id },
            data: { facility_id: target_facility_id },
            select: {
                user_id: true,
                facility_id: true,
                first_name: true,
                last_name: true,
                role: true
            }
        });

        return res.status(200).json({
            message: "Staff member reassigned successfully",
            result: updatedUser
        });
    } catch (error) {
        return next(error);
    }
};

const getMunicipalOverview = async (req, res, next) => {
    try {
        const isSuperAdmin = req.user?.role === 'SystemAdmin' || req.user?.role === 'SuperAdmin';
        if (!isSuperAdmin) {
            return res.status(403).json({ error: "Access Denied. Only Super Admin can view municipal overview analytics." });
        }

        const [
            totalFacilities,
            totalMothers,
            activePregnancies,
            totalReferrals,
            facilitiesSummary
        ] = await Promise.all([
            prisma.facility.count(),
            prisma.mother.count(),
            prisma.pregnancy.count({
                where: { pregnancy_status: { in: ['Active', 'active', 'ACTIVE'] } }
            }),
            prisma.online_Referral.count(),
            prisma.facility.findMany({
                select: {
                    facility_id: true,
                    facility_name: true,
                    type: true,
                    address: true,
                    _count: {
                        select: {
                            users: true,
                            appointments: true,
                            motherEnrollments: true,
                            onlineReferralsFrom: true,
                            onlineReferralsTo: true
                        }
                    }
                }
            })
        ]);

        return res.status(200).json({
            message: "Municipal health system overview retrieved successfully",
            result: {
                totalFacilities,
                totalMothers,
                activePregnancies,
                totalReferrals,
                facilitiesSummary
            }
        });
    } catch (error) {
        return next(error);
    }
};

const getMunicipalReports = async (req, res, next) => {
    try {
        const isSuperAdmin = req.user?.role === 'SystemAdmin' || req.user?.role === 'SuperAdmin';
        if (!isSuperAdmin) {
            return res.status(403).json({ error: "Access Denied. Only Super Admin can view municipal reports." });
        }

        const [
            totalMothers,
            totalPregnancies,
            activePregnancies,
            completedPregnancies,
            highRiskPregnancies,
            deliveries,
            newborns,
            referrals,
            facilities
        ] = await Promise.all([
            prisma.mother.count(),
            prisma.pregnancy.count(),
            prisma.pregnancy.count({
                where: { pregnancy_status: { in: ['Active', 'active', 'ACTIVE'] } }
            }),
            prisma.pregnancy.count({
                where: { pregnancy_status: { in: ['Delivered', 'delivered', 'Completed', 'completed'] } }
            }),
            prisma.pregnancy.count({
                where: {
                    OR: [
                        { prev_caesarean: true },
                        { consecutive_miscarriages: true },
                        { stillbirth_history: true },
                        { pph_history: true },
                        { has_tb: true },
                        { has_heart_disease: true },
                        { has_diabetes: true },
                        { has_asthma: true },
                        { has_goiter: true }
                    ]
                }
            }),
            prisma.delivery_Outcome.findMany({
                select: {
                    place_of_delivery: true,
                    mode_of_delivery: true,
                    maternal_outcome: true,
                    immediate_breastfeeding: true,
                    pregnancy: {
                        select: {
                            mother: {
                                select: {
                                    facilityEnrollments: {
                                        select: {
                                            facility_id: true,
                                            facility: {
                                                select: { facility_name: true }
                                            }
                                        },
                                        take: 1
                                    }
                                }
                            }
                        }
                    }
                }
            }),
            prisma.newborn_Record.findMany({
                select: {
                    status_at_birth: true,
                    sex: true,
                    birth_weight_kg: true,
                    apgar_score: true
                }
            }),
            prisma.online_Referral.findMany({
                select: {
                    status: true,
                    from_facility_id: true,
                    fromFacility: {
                        select: { facility_name: true }
                    }
                }
            }),
            prisma.facility.findMany({
                select: {
                    facility_id: true,
                    facility_name: true,
                    type: true,
                    _count: {
                        select: {
                            motherEnrollments: true,
                            onlineReferralsFrom: true,
                            appointments: true
                        }
                    }
                }
            })
        ]);

        const placeCounts = {};
        const modeCounts = {};
        let maternalComplicated = 0;
        let breastfeedingCount = 0;

        for (const d of deliveries) {
            const place = d.place_of_delivery || 'Unspecified';
            placeCounts[place] = (placeCounts[place] || 0) + 1;
            const mode = d.mode_of_delivery || 'Unspecified';
            modeCounts[mode] = (modeCounts[mode] || 0) + 1;
            if (d.maternal_outcome && d.maternal_outcome !== 'Alive') {
                maternalComplicated++;
            }
            if (d.immediate_breastfeeding) {
                breastfeedingCount++;
            }
        }

        const referralStatusCounts = {};
        for (const r of referrals) {
            const st = (r.status || 'pending').toLowerCase();
            referralStatusCounts[st] = (referralStatusCounts[st] || 0) + 1;
        }

        let liveBirths = 0;
        let stillBirths = 0;
        for (const n of newborns) {
            const status = (n.status_at_birth || '').toLowerCase();
            if (status.includes('still') || status.includes('dead')) {
                stillBirths++;
            } else {
                liveBirths++;
            }
        }

        return res.status(200).json({
            message: "Municipal epidemiological reports retrieved successfully",
            result: {
                kpis: {
                    totalMothers,
                    totalPregnancies,
                    activePregnancies,
                    completedPregnancies,
                    highRiskPregnancies,
                    lowRiskPregnancies: Math.max(0, totalPregnancies - highRiskPregnancies),
                    totalDeliveries: deliveries.length,
                    liveBirths,
                    stillBirths,
                    maternalComplicated,
                    breastfeedingRate: deliveries.length > 0 ? Math.round((breastfeedingCount / deliveries.length) * 100) : 0,
                    totalReferrals: referrals.length
                },
                deliveryPlaces: Object.entries(placeCounts).map(([place, count]) => ({ place, count })),
                deliveryModes: Object.entries(modeCounts).map(([mode, count]) => ({ mode, count })),
                referralStatus: referralStatusCounts,
                facilitiesSummary: facilities.map(f => ({
                    facility_id: f.facility_id,
                    facility_name: f.facility_name,
                    type: f.type,
                    enrolledMothers: f._count.motherEnrollments,
                    referralsSent: f._count.onlineReferralsFrom,
                    appointments: f._count.appointments
                }))
            }
        });
    } catch (error) {
        return next(error);
    }
};

const getDatabaseMaintenanceStats = async (req, res, next) => {
    try {
        const isSuperAdmin = req.user?.role === 'SystemAdmin' || req.user?.role === 'SuperAdmin';
        if (!isSuperAdmin) {
            return res.status(403).json({ error: "Access Denied. Only Super Admin can view database maintenance stats." });
        }

        const [
            facilitiesCount,
            usersCount,
            mothersCount,
            pregnanciesCount,
            visitsCount,
            deliveriesCount,
            newbornsCount,
            referralsCount,
            auditLogsCount,
            unsyncedMothers,
            unsyncedPregnancies,
            unsyncedVisits
        ] = await Promise.all([
            prisma.facility.count(),
            prisma.user.count({ where: { role: { notIn: ['Mother', 'MOTHER'] } } }),
            prisma.mother.count(),
            prisma.pregnancy.count(),
            prisma.prenatalVisit.count(),
            prisma.delivery_Outcome.count(),
            prisma.newborn_Record.count(),
            prisma.online_Referral.count(),
            prisma.audit_Revision_Log.count(),
            prisma.mother.count({ where: { sync_status: { not: 'synced' } } }),
            prisma.pregnancy.count({ where: { sync_status: { not: 'synced' } } }),
            prisma.prenatalVisit.count({ where: { sync_status: { not: 'synced' } } })
        ]);

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentAuditCount = await prisma.audit_Revision_Log.count({
            where: {
                client_timestamp: { gte: oneDayAgo }
            }
        });

        return res.status(200).json({
            message: "Database maintenance stats retrieved successfully",
            result: {
                tableCounts: {
                    facilities: facilitiesCount,
                    staffUsers: usersCount,
                    mothers: mothersCount,
                    pregnancies: pregnanciesCount,
                    prenatalVisits: visitsCount,
                    deliveries: deliveriesCount,
                    newborns: newbornsCount,
                    referrals: referralsCount,
                    auditLogs: auditLogsCount
                },
                syncTelemetry: {
                    unsyncedTotal: unsyncedMothers + unsyncedPregnancies + unsyncedVisits,
                    unsyncedMothers,
                    unsyncedPregnancies,
                    unsyncedVisits,
                    recentAudit24h: recentAuditCount
                },
                databaseStatus: {
                    driver: "PostgreSQL (Prisma)",
                    connection: "Operational",
                    lastHealthCheck: new Date().toISOString()
                }
            }
        });
    } catch (error) {
        return next(error);
    }
};

const checkDuplicateMothers = async (req, res, next) => {
    try {
        const isSuperAdmin = req.user?.role === 'SystemAdmin' || req.user?.role === 'SuperAdmin';
        if (!isSuperAdmin) {
            return res.status(403).json({ error: "Access Denied." });
        }

        const serialDuplicates = await prisma.mother.groupBy({
            by: ['family_serial_no'],
            where: {
                family_serial_no: { not: null }
            },
            _count: {
                mother_id: true
            },
            having: {
                mother_id: {
                    _count: { gt: 1 }
                }
            }
        });

        const duplicateSerials = serialDuplicates.map(d => d.family_serial_no).filter(Boolean);

        const flaggedRecords = duplicateSerials.length > 0 ? await prisma.mother.findMany({
            where: {
                family_serial_no: { in: duplicateSerials }
            },
            select: {
                mother_id: true,
                family_serial_no: true,
                birth_date: true,
                civil_status: true,
                blood_type: true,
                user: {
                    select: {
                        first_name: true,
                        last_name: true,
                        phone_number: true,
                        address: true
                    }
                },
                facilityEnrollments: {
                    select: {
                        facility: {
                            select: {
                                facility_name: true,
                                type: true
                            }
                        }
                    }
                }
            }
        }) : [];

        return res.status(200).json({
            message: "Duplicate mother check completed",
            result: {
                duplicateSerialCount: duplicateSerials.length,
                flaggedRecords
            }
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    registerFacility,
    publicRegisterFacility,
    getPublicFacilities,
    searchFacility,
    updateFacility,
    deleteFacility,
    viewAllFacility,
    getFacilityById,
    getFacilityHubDetails,
    reassignStaffFacility,
    getMunicipalOverview,
    getMunicipalReports,
    getDatabaseMaintenanceStats,
    checkDuplicateMothers,
};