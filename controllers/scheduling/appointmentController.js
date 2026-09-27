const prisma = require('../../util/db');
const validate = require('../../util/validation');
const { updateWithMVCC } = require('../../services/conflicResolution');
const { resolveEntityId } = require('../../middleware/idResolver');

const sortAppointments = (appointments) => {
    if (!Array.isArray(appointments)) return appointments;

    return [...appointments].sort((a, b) => {
        const getPriority = (status) => {
            const s = (status || '').toLowerCase().trim();
            if (s === 'confirmed' || s === 'scheduled' || s === 'active' || s === 'pending') {
                return 1;
            }
            if (s === 'completed') {
                return 2;
            }
            if (s === 'cancelled' || s === 'canceled' || s === 'missed' || s === 'rejected') {
                return 3;
            }
            return 1;
        };

        const priorityA = getPriority(a.status);
        const priorityB = getPriority(b.status);

        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }

        const dateA = a.appointment_date ? new Date(a.appointment_date).getTime() : 0;
        const dateB = b.appointment_date ? new Date(b.appointment_date).getTime() : 0;

        if (dateA !== dateB) {
            return dateA - dateB;
        }

        const timeA = (a.appointment_time || '').toString();
        const timeB = (b.appointment_time || '').toString();
        return timeA.localeCompare(timeB);
    });
};

const createAppointment = async (req, res, next) => {
    try {
        const {
            user_id,
            mother_id,
            facility_id,
            appointment_date,
            appointment_time,
            appointment_type,
            reason,
        } = req.body;

        const lookupId = user_id || mother_id;
        let userRecord = null;
        let targetUserId = null;

        if (lookupId) {
            userRecord = await prisma.user.findFirst({
                where: {
                    OR: [
                        { user_id: lookupId },
                        { mother: { mother_id: lookupId } }
                    ]
                }
            });
            targetUserId = userRecord?.user_id;
        }

        if (!userRecord) {
            return res.status(404).json({ error: "Patient user record not found. Please ensure the mother is registered." });
        }

        const [facilityRecord, isConflict] = await Promise.all([
            facility_id ? prisma.facility.findUnique({ where: { facility_id } }) : Promise.resolve(true),
            prisma.appointment.findFirst({
                where: {
                    user_id: targetUserId,
                    appointment_date: new Date(appointment_date),
                    appointment_time: appointment_time,
                }
            })
        ]);

        if (facility_id && !facilityRecord) {
            return res.status(404).json({ error: "Facility not found" });
        }

        if (isConflict) {
            return res.status(200).json({
                message: "Appointment already scheduled for this user at this date/time",
                data: isConflict,
            });
        }

        const targetFacilityId = req.user?.role === 'SystemAdmin'
            ? (facility_id || null)
            : (req.user?.facility_id || facility_id || null);

        const newAppointment = await prisma.appointment.create({
            data: {
                user_id: targetUserId,
                facility_id: targetFacilityId,
                appointment_date: new Date(appointment_date),
                appointment_time: appointment_time,
                appointment_type: appointment_type ? appointment_type : "Prenatal Visit",
                reason: reason ? reason : null,
                status: "scheduled",
                sync_status: "synced",
            },
        });

        return res.status(201).json({
            message: "Appointment successfully scheduled",
            data: newAppointment,
        });

    } catch (error) {
        return next(error);
    }
};

const getAllAppointments = async (req, res, next) => {
    try {
        const whereClause = req.user?.role === 'SystemAdmin' 
            ? {} 
            : {
                OR: [
                    { facility_id: req.user?.facility_id },
                    { user: { facility_id: req.user?.facility_id } }
                ]
              };

        const appointments = await prisma.appointment.findMany({
            where: whereClause,
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

        const sortedAppointments = sortAppointments(appointments);

        return res.status(200).json({
            message: "Appointments retrieved successfully",
            data: sortedAppointments,
        });

    } catch (error) {
        return next(error);
    }
};

const getAppointmentById = async (req, res, next) => {
    try {
        const { appointment_id } = req.params;

        if (!appointment_id) {
            return res.status(400).json({ error: "Appointment ID is required" });
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

        if (!appointment) {
            return res.status(404).json({ error: "Appointment not found" });
        }

        if (req.user?.role === 'Mother' && appointment.user_id !== req.user?.user_id) {
            return res.status(403).json({ error: "You cannot view another patient's appointment." });
        }

        if (req.user?.role !== 'SystemAdmin' && req.user?.role !== 'Mother' && appointment.facility_id && appointment.facility_id !== req.user?.facility_id) {
            return res.status(403).json({ error: "You cannot access appointments for another facility." });
        }

        return res.status(200).json({
            message: "Appointment details retrieved successfully",
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
            return res.status(400).json({ error: "User ID is required" });
        }

        if (req.user?.role === 'Mother' && user_id !== req.user?.user_id) {
            return res.status(403).json({ error: "You can only view your own appointments." });
        }

        if (!(await validate.isUserExist(user_id))) {
            return res.status(404).json({ error: "User not found" });
        }

        const appointments = await prisma.appointment.findMany({
            where: { user_id: user_id },
            include: {
                facility: true,
            },
            orderBy: { appointment_date: 'asc' },
        });

        const sortedAppointments = sortAppointments(appointments);

        return res.status(200).json({
            message: "User appointments retrieved successfully",
            data: sortedAppointments,
        });

    } catch (error) {
        return next(error);
    }
};

const getAppointmentsByFacility = async (req, res, next) => {
    try {
        const { facility_id } = req.params;

        if (!facility_id) {
            return res.status(400).json({ error: "Facility ID is required" });
        }

        if (req.user?.role !== 'SystemAdmin' && facility_id !== req.user?.facility_id) {
            return res.status(403).json({ error: "You cannot view appointments for another facility." });
        }

        if (!(await validate.isFacilityExist(facility_id))) {
            return res.status(404).json({ error: "Facility not found" });
        }

        const appointments = await prisma.appointment.findMany({
            where: {
                OR: [
                    { facility_id: facility_id },
                    { user: { facility_id: facility_id } }
                ]
            },
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

        const sortedAppointments = sortAppointments(appointments);

        return res.status(200).json({
            message: "Facility appointments retrieved successfully",
            data: sortedAppointments,
        });

    } catch (error) {
        return next(error);
    }
};

const updateAppointment = async (req, res, next) => {
    try {
        let { appointment_id } = req.params;

        if (!appointment_id) {
            return res.status(400).json({ error: "Appointment ID is required" });
        }

        const { resolvedId, record } = await resolveEntityId('appointment', appointment_id, req.body);

        if (!resolvedId || !record) {
            return res.status(404).json({ error: "Appointment not found" });
        }

        appointment_id = resolvedId;

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
            message: "Appointment updated successfully",
            data: mvccResult.record,
            strategyUsed: mvccResult.strategyUsed
        });

    } catch (error) {
        return next(error);
    }
};

const cancelAppointment = async (req, res, next) => {
    try {
        let { appointment_id } = req.params;
        const { strategy, version } = req.body || {};

        if (!appointment_id) {
            return res.status(400).json({ error: "Appointment ID is required" });
        }

        const { resolvedId, record } = await resolveEntityId('appointment', appointment_id, req.body || {});

        if (!resolvedId || !record) {
            return res.status(404).json({ error: "Appointment not found" });
        }

        appointment_id = resolvedId;

        if (req.user?.role === 'Mother' && record.user_id !== req.user?.user_id) {
            return res.status(403).json({ error: "You can only cancel your own appointments." });
        }

        if (req.user?.role !== 'SystemAdmin' && req.user?.role !== 'Mother' && record.facility_id && record.facility_id !== req.user?.facility_id) {
            return res.status(403).json({ error: "You cannot cancel appointments for another facility." });
        }

        if (record.status && record.status.toLowerCase() === "completed") {
            return res.status(400).json({ error: "Completed appointments cannot be cancelled." });
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
            message: "Appointment cancelled successfully",
            data: mvccResult.record,
            strategyUsed: mvccResult.strategyUsed
        });

    } catch (error) {
        return next(error);
    }
};

const deleteAppointment = async (req, res, next) => {
    try {
        let { appointment_id } = req.params;

        if (!appointment_id) {
            return res.status(400).json({ error: "Appointment ID is required" });
        }

        const { resolvedId, record } = await resolveEntityId('appointment', appointment_id, req.query || req.body);

        if (!resolvedId || !record) {
            return res.status(200).json({ message: "Appointment already deleted" });
        }

        if (req.user?.role === 'Mother') {
            return res.status(403).json({ error: "Only clinical staff can delete appointment records." });
        }

        if (req.user?.role !== 'SystemAdmin' && record.facility_id && record.facility_id !== req.user?.facility_id) {
            return res.status(403).json({ error: "You cannot delete appointments for another facility." });
        }

        await prisma.appointment.delete({
            where: { appointment_id: appointment_id },
        });

        return res.status(200).json({
            message: "Appointment deleted successfully",
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
