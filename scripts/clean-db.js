const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDatabase() {
    const args = process.argv.slice(2);
    
    let deleteAll = false;
    let targetEmails = [];
    let targetPhones = [];
    let targetFacilities = [];
    let pattern = null;

    args.forEach(arg => {
        if (arg === '--all') {
            deleteAll = true;
        } else if (arg.startsWith('--email=')) {
            targetEmails.push(arg.split('=')[1].trim());
        } else if (arg.startsWith('--phone=')) {
            targetPhones.push(arg.split('=')[1].trim());
        } else if (arg.startsWith('--facility=')) {
            targetFacilities.push(arg.split('=')[1].trim());
        } else if (arg.startsWith('--pattern=')) {
            pattern = arg.split('=')[1].trim();
        }
    });

    console.log('🧹 Database Cleanup Utility starting...');

    try {
        if (deleteAll) {
            console.log('⚠️  Mode: Full Database Wipe');
            
            // Delete dependent records first
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
            await prisma.user.deleteMany({});
            await prisma.facility.deleteMany({});

            console.log('✅ All tables cleaned successfully.');
            return;
        }

        // Default test targets if no specific CLI flags are provided
        if (targetEmails.length === 0 && targetPhones.length === 0 && targetFacilities.length === 0 && !pattern) {
            console.log('ℹ️  No specific arguments provided. Defaulting to cleaning common test identifiers ("Test", "Rural Health Unit", "patrickkurtv@gmail.com", "rhu1@gmail.com", "09686255210")...');
            targetEmails = ['patrickkurtv@gmail.com', 'rhu1@gmail.com'];
            targetPhones = ['09686255210'];
            targetFacilities = ['Rural Health Unit 1 (Test #1)'];
            pattern = 'Test';
        }

        console.log(`🔎 Target Filters - Emails: [${targetEmails.join(', ')}], Phones: [${targetPhones.join(', ')}], Pattern: "${pattern || 'N/A'}"`);

        // Find users to delete
        const usersToDelete = await prisma.user.findMany({
            where: {
                OR: [
                    { email: { in: targetEmails } },
                    { phone_number: { in: targetPhones } },
                    { email: { contains: 'patrickkurtv', mode: 'insensitive' } },
                    { email: { contains: 'test', mode: 'insensitive' } },
                    { first_name: { contains: 'Patrick', mode: 'insensitive' } },
                    { last_name: { contains: 'Villamer', mode: 'insensitive' } },
                ]
            },
            select: { user_id: true, email: true, phone_number: true, facility_id: true }
        });

        const userIds = usersToDelete.map(u => u.user_id);
        const userEmails = usersToDelete.map(u => u.email).filter(Boolean);
        const userPhones = usersToDelete.map(u => u.phone_number).filter(Boolean);

        // Find facilities to delete
        const facilitiesToDelete = await prisma.facility.findMany({
            where: {
                OR: [
                    { email: { in: [...targetEmails, ...userEmails] } },
                    { contact_number: { in: [...targetPhones, ...userPhones] } },
                    { facility_name: { in: targetFacilities } },
                    { facility_name: { contains: 'Test', mode: 'insensitive' } },
                    { facility_name: { contains: 'Rural Health', mode: 'insensitive' } },
                    { email: { contains: 'rhu', mode: 'insensitive' } },
                    { email: { contains: 'test', mode: 'insensitive' } },
                ]
            },
            select: { facility_id: true, facility_name: true }
        });

        const facilityIds = facilitiesToDelete.map(f => f.facility_id);

        // Clear OTPs related to test identifiers
        const identifiersToClear = Array.from(new Set([...targetEmails, ...targetPhones, ...userEmails, ...userPhones]));
        if (identifiersToClear.length > 0) {
            const deletedOtps = await prisma.otp.deleteMany({
                where: { identifier: { in: identifiersToClear } }
            });
            console.log(`🗑️  Deleted ${deletedOtps.count} OTP records.`);
        }

        // Delete users (cascades to Mothers, Pregnancies, Visits, etc.)
        if (userIds.length > 0) {
            // Delete user-related records that might not cascade automatically
            await prisma.appointment.deleteMany({ where: { user_id: { in: userIds } } });
            await prisma.notification.deleteMany({ where: { user_id: { in: userIds } } });
            await prisma.audit_Revision_Log.deleteMany({ where: { user_id: { in: userIds } } });
            await prisma.in_App_Message.deleteMany({
                where: { OR: [{ sender_id: { in: userIds } }, { receiver_id: { in: userIds } }] }
            });

            const deletedUsers = await prisma.user.deleteMany({
                where: { user_id: { in: userIds } }
            });
            console.log(`🗑️  Deleted ${deletedUsers.count} test User records.`);
        }

        // Delete facilities
        if (facilityIds.length > 0) {
            // Unlink any remaining users pointing to these facilities
            await prisma.user.updateMany({
                where: { facility_id: { in: facilityIds } },
                data: { facility_id: null }
            });

            await prisma.online_Referral.deleteMany({
                where: {
                    OR: [
                        { from_facility_id: { in: facilityIds } },
                        { to_facility_id: { in: facilityIds } }
                    ]
                }
            });

            const deletedFacilities = await prisma.facility.deleteMany({
                where: { facility_id: { in: facilityIds } }
            });
            console.log(`🗑️  Deleted ${deletedFacilities.count} test Facility records (${facilitiesToDelete.map(f => f.facility_name).join(', ')}).`);
        }

        console.log('✨ Cleanup completed successfully!');

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanDatabase();
