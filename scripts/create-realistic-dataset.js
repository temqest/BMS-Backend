const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function buildRealisticDataset() {
    const salt = await bcrypt.genSalt(10);
    const standardStaffPasswordHash = await bcrypt.hash('SilangHealth2026!', salt);
    const standardMotherPasswordHash = await bcrypt.hash('Password123!', salt);

    const facilities = [
        {
            facility_id: '11111111-1111-4111-8111-111111111111',
            facility_name: 'Silang Rural Health Unit I',
            address: 'J.P. Rizal St., Poblacion, Silang, Cavite',
            contact_number: '09178241101',
            email: 'rhu1@silang.ph',
            type: 'RHU / Health Center',
            facility_profile_url: '/uploads/doc3.png',
            is_active: true
        },
        {
            facility_id: '22222222-2222-4222-8222-222222222222',
            facility_name: 'Silang Rural Health Unit II',
            address: 'Barangay Bulihan, Silang, Cavite',
            contact_number: '09178241102',
            email: 'rhu2@silang.ph',
            type: 'RHU / Health Center',
            facility_profile_url: '/uploads/doc4.png',
            is_active: true
        },
        {
            facility_id: '33333333-3333-4333-8333-333333333333',
            facility_name: 'Barangay Health Station Biga 1',
            address: 'Brgy. Hall Compound, Biga 1, Silang, Cavite',
            contact_number: '09189312201',
            email: 'bhs.biga1@silang.ph',
            type: 'BHS',
            facility_profile_url: '/uploads/doc3.webp',
            is_active: true
        },
        {
            facility_id: '44444444-4444-4444-8444-444444444444',
            facility_name: 'Barangay Health Station Lalaan 1',
            address: 'Emilio Aguinaldo Hwy, Lalaan 1, Silang, Cavite',
            contact_number: '09189312202',
            email: 'bhs.lalaan1@silang.ph',
            type: 'BHS',
            facility_profile_url: '/uploads/doc3.png',
            is_active: true
        },
        {
            facility_id: '55555555-5555-4555-8555-555555555555',
            facility_name: 'Barangay Health Station Tartaria',
            address: 'Tartaria Barangay Road, Tartaria, Silang, Cavite',
            contact_number: '09189312203',
            email: 'bhs.tartaria@silang.ph',
            type: 'BHS',
            facility_profile_url: '/uploads/doc4.png',
            is_active: true
        }
    ];

    const staffMembers = [
        {
            user_id: 'a1000000-0000-4000-8000-000000000001',
            facility_id: '11111111-1111-4111-8111-111111111111',
            first_name: 'Aris',
            middle_name: 'Cruz',
            last_name: 'Ramos',
            role: 'Doctor',
            phone_number: '09173456781',
            email: 'aris.ramos@silang.ph',
            address: 'Poblacion, Silang, Cavite',
            password: standardStaffPasswordHash,
            is_active: true
        },
        {
            user_id: 'a1000000-0000-4000-8000-000000000002',
            facility_id: '11111111-1111-4111-8111-111111111111',
            first_name: 'Elena',
            middle_name: 'Bautista',
            last_name: 'Soriano',
            role: 'Nurse',
            phone_number: '09184567891',
            email: 'elena.soriano@silang.ph',
            address: 'Biga 1, Silang, Cavite',
            password: standardStaffPasswordHash,
            is_active: true
        },
        {
            user_id: 'a1000000-0000-4000-8000-000000000003',
            facility_id: '11111111-1111-4111-8111-111111111111',
            first_name: 'Lita',
            middle_name: 'Santos',
            last_name: 'Macaraig',
            role: 'Midwife',
            phone_number: '09205678901',
            email: 'lita.macaraig@silang.ph',
            address: 'Biluso, Silang, Cavite',
            password: standardStaffPasswordHash,
            is_active: true
        },
        {
            user_id: 'a1000000-0000-4000-8000-000000000004',
            facility_id: '11111111-1111-4111-8111-111111111111',
            first_name: 'Joseph',
            middle_name: 'Perez',
            last_name: 'Mendoza',
            role: 'Admin',
            phone_number: '09226789012',
            email: 'admin.rhu1@silang.ph',
            address: 'Poblacion, Silang, Cavite',
            password: standardStaffPasswordHash,
            is_active: true
        },
        {
            user_id: 'a2000000-0000-4000-8000-000000000001',
            facility_id: '22222222-2222-4222-8222-222222222222',
            first_name: 'Carmela',
            middle_name: 'Villanueva',
            last_name: 'Dalisay',
            role: 'Doctor',
            phone_number: '09173456782',
            email: 'carmela.dalisay@silang.ph',
            address: 'Bulihan, Silang, Cavite',
            password: standardStaffPasswordHash,
            is_active: true
        },
        {
            user_id: 'a2000000-0000-4000-8000-000000000002',
            facility_id: '22222222-2222-4222-8222-222222222222',
            first_name: 'Paolo',
            middle_name: 'Aquino',
            last_name: 'Cruz',
            role: 'Nurse',
            phone_number: '09184567892',
            email: 'paolo.cruz@silang.ph',
            address: 'Bulihan, Silang, Cavite',
            password: standardStaffPasswordHash,
            is_active: true
        },
        {
            user_id: 'a2000000-0000-4000-8000-000000000003',
            facility_id: '22222222-2222-4222-8222-222222222222',
            first_name: 'Gina',
            middle_name: 'Ocampo',
            last_name: 'Morales',
            role: 'Midwife',
            phone_number: '09205678902',
            email: 'gina.morales@silang.ph',
            address: 'Lucsuhin, Silang, Cavite',
            password: standardStaffPasswordHash,
            is_active: true
        },
        {
            user_id: 'a2000000-0000-4000-8000-000000000004',
            facility_id: '22222222-2222-4222-8222-222222222222',
            first_name: 'Rachel',
            middle_name: 'Garcia',
            last_name: 'Tolentino',
            role: 'Admin',
            phone_number: '09226789013',
            email: 'admin.rhu2@silang.ph',
            address: 'Bulihan, Silang, Cavite',
            password: standardStaffPasswordHash,
            is_active: true
        },
        {
            user_id: 'a3000000-0000-4000-8000-000000000001',
            facility_id: '33333333-3333-4333-8333-333333333333',
            first_name: 'Teresa',
            middle_name: 'Castillo',
            last_name: 'Alcantara',
            role: 'Midwife',
            phone_number: '09173456783',
            email: 'teresa.alcantara@silang.ph',
            address: 'Biga 1, Silang, Cavite',
            password: standardStaffPasswordHash,
            is_active: true
        },
        {
            user_id: 'a3000000-0000-4000-8000-000000000002',
            facility_id: '33333333-3333-4333-8333-333333333333',
            first_name: 'Remedios',
            middle_name: 'Flores',
            last_name: 'Pangan',
            role: 'Nurse',
            phone_number: '09184567893',
            email: 'remedios.pangan@silang.ph',
            address: 'Biga 2, Silang, Cavite',
            password: standardStaffPasswordHash,
            is_active: true
        },
        {
            user_id: 'a3000000-0000-4000-8000-000000000003',
            facility_id: '33333333-3333-4333-8333-333333333333',
            first_name: 'Danilo',
            middle_name: 'Reyes',
            last_name: 'Ilagan',
            role: 'Admin',
            phone_number: '09226789014',
            email: 'admin.bhsbiga@silang.ph',
            address: 'Biga 1, Silang, Cavite',
            password: standardStaffPasswordHash,
            is_active: true
        },
        {
            user_id: 'a4000000-0000-4000-8000-000000000001',
            facility_id: '44444444-4444-4444-8444-444444444444',
            first_name: 'Jocelyn',
            middle_name: 'Navarro',
            last_name: 'Bautista',
            role: 'Midwife',
            phone_number: '09173456784',
            email: 'jocelyn.bautista@silang.ph',
            address: 'Lalaan 1, Silang, Cavite',
            password: standardStaffPasswordHash,
            is_active: true
        },
        {
            user_id: 'a4000000-0000-4000-8000-000000000002',
            facility_id: '44444444-4444-4444-8444-444444444444',
            first_name: 'Corazon',
            middle_name: 'Santos',
            last_name: 'Mercado',
            role: 'Nurse',
            phone_number: '09184567894',
            email: 'corazon.mercado@silang.ph',
            address: 'Lalaan 2, Silang, Cavite',
            password: standardStaffPasswordHash,
            is_active: true
        },
        {
            user_id: 'a4000000-0000-4000-8000-000000000003',
            facility_id: '44444444-4444-4444-8444-444444444444',
            first_name: 'Grace',
            middle_name: 'Pascual',
            last_name: 'De Guzman',
            role: 'Admin',
            phone_number: '09226789015',
            email: 'admin.bhslalaan@silang.ph',
            address: 'Lalaan 1, Silang, Cavite',
            password: standardStaffPasswordHash,
            is_active: true
        },
        {
            user_id: 'a5000000-0000-4000-8000-000000000001',
            facility_id: '55555555-5555-4555-8555-555555555555',
            first_name: 'Marites',
            middle_name: 'Aguilar',
            last_name: 'Villanueva',
            role: 'Midwife',
            phone_number: '09173456785',
            email: 'marites.villanueva@silang.ph',
            address: 'Tartaria, Silang, Cavite',
            password: standardStaffPasswordHash,
            is_active: true
        },
        {
            user_id: 'a5000000-0000-4000-8000-000000000002',
            facility_id: '55555555-5555-4555-8555-555555555555',
            first_name: 'Anita',
            middle_name: 'Mendoza',
            last_name: 'Santos',
            role: 'Nurse',
            phone_number: '09184567895',
            email: 'anita.santos@silang.ph',
            address: 'Tartaria, Silang, Cavite',
            password: standardStaffPasswordHash,
            is_active: true
        },
        {
            user_id: 'a5000000-0000-4000-8000-000000000003',
            facility_id: '55555555-5555-4555-8555-555555555555',
            first_name: 'Manuel',
            middle_name: 'Torres',
            last_name: 'Castillo',
            role: 'Admin',
            phone_number: '09226789016',
            email: 'admin.bhstartaria@silang.ph',
            address: 'Tartaria, Silang, Cavite',
            password: standardStaffPasswordHash,
            is_active: true
        }
    ];

    const staffSchedules = staffMembers.map(staff => ({
        schedule_id: `s-${staff.user_id.substring(2)}`,
        user_id: staff.user_id,
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        start_time: "08:00",
        end_time: "17:00"
    }));

    return {
        facilities,
        staffMembers,
        staffSchedules,
        standardStaffPasswordHash,
        standardMotherPasswordHash
    };
}

module.exports = { buildRealisticDataset };
