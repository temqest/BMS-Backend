const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDatabase() {
    try {
        console.log('Starting database cleanup...');

        const preserveAdmins = await prisma.user.findMany({
            where: {
                role: 'SystemAdmin'
            },
            select: {
                user_id: true,
                email: true,
                role: true
            }
        });

        console.log(`Found ${preserveAdmins.length} SystemAdmin account(s) to preserve:`, preserveAdmins.map(a => a.email).join(', '));

        await prisma.facility_Document.deleteMany({});
        await prisma.mother_Share_Link.deleteMany({});
        await prisma.mother_Facility_Enrollment.deleteMany({});
        await prisma.staff_Schedule.deleteMany({});
        await prisma.facility_Schedule.deleteMany({});
        await prisma.otp.deleteMany({});
        await prisma.audit_Revision_Log.deleteMany({});
        await prisma.notification.deleteMany({});
        await prisma.in_App_Message.deleteMany({});
        await prisma.appointment.deleteMany({});
        await prisma.supplementation_Record.deleteMany({});
        await prisma.lab_Screening.deleteMany({});
        await prisma.cDSS_Alert.deleteMany({});
        await prisma.online_Referral.deleteMany({});
        await prisma.postpartum_visit.deleteMany({});
        await prisma.newborn_Record.deleteMany({});
        await prisma.delivery_Outcome.deleteMany({});
        await prisma.prenatalVisit.deleteMany({});
        await prisma.pregnancy.deleteMany({});
        await prisma.mother.deleteMany({});

        const deletedUsers = await prisma.user.deleteMany({
            where: {
                role: {
                    not: 'SystemAdmin'
                }
            }
        });
        console.log(`Deleted ${deletedUsers.count} non-admin user records.`);

        const deletedFacilities = await prisma.facility.deleteMany({});
        console.log(`Deleted ${deletedFacilities.count} facility records.`);

        const remainingUsers = await prisma.user.findMany({
            select: {
                user_id: true,
                email: true,
                role: true,
                first_name: true,
                last_name: true
            }
        });

        console.log('Cleanup completed successfully.');
        console.log('Remaining User(s):', remainingUsers);

    } catch (error) {
        console.error('Error during database cleanup:', error);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

cleanDatabase();
