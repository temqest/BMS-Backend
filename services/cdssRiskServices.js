const prisma = require('../util/db');

const scoreSystolic = (sys) => {
    if (sys === null || sys === undefined) return 0;
    if (sys < 90) return 3;
    if (sys <= 139) return 0;
    if (sys <= 149) return 1;
    if (sys <= 159) return 2;
    return 3;
};

const scoreDiastolic = (dia) => {
    if (dia === null || dia === undefined) return 0;
    if (dia < 50) return 3;
    if (dia <= 89) return 0;
    if (dia <= 99) return 1;
    if (dia <= 109) return 2;
    return 3;
};

const scoreHeartRate = (hr) => {
    if (hr === null || hr === undefined) return 0;
    if (hr < 50) return 3;
    if (hr <= 99) return 0;
    if (hr <= 109) return 1;
    if (hr <= 119) return 2;
    return 3;
};

const scoreTemperature = (temp) => {
    if (temp === null || temp === undefined) return 0;
    const tempNum = Number(temp);
    if (tempNum < 36.0) return 3;
    if (tempNum <= 37.4) return 0;
    if (tempNum <= 37.9) return 1;
    return 3;
};

const scoreDangerSigns = (danger_signs) => {
    if (!danger_signs) return 0;
    const lower = danger_signs.toLowerCase();
    if (
        lower.includes("bleeding") ||
        lower.includes("severe headache") ||
        lower.includes("convulsion") ||
        lower.includes("vision") ||
        lower.includes("seizure") ||
        lower.includes("unconscious")
    ) {
        return 3;
    }
    return 1;
};

const calculateDemographicWeights = (mother, pregnancy) => {
    let weight = 0;
    if (mother && mother.age) {
        if (mother.age < 19 || mother.age >= 35) {
            weight += 2;
        }
    }
    if (pregnancy) {
        if (pregnancy.parity >= 5) {
            weight += 2;
        }
        if (pregnancy.previous_delivery_history && pregnancy.previous_delivery_history.toLowerCase().includes("cesarean")) {
            weight += 3;
        }
    }
    return weight;
};

const evaluate_clinical_vitals = async (visit_id) => {
    const visit = await prisma.prenatalVisit.findUnique({
        where: { visit_id: visit_id },
        include: {
            pregnancy: {
                include: {
                    mother: true,
                },
            },
        },
    });

    if (!visit) {
        throw new Error("Prenatal Visit Not Found");
    }

    const sysScore = scoreSystolic(visit.bp_systolic);
    const diaScore = scoreDiastolic(visit.bp_diastolic);
    const hrScore = scoreHeartRate(visit.pulse_rate_bpm);
    const tempScore = scoreTemperature(visit.temperature_celsius);
    const dangerScore = scoreDangerSigns(visit.danger_signs_observed);

    const vitalScores = [sysScore, diaScore, hrScore, tempScore, dangerScore];
    const sumVitalScores = vitalScores.reduce((a, b) => a + b, 0);
    const maxVitalScore = Math.max(...vitalScores);

    const demographicWeight = calculateDemographicWeights(visit.pregnancy?.mother, visit.pregnancy);

    let velocityMultiplier = 0;
    const baselineVisit = await prisma.prenatalVisit.findFirst({
        where: {
            pregnancy_id: visit.pregnancy_id,
            trimester: 1,
        },
        orderBy: { visit_date: 'asc' },
    });

    if (baselineVisit && baselineVisit.visit_id !== visit.visit_id) {
        const deltaSys = (visit.bp_systolic || 0) - (baselineVisit.bp_systolic || 0);
        const deltaDia = (visit.bp_diastolic || 0) - (baselineVisit.bp_diastolic || 0);

        if (deltaSys >= 30 || deltaDia >= 15) {
            velocityMultiplier = 2;
        }
    }

    const TEWS = sumVitalScores + demographicWeight + velocityMultiplier;

    let riskLevel = "LOW";
    if (TEWS >= 6 || maxVitalScore >= 3) {
        riskLevel = "HIGH";
    } else if (TEWS >= 4 || maxVitalScore === 2) {
        riskLevel = "MODERATE";
    }

    await prisma.prenatalVisit.update({
        where: { visit_id: visit_id },
        data: { risk_level_assessed: riskLevel },
    });

    let alertRecord = null;
    if (riskLevel === "HIGH" || riskLevel === "MODERATE") {
        alertRecord = await prisma.cDSS_Alert.create({
            data: {
                pregnancy_id: visit.pregnancy_id,
                visit_id: visit.visit_id,
                alert_type: riskLevel === "HIGH" ? "CRITICAL_RISK" : "MODERATE_RISK",
                alert_message: `TEWS Score: ${TEWS}. Triggered by ${riskLevel} risk physiological vitals or history.`,
                severity: riskLevel,
            },
        });
    }

    return {
        visit_id: visit_id,
        tews_score: TEWS,
        risk_level: riskLevel,
        max_vital_score: maxVitalScore,
        velocity_multiplier: velocityMultiplier,
        demographic_weight: demographicWeight,
        alert: alertRecord,
    };
};

module.exports = {
    evaluate_clinical_vitals,
};