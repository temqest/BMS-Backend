const prisma = require('../util/db');
const validate = require('../util/validation');
const { logAuditTrail } = require('../services/auditService');

const createAuditTrail = async (req, res, next) => {
    try {
        const { user_id, table_name, action_type, previous_state, new_state } = req.body;

        if (!user_id || !table_name || !action_type) {
            return res.status(400).json({ error: "Missing Required Fields" });
        }

        if (!(await validate.isUserExist(user_id))) {
            return res.status(404).json({ error: "User Doesn't Exist" });
        }

        const audit = await logAuditTrail({
            userId: user_id,
            tableName: table_name,
            actionType: action_type,
            previousState: previous_state,
            newState: new_state
        });

        return res.status(200).json({
            message: "Audit Trail Successfully Logged!",
            data: audit
        });

    } catch (error) {
        return next(error);
    }
};

const getAllAuditLogs = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.page_size) || 10;
        const skip = (page - 1) * pageSize;
        const limit = pageSize;

        const allLogs = await prisma.audit_Revision_Log.findMany({
            skip: skip,
            take: limit,
            orderBy: {
                client_timestamp: "desc"
            }
        });

        return res.status(200).json({
            message: "All Audit Logs Retrieved Successfully",
            data: allLogs
        });

    } catch (error) {
        return next(error);
    }
};

const getAllAuditLogsByUser = async (req, res, next) => {
    try {
        const user_id = req.params.user_id || req.query.user_id || req.body.user_id;

        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.page_size) || 10;
        const skip = (page - 1) * pageSize;
        const limit = pageSize;

        if (!user_id) {
            return res.status(400).json({ error: "Missing User_ID!" });
        }

        if (!(await validate.isUserExist(user_id))) {
            return res.status(404).json({ error: "User Doesn't Exist" });
        }

        const userAudit = await prisma.audit_Revision_Log.findMany({
            where: { user_id: user_id },
            skip: skip,
            take: limit,
            orderBy: {
                client_timestamp: "desc"
            }
        });

        return res.status(200).json({
            message: "User Audit Logs Successfully Retrieved",
            data: userAudit
        });

    } catch (error) {
        return next(error);
    }
};

const getAuditLogByTable = async (req, res, next) => {
    try {
        const table_name = req.params.table_name || req.query.table_name || req.body.table_name;

        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.page_size) || 10;
        const skip = (page - 1) * pageSize;
        const limit = pageSize;

        if (!table_name) {
            return res.status(400).json({ error: "Missing Table_Name!" });
        }

        const tableLogs = await prisma.audit_Revision_Log.findMany({
            where: {
                table_name: table_name
            },
            skip: skip,
            take: limit,
            orderBy: {
                client_timestamp: "desc"
            }
        });

        return res.status(200).json({
            message: `All Audit Logs for Table ${table_name} Successfully Retrieved!`,
            data: tableLogs
        });

    } catch (error) {
        return next(error);
    }
};

module.exports = {
    createAuditTrail,
    getAllAuditLogs,
    getAllAuditLogsByUser,
    getAuditLogByTable
};
