const prisma = require('../util/db');
const validate = require('../util/validation');
const { updateWithMVCC } = require('../services/conflicResolution');

const path = require('path');
const fs = require('fs');

function saveBase64ToFile(fileUrl) {
    if (!fileUrl || typeof fileUrl !== 'string' || !fileUrl.startsWith('data:')) {
        return fileUrl;
    }
    try {
        const matches = fileUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
            const mimeType = matches[1];
            const base64Data = matches[2];
            const buffer = Buffer.from(base64Data, 'base64');
            const ext = mimeType.split('/')[1] || 'jpg';
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
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
            const filePath = `lab-documents/${fileName}`;
            const { data, error } = await supabase.storage
                .from('lab-files')
                .upload(filePath, file.buffer, {
                    contentType: file.mimetype,
                    upsert: true,
                });

            if (!error && data) {
                const { data: publicUrlData } = supabase.storage.from('lab-files').getPublicUrl(filePath);
                return res.status(200).json({ file_url: publicUrlData.publicUrl });
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

        const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 6700}`;
        const file_url = `${baseUrl}/uploads/${fileName}`;

        return res.status(200).json({ file_url });

    } catch (error) {
        return next(error);
    }
};

const registerLabScreening = async (req, res, next) => {
    try {
        const {pregnancy_id, visit_id, screening_type, result, file_url, date_of_screening, remarks} = req.body;

        if(!pregnancy_id || !visit_id || !screening_type || !result || !date_of_screening) {
            return res.status(400).json({error : "Missing Required Fields"});
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
            return res.status(404).json({ error: "Pregnancy Not Found!" });
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
                const defaultHealthWorker = req.user?.user_id || (await prisma.user.findFirst({ where: { is_active: true } }))?.user_id || "system";
                const createdVisit = await prisma.prenatalVisit.create({
                    data: {
                        pregnancy_id: targetPregnancyId,
                        health_worker_id: defaultHealthWorker,
                        trimester: 1,
                        visit_number: 1,
                        age_of_gestation_weeks: 12,
                        weight_kg: 50,
                        temperature_celsius: 36.5,
                        pulse_rate_bpm: 75,
                        bp_systolic: 120,
                        bp_diastolic: 80,
                        sync_status: "synced",
                    }
                });
                targetVisitId = createdVisit.visit_id;
            }
        }

        const finalFileUrl = saveBase64ToFile(file_url);

        const labScreening = await prisma.lab_Screening.create({
            data : {
                pregnancy_id : targetPregnancyId,
                visit_id : targetVisitId,
                screening_type : screening_type,
                result : result,
                file_url : finalFileUrl,
                date_of_screening : date_of_screening,
                remarks : remarks,
                sync_status : "synced"
            }
        });

        res.status(200).json({
            message : "Lab Screening Successfully Registered!",
            data : labScreening
        });

    } catch (error) {
        return next(error);
    }
};

const updateLabScreening = async (req, res, next) => {
    try {
        const {screening_id} = req.params;
        const { strategy, version, ...clientData } = req.body;

        if(!(await validate.isLabScreeningExist(screening_id))) {
            return res.status(404).json({error: "Lab Screening Not Found!"});
        }

        if (clientData.file_url) {
            clientData.file_url = saveBase64ToFile(clientData.file_url);
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
            message : "Lab Screening Updated Successfully!",
            data : mvccResult.record,
            strategyUsed: mvccResult.strategyUsed
        });

    } catch (error) {
        return next(error);
    }
};

const deleteLabScreening = async (req, res, next) => {
    try {
        const {screening_id} = req.params;

        if(!(await validate.isLabScreeningExist(screening_id))) {
            return res.status(404).json({error: "Lab Screening Not Found!"});
        }

        await prisma.lab_Screening.delete({
            where : {screening_id : screening_id}
        });

        return res.status(200).json({
            message : "Lab Screening Deleted Successfully!"
        });

    } catch (error) {
        return next(error);
    }
};

const getLabScreeningById = async (req, res, next) => {
    try {
        const {screening_id} = req.params;

        const isScreeningExist = await validate.isLabScreeningExist(screening_id);
        if(!isScreeningExist) {
            return res.status(404).json({error: "Lab Screening Not Found!"});
        }

        return res.status(200).json({
            message : "Lab Screening Fetched Successfully!",
            data : isScreeningExist
        });

    } catch (error) {
        return next(error);
    }
};

const getLabScreeningByPregnancy = async (req, res, next) => {
    try {
        const {pregnancy_id} = req.params;

        if(!(await validate.isPregnancyExist(pregnancy_id))) {
            return res.status(404).json({error: "Pregnancy Not Found!"});
        }

        const labScreening = await prisma.lab_Screening.findMany({
            where : {pregnancy_id : pregnancy_id},
            include : {
                visit : {
                    select : {
                        visit_date : true,
                    }
                }
            }
        });

        return res.status(200).json({
            message : "Lab Screening Successfully Retrived",
            data : labScreening
        });

    } catch (error) {
        return next(error);
    }
};

const getLabScreeningByVisit = async (req, res, next) => {
    try {
        const {visit_id} = req.params;

        if(!(await validate.isPrenatalVisitExist(visit_id))) {
            return res.status(404).json({error: "Visit Not Found!"});
        }

        const labScreening = await prisma.lab_Screening.findMany({
            where : {visit_id : visit_id}
        });

        return res.status(200).json({
            message : "Lab Screening Successfully Retrived",
            data : labScreening
        });

    } catch (error) {
        return next(error);
    }
};

const getLabScreeningByMother = async (req, res, next) => {

    try {

        const {mother_id} = req.params;

        const motherRecord = await prisma.mother.findFirst({
            where: {
                OR: [
                    { mother_id: mother_id },
                    { user_id: mother_id }
                ]
            }
        });

        if (!motherRecord) {
            return res.status(404).json({ error: "Mother Doesn't Exist" });
        }

        const pregnancies = await prisma.pregnancy.findMany({
            where: {
                mother_id: motherRecord.mother_id
            },
            select : {pregnancy_id : true}
        })

        if(!pregnancies || pregnancies.length === 0) {
            return res.status(200).json({error : "No Pregnancies Found", 
                data: []
            });
        }

        
        const pregnancyIds = pregnancies.map(p => p.pregnancy_id);

        const labScreening = await prisma.lab_Screening.findMany({
            where : {
                pregnancy_id : {in : pregnancyIds}
            }, orderBy : {
                date_of_screening : "desc"
            }
        });

        if(labScreening.length === 0) {
            return res.status(200).json({
                message : "No Lab Screenings Found", 
                data : []
            })
        }

        return res.status(200).json({
            message : "Lab Screenings Successfully Retrieved",
            data : labScreening
        })

    } catch (error) {
        return next(error)
    }
}

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