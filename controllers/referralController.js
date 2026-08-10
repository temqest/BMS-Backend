const prisma = require('../util/db');
const validate = require('../util/validation');
const crypto = require('crypto');
const { updateWithMVCC } = require('../services/conflicResolution');

const generatePin = {

    async generateUniquePin() {
        const pin = Math.floor(100000 + Math.random() * 900000);
        const existingPin = await prisma.online_Referral.findFirst({
            where: { shared_pin: pin.toString() },
        });
        if (existingPin) {
            return this.generateUniquePin();
        }
        return pin.toString();
    },

};

const createSecuredLink = {

    async generateLink() {

        const SITE_URL = process.env.SITE_URL || "http://localhost:5173";
        const unique_id = crypto.randomUUID();

        return `${SITE_URL}/referral/${unique_id}`;
    },
};

const createReferral = async (req, res, next) => {
    try {
        const {
            pregnancy_id,
            from_facility_id,
            to_facility_id,
            external_facility_name,
            reason,
        } = req.body;

        if (!pregnancy_id || !from_facility_id || !reason) {
            return res.status(400).json({ error: "Missing Required Fields!" });
        }

        if (!to_facility_id && !external_facility_name) {
            return res.status(400).json({ error: "Either a destination facility or external facility name must be provided." });
        }

        if (!(await validate.isPregnancyExist(pregnancy_id))) {
            return res.status(404).json({ error: "Pregnancy Record Doesn't Exist" });
        }

        if (!(await validate.isFacilityExist(from_facility_id))) {
            return res.status(404).json({ error: "Origin Facility Doesn't Exist" });
        }

        if (to_facility_id && !(await validate.isFacilityExist(to_facility_id))) {
            return res.status(404).json({ error: "Destination Facility Doesn't Exist" });
        }

        const secure_link = await createSecuredLink.generateLink();
        const shared_pin = await generatePin.generateUniquePin();

        const newReferral = await prisma.online_Referral.create({
            data: {
                pregnancy_id: pregnancy_id,
                from_facility_id: from_facility_id,
                to_facility_id: to_facility_id ? to_facility_id : null,
                external_facility_name: external_facility_name ? external_facility_name : null,
                reason: reason,
                secure_link: secure_link,
                shared_pin: shared_pin,
            },
        });

        return res.status(201).json({
            message: "Referral Successfully Created",
            data: newReferral,
        });

    } catch (error) {
        return next(error);
    }
};

const getAllReferrals = async (req, res, next) => {
    try {
        const referrals = await prisma.online_Referral.findMany({
            include: {
                pregnancy: {
                    include: {
                        mother: true,
                    },
                },
                fromFacility: true,
                toFacility: true,
            },
            orderBy: { date_referred: 'desc' },
        });

        return res.status(200).json({
            message: "Referrals Retrieved Successfully",
            data: referrals,
        });

    } catch (error) {
        return next(error);
    }
};

const getReferralById = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!(await validate.isOnlineReferralExist(id))) {
            return res.status(404).json({ error: "Referral Not Found!" });
        }

        const referral = await prisma.online_Referral.findUnique({
            where: { referral_id: id },
            include: {
                pregnancy: {
                    include: {
                        mother: true,
                    },
                },
                fromFacility: true,
                toFacility: true,
            },
        });

        return res.status(200).json({
            message: "Referral Details Retrieved Successfully",
            data: referral,
        });

    } catch (error) {
        return next(error);
    }
};

const updateReferral = async (req, res, next) => {
    try {
        const { referral_id } = req.params;
        const {
            pregnancy_id,
            from_facility_id,
            to_facility_id,
            external_facility_name,
            reason,
            status,
            is_completed,
        } = req.body;

        if (!referral_id) {
            return res.status(400).json({ error: "Missing Required Fields!" });
        }

        if (!(await validate.isOnlineReferralExist(referral_id))) {
            return res.status(404).json({ error: "Referral Doesn't Exist!" });
        }

        if (pregnancy_id && !(await validate.isPregnancyExist(pregnancy_id))) {
            return res.status(404).json({ error: "Pregnancy Record Doesn't Exist" });
        }

        if (from_facility_id && !(await validate.isFacilityExist(from_facility_id))) {
            return res.status(404).json({ error: "Origin Facility Doesn't Exist" });
        }

        if (to_facility_id && !(await validate.isFacilityExist(to_facility_id))) {
            return res.status(404).json({ error: "Destination Facility Doesn't Exist" });
        }

        const { strategy, version, ...clientData } = req.body;
        const mvccResult = await updateWithMVCC('online_Referral', referral_id, { version, ...clientData }, {
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
            message: "Referral Updated Successfully",
            data: mvccResult.record,
            strategyUsed: mvccResult.strategyUsed
        });

    } catch (error) {
        return next(error);
    }
};

const respondToReferral = async (req, res, next) => {
    try {
        const { referral_id } = req.params;
        const { status, response_notes, outcome, is_completed, strategy, version } = req.body;

        if (!referral_id || !status) {
            return res.status(400).json({ error: "Missing Required Fields!" });
        }

        if (!(await validate.isOnlineReferralExist(referral_id))) {
            return res.status(404).json({ error: "Referral Doesn't Exist!" });
        }

        const mvccResult = await updateWithMVCC('online_Referral', referral_id, {
            version,
            status: status,
            ...(response_notes !== undefined && { response_notes: response_notes }),
            ...(outcome !== undefined && { outcome: outcome }),
            is_completed: is_completed !== undefined ? is_completed : (status === "completed" || status === "accepted"),
            date_responded: new Date(),
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
            message: "Referral Feedback/Response Recorded Successfully",
            data: mvccResult.record,
            strategyUsed: mvccResult.strategyUsed
        });

    } catch (error) {
        return next(error);
    }
};

const deleteReferral = async (req, res, next) => {
    try {
        const { referral_id } = req.params;

        if (!referral_id) {
            return res.status(400).json({ error: "Missing Required Fields!" });
        }

        if (!(await validate.isOnlineReferralExist(referral_id))) {
            return res.status(404).json({ error: "Referral Doesn't Exist!" });
        }

        await prisma.online_Referral.delete({
            where: { referral_id: referral_id },
        });

        return res.status(200).json({
            message: "Referral Deleted Successfully",
        });

    } catch (error) {
        return next(error);
    }
};

const getReferralByFacility = async (req, res, next) => {

    try {

        const {facility_id} = req.params;

        if(!facility_id) {
            return res.status(400).json({error : "Missing Required Fields!"});
        }

        if(!(await validate.isFacilityExist(facility_id))) {
            return res.status(404).json({error : "Facility Doesn't Exist!"});
        }

        const referralList = await prisma.online_Referral.findMany({
            where : {
                OR: [
                    { from_facility_id : facility_id },
                    { to_facility_id : facility_id }
                ]
            },
            include: {
                pregnancy: {
                    include: {
                        mother: true,
                    },
                },
                fromFacility: true,
                toFacility: true,
            },
            orderBy: { date_referred: 'desc' }
        });

        return res.status(200).json({
            message : "Referral List Retrieved Successfully",
            data : referralList
        });
        
    } catch (error) {
        return next(error);
    }
}

const getAllReferralByPregnancy = async (req, res, next) => {

    try {

        const {pregnancy_id} = req.params;

        if(!pregnancy_id) {
            return res.status(400).json({error : "Missing Required Fields!"});
        }

        if(!(await validate.isPregnancyExist(pregnancy_id))) {
            return res.status(404).json({error : "Pregnancy Record Doesn't Exist"});
        }

        const referralList = await prisma.online_Referral.findMany({
            where : {pregnancy_id : pregnancy_id},
            include: {
                pregnancy: {
                    include: {
                        mother: true,
                    },
                },
                fromFacility: true,
                toFacility: true,
            },
            orderBy: { date_referred: 'desc' }
        });

        return res.status(200).json({
            message : "Referral List Retrieved Successfully",
            data : referralList
        });

    } catch (error) {
        return next(error);
    }
}

module.exports = {
    generatePin,
    createSecuredLink,
    createReferral,
    getAllReferrals,
    getReferralById,
    updateReferral,
    respondToReferral,
    deleteReferral,
    getReferralByFacility,
    getAllReferralByPregnancy,
};

