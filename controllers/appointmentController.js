const prisma = require('../util/db');
const validate = require('../util/validation');
const { updateWithMVCC } = require('../services/conflicResolution');

const createAppointment = async (req, res, next) => {
    try {
        const {
            user_id,
            facility_id,
            appointment_date,
            appointment_time,
            appointment_type,
            reason,
        } = req.body;

        if (!user_id || !appointment_date || !appointment_time) {
            return res.status(400).json({ error: "Missing Required Fields!" });
        }

        if (!(await validate.isUserExist(user_id))) {
            return res.status(404).json({ error: "User Doesn't Exist!" });
        }

        if (facility_id && !(await validate.isFacilityExist(facility_id))) {
            return res.status(404).json({ error: "Facility Doesn't Exist!" });
        }

        if (new Date(appointment_date) < new Date()) {
            return res.status(400).json({ error: "Appointment Date Cannot Be In The Past!" });
        }

        const isConflict = await prisma.appointment.findFirst({
            where : {
                appointment_date : new Date(appointment_date),
            }
        })

        if (isConflict) {
            return res.status(400).json({ error: "Invalid Appointment Date, There is already an appointment set for this date" })
        }

        const newAppointment = await prisma.appointment.create({
            data: {
                user_id: user_id,
                facility_id: facility_id ? facility_id : null,
                appointment_date: new Date(appointment_date),
                appointment_time: appointment_time,
                appointment_type: appointment_type ? appointment_type : "Prenatal Visit",
                reason: reason ? reason : null,
                status: "scheduled",
                sync_status: "synced",
            },
        });

        return res.status(201).json({
            message: "Appointment Successfully Scheduled",
            data: newAppointment,
        });

    } catch (error) {
        return next(error);
    }
};

const getAllAppointments = async (req, res, next) => {
    try {
        const appointments = await prisma.appointment.findMany({
            include: {
                user: {
                    select: {
                        user_id: true,
                        first_name: true,
                        middle_name: true,
                        last_name: true,
                        role: true,
                        phone_number: true,
                        email: true,
                    },
                },
                facility: true,
            },
            orderBy: { appointment_date: 'asc' },
        });

        return res.status(200).json({
            message: "Appointments Retrieved Successfully",
            data: appointments,
        });

    } catch (error) {
        return next(error);
    }
};

const getAppointmentById = async (req, res, next) => {
    try {
        const { appointment_id } = req.params;

        if (!appointment_id) {
            return res.status(400).json({ error: "Missing Required Fields!" });
        }

        if (!(await validate.isAppointmentExist(appointment_id))) {
            return res.status(404).json({ error: "Appointment Doesn't Exist!" });
        }

        const appointment = await prisma.appointment.findUnique({
            where: { appointment_id: appointment_id },
            include: {
                user: {
                    select: {
                        user_id: true,
                        first_name: true,
                        middle_name: true,
                        last_name: true,
                        role: true,
                        phone_number: true,
                        email: true,
                    },
                },
                facility: true,
            },
        });

        return res.status(200).json({
            message: "Appointment Details Retrieved Successfully",
            data: appointment,
        });

    } catch (error) {
        return next(error);
    }
};

const getAppointmentsByUser = async (req, res, next) => {
    try {
        const { user_id } = req.params;

        if (!user_id) {
            return res.status(400).json({ error: "Missing Required Fields!" });
        }

        if (!(await validate.isUserExist(user_id))) {
            return res.status(404).json({ error: "User Doesn't Exist!" });
        }

        const appointments = await prisma.appointment.findMany({
            where: { user_id: user_id },
            include: {
                facility: true,
            },
            orderBy: { appointment_date: 'asc' },
        });

        return res.status(200).json({
            message: "User Appointments Retrieved Successfully",
            data: appointments,
        });

    } catch (error) {
        return next(error);
    }
};

const getAppointmentsByFacility = async (req, res, next) => {
    try {
        const { facility_id } = req.params;

        if (!facility_id) {
            return res.status(400).json({ error: "Missing Required Fields!" });
        }

        if (!(await validate.isFacilityExist(facility_id))) {
            return res.status(404).json({ error: "Facility Doesn't Exist!" });
        }

        const appointments = await prisma.appointment.findMany({
            where: { facility_id: facility_id },
            include: {
                user: {
                    select: {
                        user_id: true,
                        first_name: true,
                        middle_name: true,
                        last_name: true,
                        role: true,
                        phone_number: true,
                    },
                },
            },
            orderBy: { appointment_date: 'asc' },
        });

        return res.status(200).json({
            message: "Facility Appointments Retrieved Successfully",
            data: appointments,
        });

    } catch (error) {
        return next(error);
    }
};

const updateAppointment = async (req, res, next) => {
    try {
        const { appointment_id } = req.params;
        const {
            appointment_date,
            appointment_time,
            appointment_type,
            reason,
            status,
        } = req.body;

        if (!appointment_id) {
            return res.status(400).json({ error: "Missing Required Fields!" });
        }

        if (!(await validate.isAppointmentExist(appointment_id))) {
            return res.status(404).json({ error: "Appointment Doesn't Exist!" });
        }

        const { strategy, version, ...clientData } = req.body;
        if (clientData.appointment_date) {
            clientData.appointment_date = new Date(clientData.appointment_date);
        }

        const mvccResult = await updateWithMVCC('appointment', appointment_id, { version, ...clientData }, {
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
            message: "Appointment Updated Successfully",
            data: mvccResult.record,
            strategyUsed: mvccResult.strategyUsed
        });

    } catch (error) {
        return next(error);
    }
};

const cancelAppointment = async (req, res, next) => {
    try {
        const { appointment_id } = req.params;
        const { strategy, version } = req.body || {};

        if (!appointment_id) {
            return res.status(400).json({ error: "Missing Required Fields!" });
        }

        if (!(await validate.isAppointmentExist(appointment_id))) {
            return res.status(404).json({ error: "Appointment Doesn't Exist!" });
        }

        const mvccResult = await updateWithMVCC('appointment', appointment_id, {
            version,
            status: "cancelled"
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
            message: "Appointment Cancelled Successfully",
            data: mvccResult.record,
            strategyUsed: mvccResult.strategyUsed
        });

    } catch (error) {
        return next(error);
    }
};

const deleteAppointment = async (req, res, next) => {
    try {
        const { appointment_id } = req.params;

        if (!appointment_id) {
            return res.status(400).json({ error: "Missing Required Fields!" });
        }

        if (!(await validate.isAppointmentExist(appointment_id))) {
            return res.status(404).json({ error: "Appointment Doesn't Exist!" });
        }

        await prisma.appointment.delete({
            where: { appointment_id: appointment_id },
        });

        return res.status(200).json({
            message: "Appointment Deleted Successfully",
        });

    } catch (error) {
        return next(error);
    }
};

module.exports = {
    createAppointment,
    getAllAppointments,
    getAppointmentById,
    getAppointmentsByUser,
    getAppointmentsByFacility,
    updateAppointment,
    cancelAppointment,
    deleteAppointment,
};
