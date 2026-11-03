require('dotenv').config();
const prisma = require('../util/db');
const { checkUserRole, isSuperAdmin } = require('../middleware/authMiddleware');
const { getTransferVisitDateFilter, verifyFacilityWriteAccess } = require('../services/facilityTransferAccess');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✅ PASS: ${testName}`);
    } else {
        failedTests++;
        console.error(`  ❌ FAIL: ${testName} ${details ? '(' + details + ')' : ''}`);
    }
}

async function runTestSuite() {
    console.log('\n============================================================');
    console.log('🧪 RUNNING COMPREHENSIVE BACKEND VERIFICATION SUITE');
    console.log('Coverage: SuperAdmin Tier, Multi-tenant Scoping, & Transfer Bounds');
    console.log('============================================================\n');

    let createdFacilityA = null;
    let createdFacilityB = null;
    let createdSuperAdmin = null;
    let createdAdminA = null;
    let createdAdminB = null;
    let createdMother = null;
    let createdPregnancy = null;
    let visitMonth2 = null;
    let visitMonth6 = null;
    let createdReferral = null;

    try {
        console.log('--- 1. Testing SuperAdmin & Role Verification Middleware ---');
        
        const superAdminUser = { role: 'SystemAdmin', user_id: 'test-super-id' };
        const legacySuperUser = { role: 'SuperAdmin', user_id: 'test-legacy-super-id' };
        const facilityAdminUser = { role: 'Admin', facility_id: 'fac-1', user_id: 'test-admin-id' };
        const workerUser = { role: 'HealthWorker', facility_id: 'fac-1', user_id: 'test-worker-id' };

        assert(isSuperAdmin(superAdminUser) === true, 'isSuperAdmin recognises SystemAdmin');
        assert(isSuperAdmin(legacySuperUser) === true, 'isSuperAdmin recognises SuperAdmin');
        assert(isSuperAdmin(facilityAdminUser) === false, 'isSuperAdmin rejects facility Admin');
        assert(isSuperAdmin(workerUser) === false, 'isSuperAdmin rejects HealthWorker');

        let middlewarePassed = false;
        const mockReqSuper = { user: superAdminUser };
        const mockRes = { status: (code) => ({ json: (data) => ({ code, data }) }) };
        const nextFn = () => { middlewarePassed = true; };

        checkUserRole(['SystemAdmin'])(mockReqSuper, mockRes, nextFn);
        assert(middlewarePassed === true, 'checkUserRole passes SystemAdmin');

        middlewarePassed = false;
        checkUserRole(['SystemAdmin'])({ user: legacySuperUser }, mockRes, nextFn);
        assert(middlewarePassed === true, 'checkUserRole normalizes SuperAdmin to match SystemAdmin');

        let deniedCode = 0;
        const mockDenyRes = {
            status: (code) => {
                deniedCode = code;
                return { json: () => {} };
            }
        };
        checkUserRole(['SystemAdmin'])({ user: facilityAdminUser }, mockDenyRes, () => {});
        assert(deniedCode === 403, 'checkUserRole denies facility Admin for SystemAdmin-only routes with 403');

        console.log('\n--- 2. Setting up Test Data in DB ---');
        const testRunId = Date.now().toString(36);

        createdFacilityA = await prisma.facility.create({
            data: {
                facility_name: `Test Origin Facility ${testRunId}`,
                email: `facilityA_${testRunId}@test.com`,
                type: 'BHS',
                address: '123 Origin St',
                contact_number: '09123456789'
            }
        });

        createdFacilityB = await prisma.facility.create({
            data: {
                facility_name: `Test Destination Facility ${testRunId}`,
                email: `facilityB_${testRunId}@test.com`,
                type: 'RHU',
                address: '456 Dest Ave',
                contact_number: '09987654321'
            }
        });

        const motherUser = await prisma.user.create({
            data: {
                first_name: 'TestMother',
                last_name: `TransferTest_${testRunId}`,
                email: `mother_${testRunId}@test.com`,
                phone_number: `09${Math.floor(100000000 + Math.random() * 900000000)}`,
                address: '123 Test Mother Address',
                role: 'Mother',
                facility_id: createdFacilityA.facility_id
            }
        });

        createdMother = await prisma.mother.create({
            data: {
                user_id: motherUser.user_id,
                birth_date: new Date('1998-05-10'),
                civil_status: 'Single',
                blood_type: 'O+'
            }
        });

        await prisma.mother_Facility_Enrollment.create({
            data: {
                mother_id: createdMother.mother_id,
                facility_id: createdFacilityA.facility_id,
                status: 'Active',
                notes: 'Initial registration'
            }
        });

        createdPregnancy = await prisma.pregnancy.create({
            data: {
                mother_id: createdMother.mother_id,
                gravida: 1,
                parity: 0,
                age_group: '20-24',
                pregnancy_status: 'Active',
                lmp_date: new Date('2026-01-01'),
                edd_date: new Date('2026-10-08'),
                date_of_registration: new Date('2026-01-15')
            }
        });

        const staffWorkerA = await prisma.user.create({
            data: {
                first_name: 'WorkerA',
                last_name: 'Staff',
                email: `workerA_${testRunId}@test.com`,
                phone_number: `09${Math.floor(100000000 + Math.random() * 900000000)}`,
                address: 'Worker A Address',
                role: 'HealthWorker',
                facility_id: createdFacilityA.facility_id
            }
        });

        const staffWorkerB = await prisma.user.create({
            data: {
                first_name: 'WorkerB',
                last_name: 'Staff',
                email: `workerB_${testRunId}@test.com`,
                phone_number: `09${Math.floor(100000000 + Math.random() * 900000000)}`,
                address: 'Worker B Address',
                role: 'HealthWorker',
                facility_id: createdFacilityB.facility_id
            }
        });

        console.log('  -> Test facilities and patient records generated.');

        console.log('\n--- 3. Testing Pre-Transfer Care Phase (Month 1-5) ---');

        const dateMonth2 = new Date('2026-02-15T09:00:00Z');
        visitMonth2 = await prisma.prenatalVisit.create({
            data: {
                pregnancy_id: createdPregnancy.pregnancy_id,
                health_worker_id: staffWorkerA.user_id,
                visit_date: dateMonth2,
                trimester: 1,
                visit_number: 1,
                age_of_gestation_weeks: 6,
                weight_kg: 54.5,
                temperature_celsius: 36.6,
                pulse_rate_bpm: 78,
                bp_systolic: 110,
                bp_diastolic: 70
            }
        });
        assert(visitMonth2.visit_id !== undefined, 'Prenatal visit for Month 2 recorded by Facility A');

        const canWriteBeforeTransfer = await verifyFacilityWriteAccess(createdMother.mother_id, staffWorkerA);
        assert(canWriteBeforeTransfer.allowed === true, 'Facility A staff has write access while Active');

        console.log('\n--- 4. Executing Referral Transfer (Facility A -> Facility B) ---');

        createdReferral = await prisma.online_Referral.create({
            data: {
                pregnancy_id: createdPregnancy.pregnancy_id,
                from_facility_id: createdFacilityA.facility_id,
                to_facility_id: createdFacilityB.facility_id,
                reason: 'Higher level monitoring needed',
                status: 'pending',
                date_referred: new Date('2026-05-01T10:00:00Z')
            }
        });

        const transferDate = new Date('2026-05-05T14:00:00Z');

        await prisma.$transaction([
            prisma.online_Referral.update({
                where: { referral_id: createdReferral.referral_id },
                data: {
                    status: 'accepted',
                    is_completed: true,
                    date_responded: transferDate,
                    response_notes: 'Transfer accepted by Facility B'
                }
            }),
            prisma.mother_Facility_Enrollment.upsert({
                where: {
                    mother_id_facility_id: {
                        mother_id: createdMother.mother_id,
                        facility_id: createdFacilityB.facility_id
                    }
                },
                update: { status: 'Active', notes: `Enrolled via referral #${createdReferral.referral_id}` },
                create: {
                    mother_id: createdMother.mother_id,
                    facility_id: createdFacilityB.facility_id,
                    status: 'Active',
                    notes: `Enrolled via referral #${createdReferral.referral_id}`
                }
            }),
            prisma.mother_Facility_Enrollment.updateMany({
                where: {
                    mother_id: createdMother.mother_id,
                    facility_id: createdFacilityA.facility_id,
                    status: 'Active'
                },
                data: {
                    status: 'Transferred',
                    notes: `Transferred to facility #${createdFacilityB.facility_id}`
                }
            })
        ]);

        const enrollA = await prisma.mother_Facility_Enrollment.findUnique({
            where: {
                mother_id_facility_id: {
                    mother_id: createdMother.mother_id,
                    facility_id: createdFacilityA.facility_id
                }
            }
        });
        const enrollB = await prisma.mother_Facility_Enrollment.findUnique({
            where: {
                mother_id_facility_id: {
                    mother_id: createdMother.mother_id,
                    facility_id: createdFacilityB.facility_id
                }
            }
        });

        assert(enrollA.status === 'Transferred', 'Originating Facility A enrollment changed to "Transferred"');
        assert(enrollB.status === 'Active', 'Receiving Facility B enrollment created with status "Active"');

        console.log('\n--- 5. Testing Post-Transfer Write Guard ---');

        const canWriteFacilityA = await verifyFacilityWriteAccess(createdMother.mother_id, staffWorkerA);
        assert(
            canWriteFacilityA.allowed === false,
            'Facility A staff write access is BLOCKED after transfer',
            canWriteFacilityA.error
        );

        const canWriteFacilityB = await verifyFacilityWriteAccess(createdMother.mother_id, staffWorkerB);
        assert(
            canWriteFacilityB.allowed === true,
            'Facility B staff write access is ALLOWED after transfer'
        );

        const dateMonth6 = new Date('2026-06-15T09:00:00Z');
        visitMonth6 = await prisma.prenatalVisit.create({
            data: {
                pregnancy_id: createdPregnancy.pregnancy_id,
                health_worker_id: staffWorkerB.user_id,
                visit_date: dateMonth6,
                trimester: 2,
                visit_number: 2,
                age_of_gestation_weeks: 23,
                weight_kg: 58.0,
                temperature_celsius: 36.5,
                pulse_rate_bpm: 82,
                bp_systolic: 115,
                bp_diastolic: 75
            }
        });
        assert(visitMonth6.visit_id !== undefined, 'Facility B successfully registered Month 6 visit');

        console.log('\n--- 6. Testing Scoped Query Filtering (Months 1-5 vs Month 6+) ---');

        const filterForFacilityA = await getTransferVisitDateFilter(
            createdMother.mother_id,
            createdPregnancy.pregnancy_id,
            staffWorkerA
        );
        assert(
            filterForFacilityA !== null && filterForFacilityA.lte !== undefined,
            'Facility A receives date cutoff filter bounded to transfer date'
        );

        const visitsVisibleToFacilityA = await prisma.prenatalVisit.findMany({
            where: {
                pregnancy_id: createdPregnancy.pregnancy_id,
                ...(filterForFacilityA ? { visit_date: filterForFacilityA } : {})
            }
        });

        assert(
            visitsVisibleToFacilityA.length === 1 && visitsVisibleToFacilityA[0].visit_id === visitMonth2.visit_id,
            'Facility A ONLY sees Month 2 visit (1 visit total, Month 6 is hidden)'
        );

        const filterForFacilityB = await getTransferVisitDateFilter(
            createdMother.mother_id,
            createdPregnancy.pregnancy_id,
            staffWorkerB
        );
        assert(filterForFacilityB === null, 'Facility B has NO cutoff filter (full access)');

        const visitsVisibleToFacilityB = await prisma.prenatalVisit.findMany({
            where: {
                pregnancy_id: createdPregnancy.pregnancy_id,
                ...(filterForFacilityB ? { visit_date: filterForFacilityB } : {})
            }
        });

        assert(
            visitsVisibleToFacilityB.length === 2,
            'Facility B sees ALL visits (Month 2 from Facility A + Month 6 from Facility B)'
        );

        const filterForSuperAdmin = await getTransferVisitDateFilter(
            createdMother.mother_id,
            createdPregnancy.pregnancy_id,
            superAdminUser
        );
        assert(filterForSuperAdmin === null, 'SuperAdmin has NO cutoff filter (sees complete audit trail)');

    } catch (err) {
        console.error('💥 Test execution threw an error:', err);
        failedTests++;
    } finally {
        console.log('\n--- 7. Cleaning Up Test Artifacts ---');
        try {
            if (createdPregnancy) {
                await prisma.prenatalVisit.deleteMany({ where: { pregnancy_id: createdPregnancy.pregnancy_id } });
                await prisma.online_Referral.deleteMany({ where: { pregnancy_id: createdPregnancy.pregnancy_id } });
                await prisma.pregnancy.delete({ where: { pregnancy_id: createdPregnancy.pregnancy_id } });
            }
            if (createdMother) {
                await prisma.mother_Facility_Enrollment.deleteMany({ where: { mother_id: createdMother.mother_id } });
                await prisma.mother.delete({ where: { mother_id: createdMother.mother_id } });
                if (createdMother.user_id) {
                    await prisma.user.delete({ where: { user_id: createdMother.user_id } });
                }
            }
            if (createdFacilityA) {
                await prisma.user.deleteMany({ where: { facility_id: createdFacilityA.facility_id } });
                await prisma.facility.delete({ where: { facility_id: createdFacilityA.facility_id } });
            }
            if (createdFacilityB) {
                await prisma.user.deleteMany({ where: { facility_id: createdFacilityB.facility_id } });
                await prisma.facility.delete({ where: { facility_id: createdFacilityB.facility_id } });
            }
            console.log('  -> Database cleanup complete.');
        } catch (cleanupErr) {
            console.warn('  ⚠️ Cleanup warning:', cleanupErr.message);
        }
    }

    console.log('\n============================================================');
    console.log(`RESULTS: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
    console.log('============================================================\n');

    process.exit(failedTests > 0 ? 1 : 0);
}

runTestSuite();
