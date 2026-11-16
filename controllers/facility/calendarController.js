const prisma = require('../../util/db');

const create_appointment_slots = async (req, res, next) => {
    try {
        const isAdminOrAbove = ['SystemAdmin', 'Admin', 'SuperAdmin'].includes(req.user?.role);
        if (!isAdminOrAbove) {
            return res.status(403).json({ error: "Access denied. Only administrators and above can edit schedule." });
        }

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
        const isAdminOrAbove = ['SystemAdmin', 'Admin', 'SuperAdmin'].includes(req.user?.role);
        if (!isAdminOrAbove) {
            return res.status(403).json({ error: "Access denied. Only administrators and above can edit schedule." });
        }

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
        const isAdminOrAbove = ['SystemAdmin', 'Admin', 'SuperAdmin'].includes(req.user?.role);
        if (!isAdminOrAbove) {
            return res.status(403).json({ error: "Access denied. Only administrators and above can delete schedule." });
        }

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

function getDayRange(dateInput) {
    const raw = typeof dateInput === 'string' ? dateInput.trim() : dateInput;
    let year, month, day;
    if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
        const parts = raw.slice(0, 10).split('-').map(Number);
        year = parts[0];
        month = parts[1] - 1;
        day = parts[2];
    } else {
        const d = new Date(raw);
        year = d.getFullYear();
        month = d.getMonth();
        day = d.getDate();
    }
    const start = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { start, end, dateStr };
}

const save_facility_closed_date = async (req, res, next) => {
    try {
        const facility_id = req.params.facility_id || req.body.facility_id;
        const { date, reason } = req.body;

        if (!facility_id || !date) {
            return res.status(400).json({ error: "facility_id and date are required" });
        }

        const isSuper = req.user?.role === 'SystemAdmin' || req.user?.role === 'SuperAdmin';
        if (!isSuper && req.user?.facility_id && facility_id !== req.user.facility_id) {
            return res.status(403).json({ error: "Access denied. Cannot modify another facility's closed dates." });
        }

        const { start, end, dateStr } = getDayRange(date);
        if (isNaN(start.getTime())) {
            return res.status(400).json({ error: "Invalid date format" });
        }

        const existing = await prisma.facility_Schedule.findFirst({
            where: {
                facility_id,
                available_date: {
                    gte: start,
                    lte: end,
                }
            }
        });

        const timeSlotLabel = reason ? String(reason).trim() : "Clinic Closed / Exemption";

        let result;
        if (existing) {
            result = await prisma.facility_Schedule.update({
                where: { schedule_id: existing.schedule_id },
                data: {
                    is_available: false,
                    max_slots: 0,
                    available_time_slot: timeSlotLabel,
                }
            });
        } else {
            result = await prisma.facility_Schedule.create({
                data: {
                    facility_id,
                    available_date: start,
                    available_time_slot: timeSlotLabel,
                    max_slots: 0,
                    is_available: false,
                }
            });
        }

        return res.status(200).json({
            message: "Closed date saved successfully",
            data: {
                id: result.schedule_id,
                schedule_id: result.schedule_id,
                facilityId: result.facility_id,
                facility_id: result.facility_id,
                date: dateStr,
                reason: result.available_time_slot || "Clinic Closed",
                createdAt: result.created_at,
            }
        });
    } catch (err) {
        return next(err);
    }
};

const get_facility_closed_dates = async (req, res, next) => {
    try {
        const facility_id = req.params.facility_id || req.query.facility_id;

        if (!facility_id) {
            return res.status(400).json({ error: "facility_id is required" });
        }

        const records = await prisma.facility_Schedule.findMany({
            where: {
                facility_id,
                is_available: false,
            },
            orderBy: {
                available_date: 'asc'
            }
        });

        const formatted = records.map((r) => {
            const raw = new Date(r.available_date);
            const y = raw.getFullYear();
            const m = String(raw.getMonth() + 1).padStart(2, "0");
            const d = String(raw.getDate()).padStart(2, "0");
            const dateStr = `${y}-${m}-${d}`;
            return {
                id: r.schedule_id,
                schedule_id: r.schedule_id,
                facilityId: r.facility_id,
                facility_id: r.facility_id,
                date: dateStr,
                reason: r.available_time_slot || "Clinic Closed",
                createdAt: r.created_at,
            };
        });

        return res.status(200).json({
            facility_id,
            count: formatted.length,
            data: formatted,
        });
    } catch (err) {
        return next(err);
    }
};

const delete_facility_closed_date = async (req, res, next) => {
    try {
        const schedule_id = req.params.schedule_id || req.body.schedule_id;
        const facility_id = req.params.facility_id || req.body.facility_id;
        const dateStr = req.query.date || req.body.date;

        let target = null;
        if (schedule_id) {
            target = await prisma.facility_Schedule.findUnique({
                where: { schedule_id }
            });
        } else if (facility_id && dateStr) {
            const { start, end } = getDayRange(dateStr);
            if (!isNaN(start.getTime())) {
                target = await prisma.facility_Schedule.findFirst({
                    where: {
                        facility_id,
                        available_date: {
                            gte: start,
                            lte: end,
                        },
                        is_available: false,
                    }
                });
            }
        }

        if (!target) {
            return res.status(404).json({ error: "Closed date record not found" });
        }

        const isSuper = req.user?.role === 'SystemAdmin' || req.user?.role === 'SuperAdmin';
        if (!isSuper && req.user?.facility_id && target.facility_id !== req.user.facility_id) {
            return res.status(403).json({ error: "Access denied. Cannot delete another facility's closed date." });
        }

        await prisma.facility_Schedule.delete({
            where: { schedule_id: target.schedule_id }
        });

        return res.status(200).json({
            message: "Closed date successfully removed",
            schedule_id: target.schedule_id,
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
    get_schedule_by_id,
    save_facility_closed_date,
    get_facility_closed_dates,
    delete_facility_closed_date,
};
