const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAllMothers() {
    console.log('====================================================');
    console.log('🧹 Purging All Mother Data (Backend Database)');
    console.log('====================================================\n');

    try {
        // 1. Gather all mothers and associated patient users
        const allMothers = await prisma.mother.findMany({
            select: { mother_id: true, user_id: true }
        });

        const motherIds = allMothers.map(m => m.mother_id);
        const userIdsFromMothers = allMothers.map(m => m.user_id).filter(Boolean);

        const motherUsers = await prisma.user.findMany({
            where: {
                OR: [
                    { user_id: { in: userIdsFromMothers } },
                    { role: { equals: 'Mother', mode: 'insensitive' } }
                ]
            },
            select: { user_id: true, email: true, phone_number: true, first_name: true, last_name: true }
        });

        const allMotherUserIds = Array.from(new Set([
            ...userIdsFromMothers,
            ...motherUsers.map(u => u.user_id)
        ]));

        const identifiersToClear = Array.from(new Set([
            ...motherUsers.map(u => u.email).filter(Boolean),
            ...motherUsers.map(u => u.phone_number).filter(Boolean)
        ]));

        console.log(`🔍 Found:`);
        console.log(`   - ${motherIds.length} Mother profile(s)`);
        console.log(`   - ${allMotherUserIds.length} Mother user account(s)`);

        // 2. Gather child pregnancy and visit IDs
        const pregnancies = await prisma.pregnancy.findMany({
            where: { mother_id: { in: motherIds } },
            select: { pregnancy_id: true }
        });
        const pregnancyIds = pregnancies.map(p => p.pregnancy_id);

        const visits = await prisma.prenatalVisit.findMany({
            where: { pregnancy_id: { in: pregnancyIds } },
            select: { visit_id: true }
        });
        const visitIds = visits.map(v => v.visit_id);

        const deliveries = await prisma.delivery_Outcome.findMany({
            where: { pregnancy_id: { in: pregnancyIds } },
            select: { delivery_id: true }
        });
        const deliveryIds = deliveries.map(d => d.delivery_id);

        console.log(`   - ${pregnancyIds.length} Pregnancy record(s)`);
        console.log(`   - ${visitIds.length} Prenatal visit(s)`);
        console.log(`   - ${deliveryIds.length} Delivery outcome(s)\n`);

        console.log('🗑️  Deleting related sub-records in relational order...');

        // 3. Child entities deletion
        const resPostpartum = await prisma.postpartum_visit.deleteMany({
            where: { delivery_id: { in: deliveryIds } }
        });

        const resNewborn = await prisma.newborn_Record.deleteMany({
            where: { delivery_id: { in: deliveryIds } }
        });

        const resDelivery = await prisma.delivery_Outcome.deleteMany({
            where: { pregnancy_id: { in: pregnancyIds } }
        });

        const resSupplements = await prisma.supplementation_Record.deleteMany({
            where: {
                OR: [
                    { pregnancy_id: { in: pregnancyIds } },
                    { visit_id: { in: visitIds } }
                ]
            }
        });

        const resLabs = await prisma.lab_Screening.deleteMany({
            where: {
                OR: [
                    { pregnancy_id: { in: pregnancyIds } },
                    { visit_id: { in: visitIds } }
                ]
            }
        });

        const resCdss = await prisma.cDSS_Alert.deleteMany({
            where: {
                OR: [
                    { pregnancy_id: { in: pregnancyIds } },
                    { visit_id: { in: visitIds } }
                ]
            }
        });

        const resReferrals = await prisma.online_Referral.deleteMany({
            where: { pregnancy_id: { in: pregnancyIds } }
        });

        const resVisits = await prisma.prenatalVisit.deleteMany({
            where: { pregnancy_id: { in: pregnancyIds } }
        });

        const resPregnancies = await prisma.pregnancy.deleteMany({
            where: { mother_id: { in: motherIds } }
        });

        const resAppointments = await prisma.appointment.deleteMany({
            where: { user_id: { in: allMotherUserIds } }
        });

        const resNotifications = await prisma.notification.deleteMany({
            where: { user_id: { in: allMotherUserIds } }
        });

        const resMessages = await prisma.in_App_Message.deleteMany({
            where: {
                OR: [
                    { sender_id: { in: allMotherUserIds } },
                    { receiver_id: { in: allMotherUserIds } }
                ]
            }
        });

        const resAuditLogs = await prisma.audit_Revision_Log.deleteMany({
            where: { user_id: { in: allMotherUserIds } }
        });

        let deletedOtpsCount = 0;
        if (identifiersToClear.length > 0) {
            const resOtps = await prisma.otp.deleteMany({
                where: { identifier: { in: identifiersToClear } }
            });
            deletedOtpsCount = resOtps.count;
        }

        const resMothers = await prisma.mother.deleteMany({});

        const resUsers = await prisma.user.deleteMany({
            where: { user_id: { in: allMotherUserIds } }
        });

        console.log('\n====================================================');
        console.log('✅ Cleanup Summary:');
        console.log('====================================================');
        console.log(`- Mothers removed:               ${resMothers.count}`);
        console.log(`- Mother User Accounts removed:  ${resUsers.count}`);
        console.log(`- Pregnancies removed:           ${resPregnancies.count}`);
        console.log(`- Prenatal Visits removed:       ${resVisits.count}`);
        console.log(`- Lab Screenings removed:        ${resLabs.count}`);
        console.log(`- Supplements removed:           ${resSupplements.count}`);
        console.log(`- Appointments removed:          ${resAppointments.count}`);
        console.log(`- CDSS Alerts removed:           ${resCdss.count}`);
        console.log(`- Referrals removed:             ${resReferrals.count}`);
        console.log(`- Delivery Outcomes removed:     ${resDelivery.count}`);
        console.log(`- Newborn Records removed:       ${resNewborn.count}`);
        console.log(`- Postpartum Visits removed:     ${resPostpartum.count}`);
        console.log(`- Notifications removed:         ${resNotifications.count}`);
        console.log(`- In-App Messages removed:       ${resMessages.count}`);
        console.log(`- Audit Revision Logs removed:   ${resAuditLogs.count}`);
        console.log(`- OTPs cleared:                  ${deletedOtpsCount}`);
        console.log('====================================================');
        console.log('🛡️  Health Workers, Staff Accounts, and Facilities remain UNTOUCHED.');
        console.log('✨ Backend database is completely clean for mothers!\n');

    } catch (error) {
        console.error('❌ Error during mother data cleanup:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

deleteAllMothers();
