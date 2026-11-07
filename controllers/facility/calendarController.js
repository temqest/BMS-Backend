const prisma = require('../../util/db');

const create_appointment_slots = async (req, res, next) => {
    try {
        const { facility_id, day, time, slots } = req.body;

        if (!facility_id || !day || !time || slots === undefined) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const isSuper = req.user?.role === 'SystemAdmin' || req.user?.role === 'SuperAdmin';
        if (!isSuper && req.user?.facility_id && facility_id !== req.user.facility_id) {
            return res.status(403).json({ error: "Access denied. Cannot create schedule for another facility." });
        }

        const parsedDate = new Date(day);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ error: "Invalid date format" });
        }

        const slotCount = parseInt(slots, 10);
        if (isNaN(slotCount) || slotCount <= 0) {
            return res.status(400).json({ error: "Slots must be a positive number" });
        }

        const data = await prisma.facility_Schedule.create({
            data: {
                facility_id: facility_id,
                available_date: parsedDate,
                available_time_slot: time,
                max_slots: slotCount
            }
        });

        return res.status(201).json({
            message: "Appointment slots successfully created",
            data: data
        });

    } catch (err) {
        if (err.code === 'P2002') {
            return res.status(409).json({ 
                error: "A schedule slot already exists for this facility, date, and time" 
            });
        }
        return next(err);
    }
};

const update_appointment_slots = async (req, res, next) => {
    try {
        const { schedule_id, facility_id, day, slots, time, is_available } = req.body;

        if (!schedule_id || !facility_id) {
            return res.status(400).json({ error: "schedule_id and facility_id are required" });
        }

        const isSuper = req.user?.role === 'SystemAdmin' || req.user?.role === 'SuperAdmin';
        if (!isSuper && req.user?.facility_id && facility_id !== req.user.facility_id) {
            return res.status(403).json({ error: "Access denied. Cannot modify another facility's schedule." });
        }

        const schedule = await prisma.facility_Schedule.findFirst({
            where: {
                schedule_id: schedule_id,
                facility_id: facility_id
            }
        });

        if (!schedule) {
            return res.status(404).json({ error: "Schedule slot not found for this facility" });
        }

        const updateData = {};

        if (day) {
            const parsedDate = new Date(day);
            if (isNaN(parsedDate.getTime())) {
                return res.status(400).json({ error: "Invalid date format" });
            }
            updateData.available_date = parsedDate;
        }

        if (time) {
            updateData.available_time_slot = time;
        }

        if (slots !== undefined) {
            const slotCount = parseInt(slots, 10);
            if (isNaN(slotCount) || slotCount <= 0) {
                return res.status(400).json({ error: "Slots must be a positive number" });
            }
            if (slotCount < schedule.booked_slots) {
                return res.status(400).json({
                    error: `Cannot reduce capacity below currently booked slots (${schedule.booked_slots})`
                });
            }
            updateData.max_slots = slotCount;
        }

        if (typeof is_available === 'boolean') {
            updateData.is_available = is_available;
        }

        const updated = await prisma.facility_Schedule.update({
            where: { schedule_id: schedule_id },
            data: updateData
        });

        return res.status(200).json({
            message: "Schedule updated successfully",
            data: updated
        });

    } catch (err) {
        if (err.code === 'P2002') {
            return res.status(409).json({
                error: "Another slot already exists for this date and time"
            });
        }
        return next(err);
    }
};

const delete_appointment_slots = async (req, res, next) => {
    try {
        const { schedule_id } = req.params;
        const { facility_id } = req.body;

        if (!schedule_id) {
            return res.status(400).json({ error: "schedule_id parameter is required" });
        }

        const whereCondition = { schedule_id };
        if (facility_id) {
            whereCondition.facility_id = facility_id;
        }

        const schedule = await prisma.facility_Schedule.findFirst({
            where: whereCondition
        });

        if (!schedule) {
            return res.status(404).json({ error: "Schedule slot not found" });
        }

        const isSuper = req.user?.role === 'SystemAdmin' || req.user?.role === 'SuperAdmin';
        if (!isSuper && req.user?.facility_id && schedule.facility_id !== req.user.facility_id) {
            return res.status(403).json({ error: "Access denied. Cannot delete another facility's schedule." });
        }

        if (schedule.booked_slots > 0) {
            return res.status(400).json({
                error: `Cannot delete schedule slot with ${schedule.booked_slots} existing booking(s). Mark it as unavailable instead.`
            });
        }

        await prisma.facility_Schedule.delete({
            where: { schedule_id }
        });

        return res.status(200).json({
            message: "Schedule slot successfully deleted"
        });

    } catch (err) {
        return next(err);
    }
};

const get_facility_schedules = async (req, res, next) => {
    try {
        const { facility_id } = req.params;
        const { start_date, end_date, only_available } = req.query;

        if (!facility_id) {
            return res.status(400).json({ error: "facility_id parameter is required" });
        }

        const where = { facility_id };

        if (only_available === 'true') {
            where.is_available = true;
        }

        if (start_date || end_date) {
            where.available_date = {};
            if (start_date) {
                const parsedStart = new Date(start_date);
                if (!isNaN(parsedStart.getTime())) {
                    where.available_date.gte = parsedStart;
                }
            }
            if (end_date) {
                const parsedEnd = new Date(end_date);
                if (!isNaN(parsedEnd.getTime())) {
                    where.available_date.lte = parsedEnd;
                }
            }
        }

        const schedules = await prisma.facility_Schedule.findMany({
            where,
            orderBy: [
                { available_date: 'asc' },
                { available_time_slot: 'asc' }
            ]
        });

        return res.status(200).json({
            facility_id,
            count: schedules.length,
            data: schedules
        });

    } catch (err) {
        return next(err);
    }
};

const get_schedule_by_id = async (req, res, next) => {
    try {
        const { schedule_id } = req.params;

        if (!schedule_id) {
            return res.status(400).json({ error: "schedule_id parameter is required" });
        }

        const schedule = await prisma.facility_Schedule.findUnique({
            where: { schedule_id }
        });

        if (!schedule) {
            return res.status(404).json({ error: "Schedule slot not found" });
        }

        const isSuper = req.user?.role === 'SystemAdmin' || req.user?.role === 'SuperAdmin';
        if (!isSuper && req.user?.facility_id && schedule.facility_id !== req.user.facility_id) {
            return res.status(403).json({ error: "Access denied. Cannot delete another facility's schedule." });
        }

        return res.status(200).json({
            data: schedule
        });

    } catch (err) {
        return next(err);
    }
};

module.exports = {
    create_appointment_slots,
    update_appointment_slots,
    delete_appointment_slots,
    get_facility_schedules,
    get_schedule_by_id
};
