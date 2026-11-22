const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedRealisticData() {
    console.log('Starting realistic data seeding...');
    const dataPath = path.join(__dirname, '../data/seed-realistic-data.json');
    if (!fs.existsSync(dataPath)) {
        throw new Error(`Data file not found at: ${dataPath}`);
    }

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    try {
        await prisma.user.updateMany({
            where: { role: 'SystemAdmin' },
            data: { address: 'Pili Municipal Health Office, San Vicente, Pili, Camarines Sur' }
        });

        console.log(`Seeding ${data.facilities.length} facilities...`);
        for (const fac of data.facilities) {
            await prisma.facility.upsert({
                where: { facility_id: fac.facility_id },
                update: fac,
                create: fac
            });
        }

        console.log(`Seeding ${data.staffMembers.length} staff members...`);
        for (const staff of data.staffMembers) {
            await prisma.user.upsert({
                where: { user_id: staff.user_id },
                update: staff,
                create: staff
            });
        }

        console.log(`Seeding ${data.staffSchedules.length} staff schedules...`);
        for (const sched of data.staffSchedules) {
            await prisma.staff_Schedule.upsert({
                where: { user_id: sched.user_id },
                update: sched,
                create: sched
            });
        }

        console.log(`Seeding ${data.users.length} patient user accounts...`);
        for (const u of data.users) {
            await prisma.user.upsert({
                where: { user_id: u.user_id },
                update: u,
                create: u
            });
        }

        console.log(`Seeding ${data.mothers.length} mothers...`);
        for (const m of data.mothers) {
            await prisma.mother.upsert({
                where: { mother_id: m.mother_id },
                update: m,
                create: m
            });
        }

        console.log(`Seeding ${data.enrollments.length} facility enrollments...`);
        for (const e of data.enrollments) {
            await prisma.mother_Facility_Enrollment.upsert({
                where: {
                    mother_id_facility_id: {
                        mother_id: e.mother_id,
                        facility_id: e.facility_id
                    }
                },
                update: e,
                create: e
            });
        }

        console.log(`Seeding ${data.pregnancies.length} pregnancies...`);
        for (const p of data.pregnancies) {
            await prisma.pregnancy.upsert({
                where: { pregnancy_id: p.pregnancy_id },
                update: p,
                create: p
            });
        }

        console.log(`Seeding ${data.prenatalVisits.length} prenatal visits...`);
        for (const v of data.prenatalVisits) {
            await prisma.prenatalVisit.upsert({
                where: { visit_id: v.visit_id },
                update: v,
                create: v
            });
        }

        console.log(`Seeding ${data.supplementationRecords.length} supplementation records...`);
        for (const s of data.supplementationRecords) {
            await prisma.supplementation_Record.upsert({
                where: { supplement_id: s.supplement_id },
                update: s,
                create: s
            });
        }

        console.log(`Seeding ${data.labScreenings.length} lab screenings...`);
        for (const l of data.labScreenings) {
            await prisma.lab_Screening.upsert({
                where: { screening_id: l.screening_id },
                update: l,
                create: l
            });
        }

        console.log(`Seeding ${data.cdssAlerts.length} CDSS alerts...`);
        for (const c of data.cdssAlerts) {
            await prisma.cDSS_Alert.upsert({
                where: { alert_id: c.alert_id },
                update: c,
                create: c
            });
        }

        console.log(`Seeding ${data.onlineReferrals.length} online referrals...`);
        for (const r of data.onlineReferrals) {
            await prisma.online_Referral.upsert({
                where: { referral_id: r.referral_id },
                update: r,
                create: r
            });
        }

        console.log(`Seeding ${data.deliveryOutcomes.length} delivery outcomes...`);
        for (const d of data.deliveryOutcomes) {
            await prisma.delivery_Outcome.upsert({
                where: { delivery_id: d.delivery_id },
                update: d,
                create: d
            });
        }

        console.log(`Seeding ${data.newbornRecords.length} newborn records...`);
        for (const n of data.newbornRecords) {
            await prisma.newborn_Record.upsert({
                where: { newborn_id: n.newborn_id },
                update: n,
                create: n
            });
        }

        console.log(`Seeding ${data.postpartumVisits.length} postpartum visits...`);
        for (const pv of data.postpartumVisits) {
            await prisma.postpartum_visit.upsert({
                where: { postpartum_visit_id: pv.postpartum_visit_id },
                update: pv,
                create: pv
            });
        }

        console.log(`Seeding ${data.appointments.length} appointments...`);
        for (const a of data.appointments) {
            await prisma.appointment.upsert({
                where: { appointment_id: a.appointment_id },
                update: a,
                create: a
            });
        }

        console.log(`Seeding ${data.facilityDocuments.length} facility documents...`);
        for (const doc of data.facilityDocuments) {
            await prisma.facility_Document.upsert({
                where: { document_id: doc.document_id },
                update: doc,
                create: doc
            });
        }

        console.log('Seeding completed successfully!');
    } catch (error) {
        console.error('Error during realistic seeding:', error);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

seedRealisticData();
