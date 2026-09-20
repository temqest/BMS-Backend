const prisma = require('../util/db');
const validate = require('../util/validation');
const { updateWithMVCC } = require('../services/conflicResolution');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const checkOtp = require('../services/otpServices');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn("Warning: JWT_SECRET environment variable is missing.");
}

const SAFE_USER_SELECT = {
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
    fcm_token: true,
    is_active: true,
    sync_status: true,
    version: true,
    updated_at: true,
};

const SAFE_IMAGE_MIMES = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
};

function saveBase64ToFile(fileUrl) {
    if (!fileUrl || typeof fileUrl !== 'string' || !fileUrl.startsWith('data:')) {
        return fileUrl;
    }

    try {
        const matches = fileUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

        if (matches && matches.length === 3) {
            const mimeType = matches[1].toLowerCase();
            const ext = SAFE_IMAGE_MIMES[mimeType];

            if (!ext) {
                console.warn(`[Security] Rejected unsupported avatar MIME type: ${mimeType}`);
                return null;
            }

            const base64Data = matches[2];
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = `avatar_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
            const uploadsDir = path.join(__dirname, '../public/uploads');

            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            const localFilePath = path.join(uploadsDir, fileName);
            fs.writeFileSync(localFilePath, buffer);

            const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 6700}`;
            return `${baseUrl}/uploads/${fileName}`;
        }
    } catch (err) {
        console.warn("Failed to convert base64 profile_url to file on server:", err);
    }

    return fileUrl;
}

const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return age;
};

const registerMother = async (req, res, next) => {
    try {
        const {
            first_name,
            middle_name,
            last_name,
            address,
            phone_number,
            email,
            facility_id,
            password,
            family_serial_no,
            birth_date, 
            civil_status, 
            blood_type
        } = req.body;

        if (!first_name || !last_name || !address || !birth_date || !civil_status) {
            return res.status(400).json({ error: "Please fill in all required fields" });
        }

        const duplicateConditions = [];

        if (phone_number && phone_number.trim()) {
            duplicateConditions.push({ phone_number: phone_number.trim() });
        }

        if (email && email.trim()) {
            duplicateConditions.push({ email: email.trim() });
        }

        if (family_serial_no && family_serial_no.trim()) {
            duplicateConditions.push({
                mother: {
                    family_serial_no: family_serial_no.trim()
                }
            });
        }

        if (first_name && last_name && birth_date) {
            duplicateConditions.push({
                first_name: first_name.trim(),
                last_name: last_name.trim(),
                mother: {
                    birth_date: new Date(birth_date),
                }
            });
        }

        const existingMother = duplicateConditions.length > 0 
            ? await prisma.user.findFirst({
                where: { OR: duplicateConditions },
                include: { mother: true }
            })
            : null;

        if (existingMother) {
            let fullMother = existingMother.mother || await prisma.mother.findUnique({
                where: { user_id: existingMother.user_id }
            });

            if (!fullMother) {
                fullMother = await prisma.mother.create({
                    data: {
                        user_id: existingMother.user_id,
                        family_serial_no: family_serial_no || null,
                        birth_date: new Date(birth_date),
                        age: calculateAge(birth_date),
                        civil_status: civil_status,
                        blood_type: blood_type,
                        sync_status: "synced",
                    }
                });
            }

            const targetFacilityId = facility_id || req.user?.facility_id;
            let enrollment = null;

            if (targetFacilityId && fullMother?.mother_id) {
                enrollment = await prisma.mother_Facility_Enrollment.upsert({
                    where: {
                        mother_id_facility_id: {
                            mother_id: fullMother.mother_id,
                            facility_id: targetFacilityId
                        }
                    },
                    update: { status: "Active" },
                    create: {
                        mother_id: fullMother.mother_id,
                        facility_id: targetFacilityId,
                        status: "Active"
                    }
                }).catch(() => null);
            }

            return res.status(200).json({
                message: "Mother enrolled in facility successfully",
                already_exists: true,
                enrolled: true,
                user: existingMother,
                mother: fullMother,
                enrollment
            });
        }

        const result = await prisma.$transaction(async (prismaClient) => {
            const user = await prismaClient.user.create({
                data: {
                    first_name: first_name,
                    middle_name: middle_name,
                    last_name: last_name,
                    address: address,
                    email: email,
                    phone_number: phone_number,
                    facility_id: facility_id,
                    role: "Mother",
                    sync_status: "synced",
                }
            });

            const mother = await prismaClient.mother.create({
                data: {
                    user_id: user.user_id,
                    family_serial_no: family_serial_no,
                    birth_date: new Date(birth_date),
                    age: calculateAge(birth_date),
                    civil_status: civil_status,
                    blood_type: blood_type,
                    sync_status: "synced",
                }
            });

            if (user.facility_id && mother.mother_id) {
                await prismaClient.mother_Facility_Enrollment.create({
                    data: {
                        mother_id: mother.mother_id,
                        facility_id: user.facility_id,
                        status: "Active"
                    }
                }).catch(() => null);
            }

            return { user, mother };
        });

        return res.status(200).json({
            message: "Mother registered successfully!",
            result: result
        });

    } catch (error) {
        if (error.code === 'P2002' || error.message?.includes('Unique constraint') || error.message?.includes('already exist')) {
            const fallbackUser = await prisma.user.findFirst({
                where: {
                    OR: [
                        req.body.phone_number ? { phone_number: req.body.phone_number.trim() } : undefined,
                        req.body.email ? { email: req.body.email.trim() } : undefined,
                        (req.body.first_name && req.body.last_name) ? {
                            first_name: req.body.first_name.trim(),
                            last_name: req.body.last_name.trim()
                        } : undefined,
                    ].filter(Boolean)
                },
                include: { mother: true }
            }).catch(() => null);

            if (fallbackUser) {
                const targetFacilityId = req.body.facility_id || req.user?.facility_id;

                if (targetFacilityId && fallbackUser.mother?.mother_id) {
                    await prisma.mother_Facility_Enrollment.upsert({
                        where: {
                            mother_id_facility_id: {
                                mother_id: fallbackUser.mother.mother_id,
                                facility_id: targetFacilityId
                            }
                        },
                        update: { status: "Active" },
                        create: {
                            mother_id: fallbackUser.mother.mother_id,
                            facility_id: targetFacilityId,
                            status: "Active"
                        }
                    }).catch(() => null);
                }

                return res.status(200).json({
                    message: "Mother enrolled in facility successfully",
                    already_exists: true,
                    enrolled: true,
                    user: fallbackUser,
                    mother: fallbackUser.mother || fallbackUser
                });
            }
        }

        return next(error);
    }
};

const selfRegisterMother = async (req, res, next) => {
    try {
        const { 
            first_name, 
            middle_name, 
            last_name, 
            phone_number, 
            email, 
            address, 
            password,
            family_serial_no, 
            birth_date, 
            civil_status, 
            blood_type,
            otp
        } = req.body;

        if (!first_name || !last_name || !phone_number || !address || !password || !birth_date || !civil_status || !otp) {
            return res.status(400).json({ error: "Required fields are missing" });
        }

        const isMotherExist = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: email },
                    { phone_number: phone_number }
                ]
            }
        });

        if (isMotherExist) {
            return res.status(400).json({ error: "Account with these credentials already exist" });
        }

        const purpose = 'registration';
        const identifier = email ? email : phone_number;

        const isValidOtp = await checkOtp.verifyOTP(identifier, otp, purpose);

        if (!isValidOtp) {
            return res.status(400).json({ error: "Invalid OTP code" });
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        const result = await prisma.$transaction(async (prismaClient) => {
            const user = await prismaClient.user.create({
                data: {
                    first_name: first_name,
                    middle_name: middle_name,
                    last_name: last_name,
                    phone_number: phone_number,
                    email: email,
                    address: address,
                    password: hashedPassword,
                    role: "Mother",
                    sync_status: "synced",
                }
            });

            const mother = await prismaClient.mother.create({
                data: {
                    user_id: user.user_id,
                    family_serial_no: family_serial_no,
                    birth_date: new Date(birth_date),
                    age: calculateAge(birth_date),
                    civil_status: civil_status,
                    blood_type: blood_type,
                    sync_status: "synced",
                }
            });

            return { user, mother };
        });

        const token = jwt.sign({
            user_id: result.user.user_id,
            role: result.user.role,
            email: result.user.email,
            phone_number: result.user.phone_number,
        }, JWT_SECRET, { expiresIn: "30d" });

        return res.status(200).json({
            message: "Mother registered successfully",
            token: token,
            user: {
                user_id: result.user.user_id,
                first_name: result.user.first_name,
                middle_name: result.user.middle_name,
                last_name: result.user.last_name,
                address: result.user.address,
                phone_number: result.user.phone_number,
                email: result.user.email,
                birth_date: result.mother.birth_date,
                age: result.mother.age,
                civil_status: result.mother.civil_status,
                blood_type: result.mother.blood_type
            }
        });

    } catch (error) {
        return next(error);
    }
};

const updateMother = async (req, res, next) => {
    try {
        const { mother_id } = req.params;

        if (!mother_id) {
            return res.status(400).json({ error: "Mother ID is required" });
        }

        const motherRecord = await prisma.mother.findFirst({
            where: {
                OR: [
                    { mother_id: mother_id },
                    { user_id: mother_id }
                ]
            },
            include: { user: true }
        });

        if (!motherRecord) {
            return res.status(404).json({ error: "Mother not found" });
        }

        const {
            first_name,
            middle_name,
            last_name,
            address,
            phone_number,
            email,
            birth_date,
            civil_status,
            blood_type,
            family_serial_no,
            strategy,
            version
        } = req.body;

        const rawProfileUrl = req.body.profile_url || req.body.photo_url;
        const profile_url = rawProfileUrl ? saveBase64ToFile(rawProfileUrl) : undefined;
        const userUpdateData = {};

        if (first_name !== undefined) userUpdateData.first_name = first_name;
        if (middle_name !== undefined) userUpdateData.middle_name = middle_name;
        if (last_name !== undefined) userUpdateData.last_name = last_name;
        if (address !== undefined) userUpdateData.address = address;
        if (phone_number !== undefined) userUpdateData.phone_number = phone_number;
        if (email !== undefined) userUpdateData.email = email;
        if (profile_url !== undefined) userUpdateData.profile_url = profile_url;

        if (Object.keys(userUpdateData).length > 0 && motherRecord.user_id) {
            await prisma.user.update({
                where: { user_id: motherRecord.user_id },
                data: userUpdateData
            });
        }

        const motherUpdateData = {};

        if (birth_date) {
            motherUpdateData.birth_date = new Date(birth_date);
            motherUpdateData.age = calculateAge(motherUpdateData.birth_date);
        }

        if (civil_status !== undefined) motherUpdateData.civil_status = civil_status;
        if (blood_type !== undefined) motherUpdateData.blood_type = blood_type;
        if (family_serial_no !== undefined) motherUpdateData.family_serial_no = family_serial_no;

        const targetMotherId = motherRecord.mother_id;

        const mvccResult = await updateWithMVCC('mother', targetMotherId, { version, ...motherUpdateData }, {
            strategy,
            userId: req.user?.user_id || req.user?.id
        });

        if (!mvccResult.resolved) {
            return res.status(409).json({
                error: "Conflict detected requiring manual review",
                details: mvccResult
            });
        }

        const updatedMotherWithUser = await prisma.mother.findUnique({
            where: { mother_id: targetMotherId },
            include: { user: true }
        });

        return res.status(200).json({
            message: "Mother updated successfully",
            result: updatedMotherWithUser,
            strategyUsed: mvccResult.strategyUsed
        });

    } catch (error) {
        return next(error);
    }
};

const softDeleteMother = async (req, res, next) => {
    try {
        const { mother_id } = req.params;

        if (!mother_id) {
            return res.status(400).json({ error: "Mother ID is required" });
        }

        const motherRecord = await prisma.mother.findFirst({
            where: {
                OR: [
                    { mother_id: mother_id },
                    { user_id: mother_id }
                ]
            },
            include: { user: true }
        });

        if (!motherRecord) {
            return res.status(404).json({ error: "Mother not found" });
        }

        if (req.user?.role !== 'SystemAdmin' && motherRecord.user?.facility_id && motherRecord.user.facility_id !== req.user?.facility_id) {
            return res.status(403).json({ error: "Mother belongs to another facility" });
        }

        await prisma.$transaction([
            prisma.user.update({
                where: { user_id: motherRecord.user_id },
                data: { is_active: false }
            }),
            prisma.mother.update({
                where: { mother_id: motherRecord.mother_id },
                data: { sync_status: "deactivated" }
            })
        ]);

        return res.status(200).json({
            message: "Mother deleted successfully"
        });

    } catch (error) {
        return next(error);
    }
};

const hardDeleteMother = async (req, res, next) => {
    try {
        const { mother_id } = req.params;

        if (!mother_id) {
            return res.status(400).json({ error: "Mother ID is required" });
        }

        const motherRecord = await prisma.mother.findUnique({
            where: { mother_id },
            include: { user: true }
        });

        if (!motherRecord) {
            return res.status(404).json({ error: "Mother not found" });
        }

        if (req.user?.role !== 'SystemAdmin' && motherRecord.user?.facility_id && motherRecord.user.facility_id !== req.user?.facility_id) {
            return res.status(403).json({ error: "Mother belongs to another facility" });
        }

        const entireMother = await prisma.$transaction(async (prismaClient) => {
            const deletedMother = await prismaClient.mother.delete({
                where: { mother_id: mother_id },
                include: {
                    pregnancies: true,
                }
            });

            const deletedUser = await prismaClient.user.delete({
                where: { user_id: motherRecord.user_id }
            });

            return { deletedUser, deletedMother };
        });

        return res.status(200).json({
            message: "Mother deleted successfully",
            result: entireMother
        });

    } catch (error) {
        return next(error);
    }
};

const getAllActiveMother = async (req, res, next) => {
    try {
        const staffFacilityId = req.user?.facility_id;
        const isSysAdmin = req.user?.role === 'SystemAdmin';

        const whereCondition = isSysAdmin
            ? { user: { role: "Mother", is_active: true } }
            : {
                user: { role: "Mother", is_active: true },
                OR: [
                    { user: { facility_id: staffFacilityId } },
                    {
                        facilityEnrollments: {
                            some: {
                                facility_id: staffFacilityId,
                                status: "Active"
                            }
                        }
                    }
                ]
            };

        const allActiveMothers = await prisma.mother.findMany({
            where: whereCondition,
            include: {
                user: { select: SAFE_USER_SELECT },
                facilityEnrollments: {
                    include: {
                        facility: {
                            select: {
                                facility_id: true,
                                facility_name: true,
                                type: true
                            }
                        }
                    }
                },
                pregnancies: {
                    orderBy: { created_at: "desc" },
                    include: {
                        prenatalVisits: {
                            orderBy: { visit_date: "desc" }
                        },
                        labScreenings: {
                            orderBy: { date_of_screening: "desc" }
                        },
                        supplementationRecords: {
                            orderBy: { date_given: "desc" }
                        },
                        deliveryOutcomes: {
                            orderBy: { delivery_date: "desc" },
                            include: {
                                newbornRecords: true,
                                postpartumVisits: {
                                    orderBy: { visit_date: "desc" }
                                }
                            }
                        }
                    }
                }
            },
        });

        return res.status(200).json({
            message: "All active mothers",
            result: allActiveMothers
        });

    } catch (error) {
        return next(error);
    }
};

const searchMotherByID = async (req, res, next) => {
    try {
        const { mother_id } = req.params;

        if (!mother_id) {
            return res.status(400).json({ error: "Mother ID is required" });
        }

        const searchMotherResult = await prisma.mother.findFirst({
            where: {
                OR: [
                    { mother_id: mother_id },
                    { user_id: mother_id }
                ]
            },
            include: {
                user: { select: SAFE_USER_SELECT },
                facilityEnrollments: {
                    include: {
                        facility: {
                            select: {
                                facility_id: true,
                                facility_name: true,
                                type: true
                            }
                        }
                    }
                },
                pregnancies: {
                    orderBy: { created_at: "desc" },
                    include: {
                        prenatalVisits: {
                            orderBy: { visit_date: "desc" }
                        },
                        labScreenings: {
                            orderBy: { date_of_screening: "desc" }
                        },
                        supplementationRecords: {
                            orderBy: { date_given: "desc" }
                        },
                        deliveryOutcomes: {
                            orderBy: { delivery_date: "desc" },
                            include: {
                                newbornRecords: true,
                                postpartumVisits: {
                                    orderBy: { visit_date: "desc" }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!searchMotherResult) {
            return res.status(404).json({ error: "Mother not found" });
        }

        if (req.user?.role !== 'SystemAdmin') {
            const homeFacilityMatch = searchMotherResult.user?.facility_id && searchMotherResult.user.facility_id === req.user?.facility_id;
            const enrollmentMatch = (searchMotherResult.facilityEnrollments || []).some(
                e => e.facility_id === req.user?.facility_id && e.status === 'Active'
            );
            if (searchMotherResult.user?.facility_id && !homeFacilityMatch && !enrollmentMatch) {
                return res.status(403).json({ error: "Mother belongs to another facility" });
            }
        }

        return res.status(200).json({
            message: "Mother found",
            result: searchMotherResult
        });

    } catch (error) {
        return next(error);
    }
};

const getCompositeMotherProfile = async (req, res, next) => {
    try {
        const { mother_id } = req.params;

        if (!mother_id) {
            return res.status(400).json({ error: "Mother ID is required" });
        }

        const motherProfile = await prisma.mother.findFirst({
            where: {
                OR: [
                    { mother_id: mother_id },
                    { user_id: mother_id }
                ]
            },
            include: {
                user: {
                    select: {
                        ...SAFE_USER_SELECT,
                        appointments: {
                            orderBy: { appointment_date: 'desc' },
                            include: {
                                facility: true
                            }
                        }
                    }
                },
                facilityEnrollments: {
                    include: {
                        facility: {
                            select: {
                                facility_id: true,
                                facility_name: true,
                                type: true
                            }
                        }
                    }
                },
                pregnancies: {
                    orderBy: { date_of_registration: 'desc' },
                    include: {
                        prenatalVisits: {
                            orderBy: { visit_date: 'desc' },
                            include: {
                                healthWorker: {
                                    select: {
                                        user_id: true,
                                        first_name: true,
                                        last_name: true,
                                        role: true
                                    }
                                }
                            }
                        },
                        supplementationRecords: {
                            orderBy: { date_given: 'desc' }
                        },
                        labScreenings: {
                            orderBy: { date_of_screening: 'desc' }
                        },
                        cdssAlerts: {
                            orderBy: { updated_at: 'desc' }
                        },
                        onlineReferrals: {
                            orderBy: { date_referred: 'desc' }
                        },
                        deliveryOutcomes: {
                            include: {
                                newbornRecords: true,
                                postpartumVisits: true
                            }
                        }
                    }
                }
            }
        });

        if (!motherProfile) {
            return res.status(404).json({ error: "Mother not found" });
        }

        if (req.user?.role !== 'SystemAdmin') {
            const homeFacilityMatch = motherProfile.user?.facility_id && motherProfile.user.facility_id === req.user?.facility_id;
            const enrollmentMatch = (motherProfile.facilityEnrollments || []).some(
                e => e.facility_id === req.user?.facility_id && e.status === 'Active'
            );
            if (motherProfile.user?.facility_id && !homeFacilityMatch && !enrollmentMatch) {
                return res.status(403).json({ error: "Mother belongs to another facility" });
            }
        }

        const canonicalMotherId = motherProfile.mother_id;
        const allPregnancies = motherProfile.pregnancies || [];
        const allVisits = allPregnancies.flatMap(p => (p.prenatalVisits || []).map(v => ({ ...v, mother_id: canonicalMotherId })));
        const allLabs = allPregnancies.flatMap(p => (p.labScreenings || []).map(l => ({ ...l, mother_id: canonicalMotherId })));
        const allSupplements = allPregnancies.flatMap(p => (p.supplementationRecords || []).map(s => ({ ...s, mother_id: canonicalMotherId })));
        const allAppointments = (motherProfile.user?.appointments || []).map(a => ({ ...a, mother_id: canonicalMotherId }));

        return res.status(200).json({
            message: "Composite mother profile retrieved",
            result: {
                ...motherProfile,
                pregnancies: allPregnancies,
                prenatalVisits: allVisits,
                labRecords: allLabs,
                supplements: allSupplements,
                appointments: allAppointments,
            }
        });

    } catch (error) {
        return next(error);
    }
};

const getAllMother = async (req, res, next) => {
    try {
        const staffFacilityId = req.user?.facility_id;
        const isSysAdmin = req.user?.role === 'SystemAdmin';

        const whereCondition = isSysAdmin
            ? { user: { role: "Mother" } }
            : {
                user: { role: "Mother" },
                OR: [
                    { user: { facility_id: staffFacilityId } },
                    {
                        facilityEnrollments: {
                            some: {
                                facility_id: staffFacilityId,
                                status: "Active"
                            }
                        }
                    }
                ]
            };

        const allMothers = await prisma.mother.findMany({
            where: whereCondition,
            include: {
                user: { select: SAFE_USER_SELECT },
                facilityEnrollments: {
                    include: {
                        facility: {
                            select: {
                                facility_id: true,
                                facility_name: true,
                                type: true
                            }
                        }
                    }
                },
                pregnancies: {
                    orderBy: { created_at: "desc" },
                    include: {
                        prenatalVisits: {
                            orderBy: { visit_date: "desc" }
                        }
                    }
                }
            },
        });

        return res.status(200).json({
            message: "All Mothers",
            result: allMothers
        });

    } catch (error) {
        return next(error);
    }
};

const getAllActiveMotherByFacility = async (req, res, next) => {
    try {
        const { facility_id } = req.params;

        if (!facility_id) {
            return res.status(400).json({ error: "Facility ID is required" });
        }

        if (req.user?.role !== 'SystemAdmin' && req.user?.facility_id !== facility_id) {
            return res.status(403).json({ error: "Cannot view mothers from another facility." });
        }

        const facilityMothers = await prisma.mother.findMany({
            where: {
                user: {
                    role: "Mother",
                    is_active: true
                },
                OR: [
                    { user: { facility_id: facility_id } },
                    {
                        facilityEnrollments: {
                            some: {
                                facility_id: facility_id,
                                status: "Active"
                            }
                        }
                    }
                ]
            },
            include: {
                user: { select: SAFE_USER_SELECT },
                facilityEnrollments: {
                    include: {
                        facility: {
                            select: {
                                facility_id: true,
                                facility_name: true,
                                type: true
                            }
                        }
                    }
                },
                pregnancies: {
                    include: {
                        prenatalVisits: true
                    }
                }
            }
        });

        return res.status(200).json({
            message: "Active mothers in facility retrieved",
            result: facilityMothers
        });

    } catch (error) {
        return next(error);
    }
};

const getProfile = async (req, res, next) => {
    try {
        const my_user_id = req.user.user_id;

        const myProfile = await prisma.mother.findUnique({
            where: { user_id: my_user_id },
            include: {
                user: {
                    select: {
                        ...SAFE_USER_SELECT,
                        facility: true
                    }
                },
                pregnancies: {
                    orderBy: { date_of_registration: "desc" },
                    include: {
                        prenatalVisits: {
                            orderBy: { visit_date: "desc" }
                        },
                        labScreenings: {
                            orderBy: { date_of_screening: "desc" }
                        },
                        supplementationRecords: {
                            orderBy: { date_given: "desc" }
                        },
                        deliveryOutcomes: {
                            orderBy: { delivery_date: "desc" },
                            include: {
                                newbornRecords: true,
                                postpartumVisits: {
                                    orderBy: { visit_date: "desc" }
                                }
                            }
                        }
                    }
                }
            }
        });

        return res.status(200).json({
            message: "My profile retrieved successfully",
            result: myProfile
        });

    } catch (error) {
        return next(error);
    }
};

const updateMyProfile = async (req, res, next) => {
    try {
        const my_user_id = req.user?.user_id;

        if (!my_user_id) {
            return res.status(401).json({ error: "Unauthorized access" });
        }

        const { first_name, middle_name, last_name, address, phone_number, email, birth_date, civil_status, blood_type, profile_url, photo_url } = req.body;
        const rawPhoto = profile_url || photo_url;

        const updatedProfile = await prisma.$transaction(async (prismaClient) => {
            const userData = {};
            if (first_name !== undefined) userData.first_name = first_name;
            if (middle_name !== undefined) userData.middle_name = middle_name;
            if (last_name !== undefined) userData.last_name = last_name;
            if (address !== undefined) userData.address = address;
            if (phone_number !== undefined) userData.phone_number = phone_number;
            if (email !== undefined) userData.email = email;
            if (rawPhoto !== undefined) userData.profile_url = rawPhoto;

            const user = await prismaClient.user.update({
                where: { user_id: my_user_id },
                data: userData
            });

            let mother = await prismaClient.mother.findUnique({
                where: { user_id: my_user_id }
            });

            if (mother) {
                const motherData = {};
                if (birth_date) {
                    motherData.birth_date = new Date(birth_date);
                    motherData.age = calculateAge(motherData.birth_date);
                }
                if (civil_status !== undefined) motherData.civil_status = civil_status;
                if (blood_type !== undefined) motherData.blood_type = blood_type;

                if (Object.keys(motherData).length > 0) {
                    mother = await prismaClient.mother.update({
                        where: { user_id: my_user_id },
                        data: motherData
                    });
                }
            }

            return { user, mother };
        });

        return res.status(200).json({
            message: "Profile updated successfully",
            result: updatedProfile
        });

    } catch (error) {
        return next(error);
    }
};

const uploadAvatar = async (req, res, next) => {
    try {
        const file = req.file;
        const my_user_id = req.user?.user_id || req.user?.id || 'anonymous';

        if (!file) {
            return res.status(400).json({ error: "No image file uploaded" });
        }

        const fileExt = path.extname(file.originalname) || '.jpg';
        const fileName = `avatar-${my_user_id}-${Date.now()}${fileExt}`;
        const { supabase } = require('../util/storage');

        if (supabase) {
            try {
                const filePath = `profiles/${fileName}`;
                const { error: uploadError } = await supabase.storage
                    .from('documents')
                    .upload(filePath, file.buffer, {
                        contentType: file.mimetype || 'image/jpeg',
                        upsert: true
                    });

                if (!uploadError) {
                    const { data: signedData } = await supabase.storage.from('documents').createSignedUrl(filePath, 60 * 60 * 24 * 365);
                    const fileUrl = signedData?.signedUrl || (supabase.storage.from('documents').getPublicUrl(filePath)).data?.publicUrl;

                    if (fileUrl) {
                        return res.status(200).json({
                            message: "Avatar uploaded successfully",
                            fileUrl: fileUrl,
                            profile_url: fileUrl,
                        });
                    }
                }
            } catch (supErr) {
                console.warn("Supabase avatar upload skipped/failed:", supErr.message);
            }
        }

        const uploadsDir = path.join(__dirname, '../public/uploads');

        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const localFilePath = path.join(uploadsDir, fileName);
        fs.writeFileSync(localFilePath, file.buffer);

        const protocol = req.protocol || 'http';
        const host = req.get('host') || 'localhost:6700';
        const baseUrl = `${protocol}://${host}`;
        const file_url = `${baseUrl}/uploads/${fileName}`;

        return res.status(200).json({
            message: "Avatar uploaded successfully",
            fileUrl: file_url,
            profile_url: file_url,
        });

    } catch (error) {
        return next(error);
    }
};

const assignFacilityByCode = async (req, res, next) => {
    try {
        const staff_facility_id = req.user?.facility_id;
        const { mother_code, mother_id, user_id } = req.body;
        const rawCode = (mother_code || mother_id || user_id || "").trim();

        if (!staff_facility_id) {
            return res.status(400).json({ error: "Staff user is not assigned to any health facility" });
        }

        if (!rawCode) {
            return res.status(400).json({ error: "Mother code or ID is required" });
        }

        let cleanId = rawCode;

        if (cleanId.includes("{") && cleanId.includes("}")) {
            try {
                const start = cleanId.indexOf("{");
                const end = cleanId.lastIndexOf("}");
                const parsed = JSON.parse(cleanId.substring(start, end + 1));
                cleanId = (parsed.mother_id || parsed.user_id || parsed.motherCode || parsed.code || parsed.id || cleanId).trim();
            } catch (e) {}
        }

        if (cleanId.toUpperCase().startsWith("MTH-")) {
            cleanId = cleanId.substring(4).trim();
        }

        if (!cleanId) {
            return res.status(400).json({ error: "Invalid mother code or ID provided" });
        }

        const lowerCleanId = cleanId.toLowerCase();
        const orConditions = [
            { mother_id: { equals: cleanId, mode: 'insensitive' } },
            { user_id: { equals: cleanId, mode: 'insensitive' } },
            { family_serial_no: { equals: cleanId, mode: 'insensitive' } },
            { user: { phone_number: cleanId } },
            { user: { email: { equals: cleanId, mode: 'insensitive' } } }
        ];

        if (cleanId.length >= 4) {
            orConditions.push(
                { mother_id: { startsWith: lowerCleanId, mode: 'insensitive' } },
                { user_id: { startsWith: lowerCleanId, mode: 'insensitive' } },
                { mother_id: { endsWith: lowerCleanId, mode: 'insensitive' } },
                { user_id: { endsWith: lowerCleanId, mode: 'insensitive' } }
            );
        }

        const motherRecord = await prisma.mother.findFirst({
            where: {
                OR: orConditions
            },
            include: { user: true }
        });

        if (!motherRecord || !motherRecord.user) {
            return res.status(404).json({ error: "No mother found matching the provided code" });
        }

        const targetUserId = motherRecord.user.user_id;

        const updatedUser = await prisma.user.update({
            where: { user_id: targetUserId },
            data: {
                facility_id: staff_facility_id,
                sync_status: "synced"
            },
            include: { facility: true }
        });

        if (staff_facility_id && motherRecord.mother_id) {
            await prisma.mother_Facility_Enrollment.upsert({
                where: {
                    mother_id_facility_id: {
                        mother_id: motherRecord.mother_id,
                        facility_id: staff_facility_id
                    }
                },
                update: { status: "Active" },
                create: {
                    mother_id: motherRecord.mother_id,
                    facility_id: staff_facility_id,
                    status: "Active"
                }
            }).catch(() => null);
        }

        const fullMother = await prisma.mother.findUnique({
            where: { mother_id: motherRecord.mother_id },
            include: {
                user: { include: { facility: true } },
                facilityEnrollments: { include: { facility: true } }
            }
        });

        return res.status(200).json({
            message: "Mother successfully assigned to facility",
            user: updatedUser,
            mother: fullMother
        });

    } catch (error) {
        return next(error);
    }
};

const enrollMotherInFacility = async (req, res, next) => {
    try {
        const { mother_id, facility_id, notes } = req.body;
        const targetFacilityId = facility_id || req.user?.facility_id;

        if (!mother_id || !targetFacilityId) {
            return res.status(400).json({ error: "Mother ID and Facility ID are required" });
        }

        const mother = await prisma.mother.findFirst({
            where: {
                OR: [
                    { mother_id: mother_id },
                    { user_id: mother_id }
                ]
            }
        });

        if (!mother) {
            return res.status(404).json({ error: "Mother not found" });
        }

        const enrollment = await prisma.mother_Facility_Enrollment.upsert({
            where: {
                mother_id_facility_id: {
                    mother_id: mother.mother_id,
                    facility_id: targetFacilityId
                }
            },
            update: {
                status: "Active",
                notes: notes || undefined
            },
            create: {
                mother_id: mother.mother_id,
                facility_id: targetFacilityId,
                status: "Active",
                notes: notes || null
            },
            include: {
                facility: {
                    select: {
                        facility_id: true,
                        facility_name: true,
                        type: true
                    }
                }
            }
        });

        return res.status(200).json({
            message: "Mother successfully enrolled in facility",
            result: enrollment
        });

    } catch (error) {
        return next(error);
    }
};

const getMotherFacilities = async (req, res, next) => {
    try {
        const { mother_id } = req.params;

        if (!mother_id) {
            return res.status(400).json({ error: "Mother ID is required" });
        }

        const mother = await prisma.mother.findFirst({
            where: {
                OR: [
                    { mother_id: mother_id },
                    { user_id: mother_id }
                ]
            },
            include: {
                user: {
                    include: { facility: true }
                },
                facilityEnrollments: {
                    include: { facility: true }
                }
            }
        });

        if (!mother) {
            return res.status(404).json({ error: "Mother not found" });
        }

        return res.status(200).json({
            message: "Mother facilities retrieved",
            homeFacility: mother.user?.facility || null,
            enrollments: mother.facilityEnrollments || []
        });

    } catch (error) {
        return next(error);
    }
};

module.exports = {
    registerMother,
    selfRegisterMother,
    updateMother,
    hardDeleteMother,
    softDeleteMother,
    getAllActiveMother,
    getAllMother,
    searchMotherByID,
    getAllActiveMotherByFacility,
    updateMyProfile,
    uploadAvatar,
    getProfile,
    assignFacilityByCode,
    getCompositeMotherProfile,
    enrollMotherInFacility,
    getMotherFacilities
};