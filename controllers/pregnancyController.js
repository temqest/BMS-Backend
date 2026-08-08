const prisma = require('../util/db')

const registerPregnancy = async (req, res, next) => {

    try {

        const {
            motherId,
            lmp_date, 
            gravida, 
            parity, 
            previous_delivery_history,
            co_morbidities,
            age_group,
            bmi_1st_trimester,
            bmi_category,
            pregnancy_status
        } = req.body;

        if(!motherId || !gravida || !parity || !age_group || !lmp_date || !pregnancy_status){
            return res.status(400).json({ error: "Missing Required Fields"})
        }

        const today = new Date();
        const Lmp_Date = new Date(lmp_date);

        if(Lmp_Date > today){
            return res.status(400).json({error: "LMP Date Cannot Be In The Future"})
        }

        const pregnancy = await prisma.pregnancy.create({
            data : {
                mother_id: motherId,
                date_of_registration: today,
                lmp_date: Lmp_Date,
                gravida: Number(gravida),
                parity: Number(parity),
                previous_delivery_history,
                co_morbidities,
                age_group,
                bmi_1st_trimester: bmi_1st_trimester ? Number(bmi_1st_trimester) : null,
                bmi_category,
                pregnancy_status,
                sync_status: "synced",
            }
        })

        res.status(201).json({
            message: "Pregnancy registered successfully",
            pregnancy: pregnancy,
        })

    } catch (error) {
        return next(error);
    }
};

const updatePregnancy = async (req, res, next) => {

    const {pregnancy_id} = req.params;

    const { pregnancy_status } = req.body;

    if(!pregnancy_status){
        return res.status(400).json({error: "Missing Required Fields"})
    }

    try {
        const pregnancy = await prisma.pregnancy.update({
            where : {pregnancy_id: pregnancy_id},
            data : {
                pregnancy_status,
                sync_status: "synced",
            }
        })

        res.status(200).json({
            message: "Pregnancy updated successfully",
            pregnancy: pregnancy,
        })
    } catch (error) {
        return next(error);
    }

}

const deletePregnancy = async (req, res, next) => {
    
    const {pregnancy_id} = req.params;

    try {
        const pregnancy = await prisma.pregnancy.delete({
            where : {pregnancy_id: pregnancy_id},
        })

        res.status(200).json({
            message: "Pregnancy deleted successfully",
            pregnancy: pregnancy,
        })
    } catch (error) {
        return next(error);
    }

};

const getPregnancyByID = async (req, res, next) => {

    try {
        const {pregnancy_id} = req.params;

        if(!pregnancy_id) {
            return res.status(400).json({error : "Missing Pregnancy ID!"});
        }

        const pregnancy = await prisma.pregnancy.findUnique({
            where : {pregnancy_id : pregnancy_id},
            include : {
                prenatalVisits : {
                    orderBy : {visit_date : 'asc'},
                    include : {
                        healthWorker: {
                            select: {
                                user_id: true,
                                first_name: true,
                                middle_name: true,
                                last_name: true,
                                role: true,
                                facility: true,
                            },
                        },
                    },
                },
            },
        });

        if(!pregnancy) {
            return res.status(404).json({error : "Pregnancy not found"})
        }

        res.status(200).json({
            message: "Pregnancy data retrieved successfully",
            pregnancy: pregnancy,
        });

    } catch (error) {
        return next(error);
    }
 
};

module.exports = {
    registerPregnancy,
    updatePregnancy,
    deletePregnancy,
    getPregnancyByID,
}
