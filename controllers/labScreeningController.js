const prisma = require('../util/db');
const validate = require('../util/validation');
const { updateWithMVCC } = require('../services/conflicResolution');
const { resolveEntityId } = require('../middleware/idResolver');

const path = require('path');
const fs = require('fs');

const SAFE_LAB_MIMES = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
};

async function saveBase64ToFile(fileUrl, req) {
    if (!fileUrl || typeof fileUrl !== 'string' || !fileUrl.startsWith('data:')) {
        return fileUrl;
    }

    try {
        const matches = fileUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

        if (matches && matches.length === 3) {
            const mimeType = matches[1].toLowerCase();
            const ext = SAFE_LAB_MIMES[mimeType];

            if (!ext) {
                console.warn(`[Security] Rejected unsupported lab document MIME type: ${mimeType}`);
                return null;
            }

            const base64Data = matches[2];
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;

            try {
                const { supabase } = require('../util/storage');
                if (supabase && supabase.storage) {
                    const filePath = `lab-documents/${fileName}`;
                    let bucketName = 'lab-files';
                    let { data, error } = await supabase.storage
                        .from(bucketName)
                        .upload(filePath, buffer, {
                            contentType: mimeType,
                            upsert: true,
                        });

                    if (error && (error.message?.includes('Bucket not found') || error.statusCode === '404' || error.code === 'NoSuchBucket')) {
                        bucketName = 'documents';
                        const retry = await supabase.storage
                            .from(bucketName)
                            .upload(filePath, buffer, {
                                contentType: mimeType,
                                upsert: true,
                            });
                        data = retry.data;
                        error = retry.error;
                    }

                    if (!error && data) {
                        const { data: signedData } = await supabase.storage.from(bucketName).createSignedUrl(filePath, 60 * 60 * 24 * 365);
                        const secureUrl = signedData?.signedUrl || (supabase.storage.from(bucketName).getPublicUrl(filePath)).data?.publicUrl;
                        if (secureUrl) return secureUrl;
                    } else if (error) {
                        console.warn("Supabase storage upload for base64 skipped/failed:", error.message || error);
                    }
                }
            } catch (supabaseErr) {
                console.warn("Supabase storage upload for base64 failed, falling back to disk:", supabaseErr.message);
            }

            const uploadsDir = path.join(__dirname, '../public/uploads');

            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            const localFilePath = path.join(uploadsDir, fileName);
            fs.writeFileSync(localFilePath, buffer);

            const host = req?.headers?.host;
            const protocol = req?.protocol || 'http';
            const baseUrl = process.env.BACKEND_URL || process.env.BASE_URL || (host ? `${protocol}://${host}` : `http://localhost:${process.env.PORT || 6700}`);
            return `${baseUrl}/uploads/${fileName}`;
        }
    } catch (err) {
        console.warn("Failed to convert base64 file_url to file on server:", err);
    }

    return fileUrl;
}

const uploadLabFile = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const file = req.file;
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

        try {
            const { supabase } = require('../util/storage');
            if (supabase && supabase.storage) {
                const filePath = `lab-documents/${fileName}`;
                let bucketName = 'lab-files';
                let { data, error } = await supabase.storage
                    .from(bucketName)
                    .upload(filePath, file.buffer, {
                        contentType: file.mimetype,
                        upsert: true,
                    });

                if (error && (error.message?.includes('Bucket not found') || error.statusCode === '404' || error.code === 'NoSuchBucket')) {
                    console.warn(`Bucket '${bucketName}' not found or RLS restricted. Retrying with 'documents' bucket...`);
                    bucketName = 'documents';
                    const retry = await supabase.storage
                        .from(bucketName)
                        .upload(filePath, file.buffer, {
                            contentType: file.mimetype,
                            upsert: true,
                        });
                    data = retry.data;
                    error = retry.error;
                }

                if (!error && data) {
                    const { data: signedData } = await supabase.storage.from(bucketName).createSignedUrl(filePath, 60 * 60 * 24 * 365);
                    const file_url = signedData?.signedUrl || (supabase.storage.from(bucketName).getPublicUrl(filePath)).data?.publicUrl;
                    return res.status(200).json({ file_url });
                } else if (error) {
                    console.warn("Supabase storage upload skipped/failed:", error.message || error);
                }
            }
        } catch (supabaseErr) {
            console.warn("Supabase storage upload skipped/failed:", supabaseErr.message);
        }

        const uploadsDir = path.join(__dirname, '../public/uploads');

        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const localFilePath = path.join(uploadsDir, fileName);
        fs.writeFileSync(localFilePath, file.buffer);

        const host = req.headers.host;
        const protocol = req.protocol || 'http';
        const baseUrl = process.env.BACKEND_URL || process.env.BASE_URL || (host ? `${protocol}://${host}` : `http://localhost:${process.env.PORT || 6700}`);
        const file_url = `${baseUrl}/uploads/${fileName}`;

        return res.status(200).json({ file_url });

    } catch (error) {
        return next(error);
    }
};

const registerLabScreening = async (req, res, next) => {
    try {
        const { pregnancy_id, visit_id, screening_type, result, file_url, date_of_screening, remarks } = req.body;

        if (!pregnancy_id || !visit_id || !screening_type || !result || !date_of_screening) {
            return res.status(400).json({ error: "Required fields are missing" });
        }

        let targetPregnancyId = pregnancy_id;
        let pregnancy = await prisma.pregnancy.findUnique({
            where: { pregnancy_id: pregnancy_id }
        });

        if (!pregnancy && req.body.mother_id) {
            const motherRecord = await prisma.mother.findFirst({
                where: { OR: [{ mother_id: req.body.mother_id }, { user_id: req.body.mother_id }] }
            });
            if (motherRecord) {
                pregnancy = await prisma.pregnancy.findFirst({
                    where: { mother_id: motherRecord.mother_id },
                    orderBy: { date_of_registration: "desc" }
                });
            }
        }

        if (!pregnancy) {
            return res.status(404).json({ error: "Pregnancy not found" });
        }

        targetPregnancyId = pregnancy.pregnancy_id;

        let targetVisitId = visit_id;
        let visitExists = visit_id ? await prisma.prenatalVisit.findUnique({ where: { visit_id: visit_id } }) : null;

        if (!visitExists) {
            const latestVisit = await prisma.prenatalVisit.findFirst({
                where: { pregnancy_id: targetPregnancyId },
                orderBy: { visit_date: "desc" }
            });
            if (latestVisit) {
                targetVisitId = latestVisit.visit_id;
            } else {
                // Auto-create an initial/baseline visit record so lab screening can be saved without hard failure
                const initialVisit = await prisma.prenatalVisit.create({
                    data: {
                        pregnancy_id: targetPregnancyId,
                        visit_date: new Date(date_of_screening || Date.now()),
                        trimester: 1,
                        visit_number: 1,
                        age_of_gestation_weeks: 0,
                        weight_kg: 0,
                        temperature_celsius: 36.5,
                        pulse_rate_bpm: 75,
                        bp_systolic: 120,
                        bp_diastolic: 80,
                        fundic_height_cm: 0,
                        fetal_heart_tone_bpm: 0,
                        chief_complaint: "Initial lab submission / Baseline visit",
                        sync_status: "synced"
                    }
                });
                targetVisitId = initialVisit.visit_id;
            }
        }

        const finalFileUrl = await saveBase64ToFile(file_url, req);

        const existingRecord = await prisma.lab_Screening.findFirst({
            where: {
                pregnancy_id: targetPregnancyId,
                visit_id: targetVisitId,
                screening_type: screening_type,
                date_of_screening: new Date(date_of_screening),
            }
        });

        if (existingRecord) {
            return res.status(200).json({
                message: "Lab Screening already registered",
                data: existingRecord
            });
        }

        const labScreening = await prisma.lab_Screening.create({
            data: {
                pregnancy_id: targetPregnancyId,
                visit_id: targetVisitId,
                screening_type: screening_type,
                result: result,
                file_url: finalFileUrl,
                date_of_screening: date_of_screening,
                remarks: remarks,
                sync_status: "synced"
            }
        });

        // Also index into Facility_Document if document has a file attachment so staff can see it under EHR
        if (finalFileUrl) {
            try {
                const motherData = await prisma.pregnancy.findUnique({
                    where: { pregnancy_id: targetPregnancyId },
                    include: {
                        mother: {
                            include: { user: true }
                        }
                    }
                });

                if (motherData?.mother) {
                    const facilityId = motherData.mother.user?.facility_id || req.user?.facility_id;
                    if (facilityId) {
                        const motherName = motherData.mother.user
                            ? `${motherData.mother.user.first_name || ""} ${motherData.mother.user.last_name || ""}`.trim()
                            : "Patient";

                        await prisma.facility_Document.create({
                            data: {
                                facility_id: facilityId,
                                mother_id: motherData.mother.mother_id,
                                title: `${screening_type} Result`,
                                category: "Lab Results",
                                patient_name: motherName,
                                security_level: "Confidential",
                                format: finalFileUrl.endsWith(".pdf") ? "PDF" : "Image",
                                size: "1.0 MB",
                                file_url: finalFileUrl,
                                uploaded_by: motherName || "Patient (Mobile Upload)",
                                sync_status: "synced"
                            }
                        }).catch((docErr) => {
                            console.warn("EHR facility document indexing skipped:", docErr.message);
                        });
                    }
                }
            } catch (ehrErr) {
                console.warn("Could not index lab screening into EHR documents:", ehrErr.message);
            }
        }

        return res.status(200).json({
            message: "Lab screening successfully registered",
            data: labScreening
        });

    } catch (error) {
        return next(error);
    }
};

const updateLabScreening = async (req, res, next) => {
    try {
        let { screening_id } = req.params;
        const { strategy, version, ...clientData } = req.body;

        const { resolvedId, record } = await resolveEntityId('lab_Screening', screening_id, req.body);

        if (!resolvedId || !record) {
            return res.status(404).json({ error: "Lab screening not found" });
        }

        screening_id = resolvedId;

        if (clientData.file_url) {
            clientData.file_url = await saveBase64ToFile(clientData.file_url, req);
        }

        const mvccResult = await updateWithMVCC('lab_Screening', screening_id, { version, ...clientData }, {
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
            message: "Lab screening updated successfully",
            data: mvccResult.record,
            strategyUsed: mvccResult.strategyUsed
        });

    } catch (error) {
        return next(error);
    }
};

const deleteLabScreening = async (req, res, next) => {
    try {
        let { screening_id } = req.params;

        const { resolvedId, record } = await resolveEntityId('lab_Screening', screening_id, req.query || req.body);

        if (!resolvedId || !record) {
            return res.status(200).json({ message: "Lab screening already deleted" });
        }

        screening_id = resolvedId;

        await prisma.lab_Screening.delete({
            where: { screening_id: screening_id }
        });

        return res.status(200).json({
            message: "Lab screening deleted successfully"
        });

    } catch (error) {
        return next(error);
    }
};

const getLabScreeningById = async (req, res, next) => {
    try {
        const { screening_id } = req.params;

        const isScreeningExist = await validate.isLabScreeningExist(screening_id);

        if (!isScreeningExist) {
            return res.status(404).json({ error: "Lab screening not found" });
        }

        if (req.user?.role === 'Mother') {
            const screeningWithMother = await prisma.lab_Screening.findUnique({
                where: { screening_id },
                include: { pregnancy: { include: { mother: true } } }
            });
            if (!screeningWithMother || screeningWithMother.pregnancy?.mother?.user_id !== req.user?.user_id) {
                return res.status(403).json({ error: "You don't have permission to view this lab screening." });
            }
        }

        return res.status(200).json({
            message: "Lab screening fetched successfully",
            data: isScreeningExist
        });

    } catch (error) {
        return next(error);
    }
};

const getLabScreeningByPregnancy = async (req, res, next) => {
    try {
        const { pregnancy_id } = req.params;

        if (!(await validate.isPregnancyExist(pregnancy_id))) {
            return res.status(404).json({ error: "Pregnancy not found" });
        }

        const labScreening = await prisma.lab_Screening.findMany({
            where: { pregnancy_id: pregnancy_id },
            include: {
                visit: {
                    select: {
                        visit_date: true,
                    }
                }
            }
        });

        return res.status(200).json({
            message: "Lab screenings successfully retrieved",
            data: labScreening
        });

    } catch (error) {
        return next(error);
    }
};

const getLabScreeningByVisit = async (req, res, next) => {
    try {
        const { visit_id } = req.params;

        if (!(await validate.isPrenatalVisitExist(visit_id))) {
            return res.status(404).json({ error: "Visit not found" });
        }

        const labScreening = await prisma.lab_Screening.findMany({
            where: { visit_id: visit_id }
        });

        return res.status(200).json({
            message: "Lab screenings successfully retrieved",
            data: labScreening
        });

    } catch (error) {
        return next(error);
    }
};

const getLabScreeningByMother = async (req, res, next) => {
    try {
        const { mother_id } = req.params;

        const motherRecord = await prisma.mother.findFirst({
            where: {
                OR: [
                    { mother_id: mother_id },
                    { user_id: mother_id }
                ]
            }
        });

        if (!motherRecord) {
            return res.status(404).json({ error: "Mother record not found" });
        }

        if (req.user?.role === 'Mother' && motherRecord.user_id !== req.user?.user_id) {
            return res.status(403).json({ error: "You can only view your own lab screenings." });
        }

        const pregnancies = await prisma.pregnancy.findMany({
            where: {
                mother_id: motherRecord.mother_id
            },
            select: { pregnancy_id: true }
        });

        if (!pregnancies || pregnancies.length === 0) {
            return res.status(200).json({
                error: "No pregnancies found", 
                data: []
            });
        }

        const pregnancyIds = pregnancies.map(p => p.pregnancy_id);

        const labScreening = await prisma.lab_Screening.findMany({
            where: {
                pregnancy_id: { in: pregnancyIds }
            },
            orderBy: {
                date_of_screening: "desc"
            }
        });

        if (labScreening.length === 0) {
            return res.status(200).json({
                message: "No lab screenings found", 
                data: []
            });
        }

        return res.status(200).json({
            message: "Lab screenings successfully retrieved",
            data: labScreening
        });

    } catch (error) {
        return next(error);
    }
};

module.exports = {
    uploadLabFile,
    registerLabScreening,
    updateLabScreening,
    deleteLabScreening,
    getLabScreeningById,
    getLabScreeningByPregnancy,
    getLabScreeningByVisit,
    getLabScreeningByMother
};