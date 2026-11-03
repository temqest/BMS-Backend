const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const prisma = require('../util/db');
const {
    create_appointment_slots,
    update_appointment_slots,
    delete_appointment_slots,
    get_facility_schedules,
    get_schedule_by_id
} = require('../controllers/facility/calendarController');

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

function createMockReqRes(body = {}, params = {}, query = {}, user = {}) {
    let statusCode = 200;
    let responseData = null;

    const res = {
        status(code) {
            statusCode = code;
            return this;
        },
        json(data) {
            responseData = data;
            return this;
        }
    };

    const req = {
        body,
        params,
        query,
        user
    };

    return {
        req,
        res,
        getStatus: () => statusCode,
        getData: () => responseData
    };
}

async function runCalendarTestSuite() {
    console.log('\n============================================================');
    console.log('📅 RUNNING FACILITY CALENDAR & APPOINTMENT SLOTS TEST SUITE');
    console.log('Coverage: Slot Creation, Uniqueness, Capacity, Booking Guards, & Filtering');
    console.log('============================================================\n');

    let createdFacility = null;
    let slotId1 = null;
    let slotId2 = null;

    try {
        console.log('--- 1. Setting Up Test Facility ---');
        const runId = Date.now().toString(36);

        createdFacility = await prisma.facility.create({
            data: {
                facility_name: `Calendar Test Facility ${runId}`,
                email: `cal_facility_${runId}@test.com`,
                type: 'RHU',
                address: '789 Calendar Way',
                contact_number: '09123456780'
            }
        });
        assert(createdFacility.facility_id !== undefined, 'Test Facility created');

        console.log('\n--- 2. Testing Slot Creation Validation & Success ---');

        const mockInvalid = createMockReqRes({ facility_id: createdFacility.facility_id, day: '2026-05-10' });
        await create_appointment_slots(mockInvalid.req, mockInvalid.res, () => {});
        assert(mockInvalid.getStatus() === 400, 'Rejects creation with missing time or slots (400)');

        const mockInvalidSlots = createMockReqRes({
            facility_id: createdFacility.facility_id,
            day: '2026-05-10',
            time: '08:00 AM - 09:00 AM',
            slots: -5
        });
        await create_appointment_slots(mockInvalidSlots.req, mockInvalidSlots.res, () => {});
        assert(mockInvalidSlots.getStatus() === 400, 'Rejects negative slots count (400)');

        const mockValid1 = createMockReqRes({
            facility_id: createdFacility.facility_id,
            day: '2026-05-10',
            time: '08:00 AM - 09:00 AM',
            slots: 10
        });
        await create_appointment_slots(mockValid1.req, mockValid1.res, () => {});
        assert(mockValid1.getStatus() === 201, 'Successfully creates new appointment slot (201)');
        slotId1 = mockValid1.getData()?.data?.schedule_id;
        assert(slotId1 !== undefined, 'Returned schedule_id is valid');

        const mockDuplicate = createMockReqRes({
            facility_id: createdFacility.facility_id,
            day: '2026-05-10',
            time: '08:00 AM - 09:00 AM',
            slots: 15
        });
        await create_appointment_slots(mockDuplicate.req, mockDuplicate.res, () => {});
        assert(mockDuplicate.getStatus() === 409, 'Enforces uniqueness constraint per facility+day+time (409 Conflict)');

        const mockValid2 = createMockReqRes({
            facility_id: createdFacility.facility_id,
            day: '2026-05-10',
            time: '09:00 AM - 10:00 AM',
            slots: 8
        });
        await create_appointment_slots(mockValid2.req, mockValid2.res, () => {});
        assert(mockValid2.getStatus() === 201, 'Successfully creates second time slot on same day (201)');
        slotId2 = mockValid2.getData()?.data?.schedule_id;

        console.log('\n--- 3. Testing Slot Retrieval & Query Filtering ---');

        const mockGetById = createMockReqRes({}, { schedule_id: slotId1 });
        await get_schedule_by_id(mockGetById.req, mockGetById.res, () => {});
        assert(mockGetById.getStatus() === 200, 'Retrieves single schedule slot by ID');
        assert(mockGetById.getData()?.data?.max_slots === 10, 'Returned slot max_slots matches 10');

        const mockGetAll = createMockReqRes({}, { facility_id: createdFacility.facility_id });
        await get_facility_schedules(mockGetAll.req, mockGetAll.res, () => {});
        assert(mockGetAll.getStatus() === 200, 'Fetches all schedules for facility (200)');
        assert(mockGetAll.getData()?.count === 2, 'Returns exact count of 2 scheduled slots');

        const mockFilterDate = createMockReqRes(
            {},
            { facility_id: createdFacility.facility_id },
            { start_date: '2026-05-11' }
        );
        await get_facility_schedules(mockFilterDate.req, mockFilterDate.res, () => {});
        assert(mockFilterDate.getData()?.count === 0, 'Correctly filters out past dates when start_date is ahead');

        console.log('\n--- 4. Testing Slot Updates & Capacity Safety Guards ---');

        await prisma.facility_Schedule.update({
            where: { schedule_id: slotId1 },
            data: { booked_slots: 5 }
        });

        const mockIllegalReduction = createMockReqRes({
            schedule_id: slotId1,
            facility_id: createdFacility.facility_id,
            slots: 3
        });
        await update_appointment_slots(mockIllegalReduction.req, mockIllegalReduction.res, () => {});
        assert(
            mockIllegalReduction.getStatus() === 400,
            'Blocks reducing slot capacity below currently booked count (5 booked > 3 requested)'
        );

        const mockValidUpdate = createMockReqRes({
            schedule_id: slotId1,
            facility_id: createdFacility.facility_id,
            slots: 12,
            is_available: false
        });
        await update_appointment_slots(mockValidUpdate.req, mockValidUpdate.res, () => {});
        assert(mockValidUpdate.getStatus() === 200, 'Successfully updates capacity to 12 and toggles is_available to false');

        const mockOnlyAvailable = createMockReqRes(
            {},
            { facility_id: createdFacility.facility_id },
            { only_available: 'true' }
        );
        await get_facility_schedules(mockOnlyAvailable.req, mockOnlyAvailable.res, () => {});
        assert(
            mockOnlyAvailable.getData()?.count === 1 && mockOnlyAvailable.getData()?.data[0].schedule_id === slotId2,
            'only_available=true filter excludes the toggled off slot'
        );

        console.log('\n--- 5. Testing Slot Deletion & Safety Guards ---');

        const mockDeleteBooked = createMockReqRes({ facility_id: createdFacility.facility_id }, { schedule_id: slotId1 });
        await delete_appointment_slots(mockDeleteBooked.req, mockDeleteBooked.res, () => {});
        assert(
            mockDeleteBooked.getStatus() === 400,
            'Blocks deleting a slot that has active bookings (booked_slots > 0)'
        );

        const mockDeleteUnbooked = createMockReqRes({ facility_id: createdFacility.facility_id }, { schedule_id: slotId2 });
        await delete_appointment_slots(mockDeleteUnbooked.req, mockDeleteUnbooked.res, () => {});
        assert(mockDeleteUnbooked.getStatus() === 200, 'Successfully deletes unbooked slot (200)');

        const deletedCheck = await prisma.facility_Schedule.findUnique({ where: { schedule_id: slotId2 } });
        assert(deletedCheck === null, 'Slot was deleted from the database');

    } catch (err) {
        console.error('💥 Test execution threw an error:', err);
        failedTests++;
    } finally {
        console.log('\n--- 6. Cleaning Up Test Artifacts ---');
        try {
            if (createdFacility) {
                await prisma.facility_Schedule.deleteMany({ where: { facility_id: createdFacility.facility_id } });
                await prisma.facility.delete({ where: { facility_id: createdFacility.facility_id } });
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

runCalendarTestSuite();
