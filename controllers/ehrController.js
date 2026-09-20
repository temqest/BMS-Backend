const prisma = require('../util/db');
const validate = require('../util/validation');
const { updateWithMVCC } = require('../services/conflicResolution');
const { resolveEntityId } = require('../middleware/idResolver');
const path = require('path');
const fs = require('fs');

const SAFE_DOC_MIMES = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'text/csv': 'csv',
};

async function saveBase64ToFile(fileUrl, req) {
    if (!fileUrl || typeof fileUrl !== 'string' || !fileUrl.startsWith('data:')) {
        return fileUrl;
    }

    try {
        const matches = fileUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

        if (matches && matches.length === 3) {
            const mimeType = matches[1].toLowerCase();
            const ext = SAFE_DOC_MIMES[mimeType] || 'pdf';

            const base64Data = matches[2];
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;

            try {
                const { supabase } = require('../util/storage');
                if (supabase && supabase.storage) {
                    const filePath = `ehr-documents/${fileName}`;
                    let bucketName = 'documents';
                    let { data, error } = await supabase.storage
                        .from(bucketName)
                        .upload(filePath, buffer, {
                            contentType: mimeType,
                            upsert: true,
                        });

                    if (error && (error.message?.includes('Bucket not found') || error.statusCode === '404' || error.code === 'NoSuchBucket')) {
                        bucketName = 'lab-files';
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
                        return secureUrl;
                    } else if (error) {
                        console.warn("Supabase storage upload skipped/failed:", error.message || error);
                    }
                }
            } catch (supabaseErr) {
                console.warn("Supabase storage upload error:", supabaseErr.message);
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

const uploadEhrFile = async (req, res, next) => {
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
                const filePath = `ehr-documents/${fileName}`;
                let bucketName = 'documents';
                let { data, error } = await supabase.storage
                    .from(bucketName)
                    .upload(filePath, file.buffer, {
                        contentType: file.mimetype,
                        upsert: true,
                    });

                if (error && (error.message?.includes('Bucket not found') || error.statusCode === '404' || error.code === 'NoSuchBucket')) {
                    bucketName = 'lab-files';
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

const registerEhrDocument = async (req, res, next) => {
    try {
        const {
            title,
            category,
            patient_name,
            security_level,
            format,
            size,
            file_url,
            uploaded_by,
            mother_id,
        } = req.body;

        if (!title) {
            return res.status(400).json({ error: "Document title is required" });
        }

        const facilityId = req.body.facility_id || req.user?.facility_id;
        if (!facilityId) {
            return res.status(400).json({ error: "Facility ID is required" });
        }

        let resolvedMotherId = null;
        if (mother_id) {
            const motherRecord = await prisma.mother.findFirst({
                where: { OR: [{ mother_id: mother_id }, { user_id: mother_id }] }
            });
            if (motherRecord) {
                resolvedMotherId = motherRecord.mother_id;
            }
        }

        const finalFileUrl = await saveBase64ToFile(file_url, req);

        const newDoc = await prisma.facility_Document.create({
            data: {
                facility_id: facilityId,
                mother_id: resolvedMotherId,
                title: title.trim(),
                category: category || "Clinical Protocols",
                patient_name: patient_name || "Facility General",
                security_level: security_level || "Confidential",
                format: format || "PDF",
                size: size || "1.0 MB",
                file_url: finalFileUrl,
                uploaded_by: uploaded_by || `${req.user?.first_name || "Healthcare"} ${req.user?.last_name || "Staff"}`.trim(),
                sync_status: "synced"
            }
        });

        return res.status(200).json({
            message: "EHR document successfully registered",
            data: newDoc
        });

    } catch (error) {
        return next(error);
    }
};

const getAllEhrDocuments = async (req, res, next) => {
    try {
        const facilityId = req.query.facility_id || req.user?.facility_id;
        const requestedMotherId = req.query.mother_id;
        const isSystemAdmin = req.user?.role === 'SystemAdmin';
        const isMother = req.user?.role === 'Mother';

        let filter = {};

        if (isMother) {
            const motherRecord = await prisma.mother.findFirst({
                where: { user_id: req.user?.user_id }
            });
            if (!motherRecord) {
                return res.status(200).json({ message: "EHR documents loaded", data: [] });
            }
            filter = { mother_id: motherRecord.mother_id };
        } else if (requestedMotherId) {
            const motherRecord = await prisma.mother.findFirst({
                where: { OR: [{ mother_id: requestedMotherId }, { user_id: requestedMotherId }] }
            });
            filter = motherRecord ? { mother_id: motherRecord.mother_id } : { mother_id: requestedMotherId };
        } else if (!isSystemAdmin && facilityId) {
            filter = { facility_id: facilityId };
        }

        const documents = await prisma.facility_Document.findMany({
            where: filter,
            orderBy: { created_at: "desc" },
            include: {
                mother: {
                    include: {
                        user: true
                    }
                }
            }
        });

        return res.status(200).json({
            message: "EHR documents loaded",
            data: documents
        });

    } catch (error) {
        return next(error);
    }
};

const deleteEhrDocument = async (req, res, next) => {
    try {
        const { id } = req.params;

        const doc = await prisma.facility_Document.findUnique({
            where: { document_id: id }
        });

        if (!doc) {
            return res.status(200).json({ message: "Document already deleted" });
        }

        await prisma.facility_Document.delete({
            where: { document_id: id }
        });

        return res.status(200).json({
            message: "EHR document deleted successfully"
        });

    } catch (error) {
        return next(error);
    }
};

module.exports = {
    uploadEhrFile,
    registerEhrDocument,
    getAllEhrDocuments,
    deleteEhrDocument
};
