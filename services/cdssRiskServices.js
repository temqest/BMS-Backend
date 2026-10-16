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

const scoreDangerSigns = (danger_signs, vitals = {}) => {
    let score = 0;
    if (vitals.has_vaginal_bleeding) {
        return 3;
    }
    if (vitals.has_fever || vitals.has_pallor || vitals.has_edema) {
        score = 2;
    }
    if (!danger_signs) return score;
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
    return Math.max(score, 1);
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
        if (pregnancy.prev_caesarean || (pregnancy.previous_delivery_history && pregnancy.previous_delivery_history.toLowerCase().includes("cesarean"))) {
            weight += 3;
        }
        if (pregnancy.pph_history) {
            weight += 3;
        }
        if (pregnancy.stillbirth_history) {
            weight += 2;
        }
        if (pregnancy.consecutive_miscarriages) {
            weight += 2;
        }
        if (pregnancy.has_heart_disease) {
            weight += 3;
        }
        if (pregnancy.has_diabetes) {
            weight += 2;
        }
        if (pregnancy.has_tb) {
            weight += 2;
        }
        if (pregnancy.has_asthma) {
            weight += 1;
        }
        if (pregnancy.has_goiter) {
            weight += 1;
        }
    }
    return weight;
};

const calculateTewsScore = ({ vitals, mother, pregnancy, baselineVisit }) => {
    const triggers = [];
    const sys = vitals.bp_systolic != null ? Number(vitals.bp_systolic) : null;
    const dia = vitals.bp_diastolic != null ? Number(vitals.bp_diastolic) : null;
    const hr = vitals.pulse_rate_bpm != null ? Number(vitals.pulse_rate_bpm) : null;
    const temp = vitals.temperature_celsius != null ? Number(vitals.temperature_celsius) : null;

    const sysScore = scoreSystolic(sys);
    if (sys !== null) {
        if (sys < 90) triggers.push(`Hypotension: Systolic ${sys} mmHg (< 90)`);
        else if (sys >= 160) triggers.push(`Critical Hypertensive Spike: Systolic ${sys} mmHg (≥ 160)`);
        else if (sys >= 150) triggers.push(`Stage 2 Systolic Elevation: ${sys} mmHg`);
        else if (sys >= 140) triggers.push(`Stage 1 Systolic Elevation: ${sys} mmHg`);
    }

    const diaScore = scoreDiastolic(dia);
    if (dia !== null) {
        if (dia < 50) triggers.push(`Severe Diastolic Hypotension: ${dia} mmHg (< 50)`);
        else if (dia >= 110) triggers.push(`Critical Diastolic Spike: ${dia} mmHg (≥ 110)`);
        else if (dia >= 100) triggers.push(`Stage 2 Diastolic Elevation: ${dia} mmHg`);
        else if (dia >= 90) triggers.push(`Stage 1 Diastolic Elevation: ${dia} mmHg`);
    }

    const hrScore = scoreHeartRate(hr);
    if (hr !== null) {
        if (hr < 50) triggers.push(`Maternal Bradycardia: ${hr} bpm (< 50)`);
        else if (hr >= 120) triggers.push(`Severe Maternal Tachycardia: ${hr} bpm (≥ 120)`);
        else if (hr >= 100) triggers.push(`Maternal Tachycardia: ${hr} bpm`);
    }

    const tempScore = scoreTemperature(temp);
    if (temp !== null) {
        if (temp < 36.0) triggers.push(`Hypothermia: ${temp} °C (< 36.0)`);
        else if (temp >= 38.0) triggers.push(`Pyrexia / Fever: ${temp} °C (≥ 38.0)`);
        else if (temp >= 37.5) triggers.push(`Subfebrile Temperature: ${temp} °C`);
    }

    const dangerScore = scoreDangerSigns(vitals.danger_signs_observed, vitals);
    if (vitals.has_vaginal_bleeding) triggers.push("Danger Sign: Active Vaginal Bleeding");
    if (vitals.has_fever) triggers.push("Danger Sign: High Fever");
    if (vitals.has_pallor) triggers.push("Danger Sign: Severe Pallor");
    if (vitals.has_edema) triggers.push("Danger Sign: Pre-tibial or Facial Edema");
    if (vitals.danger_signs_observed) {
        const obs = String(vitals.danger_signs_observed).trim();
        if (obs && !triggers.some(t => t.toLowerCase().includes(obs.toLowerCase()))) {
            triggers.push(`Reported Symptoms: ${obs}`);
        }
    }

    const vitalScores = [sysScore, diaScore, hrScore, tempScore, dangerScore];
    
    let sumVitalScores = 0;
    for (let i = 0; i < vitalScores.length; i++) {
        sumVitalScores += vitalScores[i];
    }
    
    let maxVitalScore = vitalScores[0];
    for (let i = 1; i < vitalScores.length; i++) {
        if (vitalScores[i] > maxVitalScore) {
            maxVitalScore = vitalScores[i];
        }
    }

    const demographicWeight = calculateDemographicWeights(mother, pregnancy);
    if (mother?.age) {
        if (mother.age < 19) triggers.push(`Adolescent Pregnancy (Age ${mother.age})`);
        else if (mother.age >= 35) triggers.push(`Advanced Maternal Age (Age ${mother.age})`);
    }
    if (pregnancy) {
        if (pregnancy.parity >= 5) triggers.push(`Grand Multipara (Parity ${pregnancy.parity})`);
        if (pregnancy.prev_caesarean) triggers.push("History of Previous Caesarean Delivery");
        if (pregnancy.pph_history) triggers.push("History of Postpartum Hemorrhage");
        if (pregnancy.stillbirth_history) triggers.push("History of Stillbirth");
        if (pregnancy.consecutive_miscarriages) triggers.push("History of Recurrent Miscarriages");
        if (pregnancy.has_heart_disease) triggers.push("Chronic Condition: Heart Disease");
        if (pregnancy.has_diabetes) triggers.push("Chronic Condition: Diabetes Mellitus");
        if (pregnancy.has_tb) triggers.push("Chronic Condition: Tuberculosis");
        if (pregnancy.has_asthma) triggers.push("Chronic Condition: Bronchial Asthma");
        if (pregnancy.has_goiter) triggers.push("Chronic Condition: Goiter / Thyroid Disorder");
    }

    let velocityMultiplier = 0;
    if (baselineVisit && baselineVisit.visit_id !== vitals.visit_id) {
        const deltaSys = (sys || 0) - (Number(baselineVisit.bp_systolic) || 0);
        const deltaDia = (dia || 0) - (Number(baselineVisit.bp_diastolic) || 0);

        if (deltaSys >= 30 || deltaDia >= 15) {
            velocityMultiplier = 2;
            triggers.push(`Acute Blood Pressure Surge: +${deltaSys} mmHg systolic / +${deltaDia} mmHg diastolic from baseline`);
        }
    }

    const TEWS = sumVitalScores + demographicWeight + velocityMultiplier;

    let riskLevel = "LOW";
    if (TEWS >= 6 || maxVitalScore >= 3) {
        riskLevel = "HIGH";
    } else if (TEWS >= 4 || maxVitalScore === 2) {
        riskLevel = "MODERATE";
    }

    const protocols = [];
    if (riskLevel === "HIGH") {
        protocols.push("Immediate physician or obstetrician clinical evaluation");
        protocols.push("Urgent Preeclampsia screen: Order urine protein dipstick and CBC with platelets");
        protocols.push("Prepare referral ticket and transfer checklist for higher-level facility (CEmONC)");
        protocols.push("Schedule close maternal-fetal re-evaluation within 24 to 48 hours");
    } else if (riskLevel === "MODERATE") {
        protocols.push("Shorten visit interval: Re-evaluate blood pressure and clinical vitals within 7 days");
        protocols.push("Verify hemoglobin / hematocrit levels and rule out gestational anemia");
        protocols.push("Review warning signs (severe headache, epigastric pain, blurring of vision)");
        protocols.push("Reinforce adherence to prescribed Iron + Folic Acid and Calcium supplementation");
    } else {
        protocols.push("Continue routine antenatal care schedule (every 4 weeks until 28 weeks)");
        protocols.push("Ensure daily Iron + Folic Acid supplementation adherence");
        protocols.push("Counsel on balanced maternal nutrition and routine fetal movement tracking");
    }

    return {
        tews_score: TEWS,
        risk_level: riskLevel,
        max_vital_score: maxVitalScore,
        velocity_multiplier: velocityMultiplier,
        demographic_weight: demographicWeight,
        triggers,
        protocols,
    };
};

const evaluate_clinical_vitals = async (visit_id, options = {}) => {
    
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

    const baselineVisit = await prisma.prenatalVisit.findFirst({
        where: {
            pregnancy_id: visit.pregnancy_id,
            trimester: 1,
        },
        orderBy: { visit_date: 'asc' },
    });

    const assessment = calculateTewsScore({
        vitals: visit,
        mother: visit.pregnancy?.mother,
        pregnancy: visit.pregnancy,
        baselineVisit,
    });

    const finalRisk = (options.preserveExistingRisk && (options.overrideRiskLevel || visit.risk_level_assessed))
        ? (options.overrideRiskLevel || visit.risk_level_assessed)
        : assessment.risk_level;

    await prisma.prenatalVisit.update({
        where: { visit_id: visit_id },
        data: { risk_level_assessed: finalRisk },
    });

    let alertRecord = null;
    const effectiveSeverity = String(finalRisk).toUpperCase();
    if (effectiveSeverity.includes("HIGH") || effectiveSeverity.includes("MODERATE")) {
        const severity = effectiveSeverity.includes("HIGH") ? "HIGH" : "MODERATE";
        alertRecord = await prisma.cDSS_Alert.create({
            data: {
                pregnancy_id: visit.pregnancy_id,
                visit_id: visit.visit_id,
                alert_type: severity === "HIGH" ? "CRITICAL_RISK" : "MODERATE_RISK",
                alert_message: `TEWS Score: ${assessment.tews_score}. Risk level: ${finalRisk}.${assessment.triggers?.length ? ` Triggers: ${assessment.triggers.slice(0, 3).join("; ")}` : ""}`,
                severity: severity,
            },
        });
    }

    return {
        visit_id: visit_id,
        ...assessment,
        risk_level: finalRisk,
        alert: alertRecord,
    };
};

module.exports = {
    calculateTewsScore,
    evaluate_clinical_vitals,
};