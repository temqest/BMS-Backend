const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function generateCompleteDataset() {
    const salt = await bcrypt.genSalt(10);
    const standardStaffPasswordHash = await bcrypt.hash('PiliHealth2026!', salt);
    const standardMotherPasswordHash = await bcrypt.hash('Password123!', salt);

    const facilities = [
        {
            facility_id: '11111111-1111-4111-8111-111111111111',
            facility_name: 'Pili Rural Health Unit I (Main Health Center)',
            address: 'National Highway, San Vicente, Pili, Camarines Sur',
            contact_number: '09178241101',
            email: 'rhu1.pili@gmail.com',
            type: 'RHU / Health Center',
            facility_profile_url: '/uploads/doc3.png',
            is_active: true
        },
        {
            facility_id: '22222222-2222-4222-8222-222222222222',
            facility_name: 'Pili Rural Health Unit II',
            address: 'Capitol Complex Area, Cadlan, Pili, Camarines Sur',
            contact_number: '09178241102',
            email: 'rhu2.pili@gmail.com',
            type: 'RHU / Health Center',
            facility_profile_url: '/uploads/doc4.png',
            is_active: true
        },
        {
            facility_id: '33333333-3333-4333-8333-333333333333',
            facility_name: 'Barangay Health Station Palestina',
            address: 'Zone 2, Palestina, Pili, Camarines Sur',
            contact_number: '09189312201',
            email: 'bhs.palestina.pili@gmail.com',
            type: 'BHS',
            facility_profile_url: '/uploads/doc3.webp',
            is_active: true
        },
        {
            facility_id: '44444444-4444-4444-8444-444444444444',
            facility_name: 'Barangay Health Station Anayan',
            address: 'Purok 1, Anayan, Pili, Camarines Sur',
            contact_number: '09189312202',
            email: 'bhs.anayan.pili@gmail.com',
            type: 'BHS',
            facility_profile_url: '/uploads/doc3.png',
            is_active: true
        },
        {
            facility_id: '55555555-5555-4555-8555-555555555555',
            facility_name: 'Barangay Health Station Himaao',
            address: 'Barangay Road, Himaao, Pili, Camarines Sur',
            contact_number: '09189312203',
            email: 'bhs.himaao.pili@gmail.com',
            type: 'BHS',
            facility_profile_url: '/uploads/doc4.png',
            is_active: true
        }
    ];

    const rawStaff = [
        { facIdx: 0, first_name: 'Aris', middle_name: 'Cruz', last_name: 'Ramos', role: 'Doctor', phone: '09173456781', email: 'aris.ramos@pili.gov.ph', address: 'San Vicente, Pili, Camarines Sur' },
        { facIdx: 0, first_name: 'Elena', middle_name: 'Bautista', last_name: 'Soriano', role: 'Nurse', phone: '09184567891', email: 'elena.soriano@pili.gov.ph', address: 'San Agustin, Pili, Camarines Sur' },
        { facIdx: 0, first_name: 'Lita', middle_name: 'Santos', last_name: 'Macaraig', role: 'Midwife', phone: '09205678901', email: 'lita.macaraig@pili.gov.ph', address: 'San Jose, Pili, Camarines Sur' },
        { facIdx: 0, first_name: 'Joseph', middle_name: 'Perez', last_name: 'Mendoza', role: 'Admin', phone: '09226789012', email: 'admin.rhu1.pili@gmail.com', address: 'San Vicente, Pili, Camarines Sur' },

        { facIdx: 1, first_name: 'Carmela', middle_name: 'Villanueva', last_name: 'Dalisay', role: 'Doctor', phone: '09173456782', email: 'carmela.dalisay@pili.gov.ph', address: 'Cadlan, Pili, Camarines Sur' },
        { facIdx: 1, first_name: 'Paolo', middle_name: 'Aquino', last_name: 'Cruz', role: 'Nurse', phone: '09184567892', email: 'paolo.cruz@pili.gov.ph', address: 'Cadlan, Pili, Camarines Sur' },
        { facIdx: 1, first_name: 'Gina', middle_name: 'Ocampo', last_name: 'Morales', role: 'Midwife', phone: '09205678902', email: 'gina.morales@pili.gov.ph', address: 'Curry, Pili, Camarines Sur' },
        { facIdx: 1, first_name: 'Rachel', middle_name: 'Garcia', last_name: 'Tolentino', role: 'Admin', phone: '09226789013', email: 'admin.rhu2.pili@gmail.com', address: 'Cadlan, Pili, Camarines Sur' },

        { facIdx: 2, first_name: 'Teresa', middle_name: 'Castillo', last_name: 'Alcantara', role: 'Midwife', phone: '09173456783', email: 'teresa.alcantara@pili.gov.ph', address: 'Palestina, Pili, Camarines Sur' },
        { facIdx: 2, first_name: 'Remedios', middle_name: 'Flores', last_name: 'Pangan', role: 'Nurse', phone: '09184567893', email: 'remedios.pangan@pili.gov.ph', address: 'Palestina, Pili, Camarines Sur' },
        { facIdx: 2, first_name: 'Danilo', middle_name: 'Reyes', last_name: 'Ilagan', role: 'Admin', phone: '09226789014', email: 'admin.palestina@gmail.com', address: 'Palestina, Pili, Camarines Sur' },

        { facIdx: 3, first_name: 'Jocelyn', middle_name: 'Navarro', last_name: 'Bautista', role: 'Midwife', phone: '09173456784', email: 'jocelyn.bautista@pili.gov.ph', address: 'Anayan, Pili, Camarines Sur' },
        { facIdx: 3, first_name: 'Corazon', middle_name: 'Santos', last_name: 'Mercado', role: 'Nurse', phone: '09184567894', email: 'corazon.mercado@pili.gov.ph', address: 'Anayan, Pili, Camarines Sur' },
        { facIdx: 3, first_name: 'Grace', middle_name: 'Pascual', last_name: 'De Guzman', role: 'Admin', phone: '09226789015', email: 'admin.anayan@gmail.com', address: 'Anayan, Pili, Camarines Sur' },

        { facIdx: 4, first_name: 'Marites', middle_name: 'Aguilar', last_name: 'Villanueva', role: 'Midwife', phone: '09173456785', email: 'marites.villanueva@pili.gov.ph', address: 'Himaao, Pili, Camarines Sur' },
        { facIdx: 4, first_name: 'Anita', middle_name: 'Mendoza', last_name: 'Santos', role: 'Nurse', phone: '09184567895', email: 'anita.santos@pili.gov.ph', address: 'Himaao, Pili, Camarines Sur' },
        { facIdx: 4, first_name: 'Manuel', middle_name: 'Torres', last_name: 'Castillo', role: 'Admin', phone: '09226789016', email: 'admin.himaao@gmail.com', address: 'Himaao, Pili, Camarines Sur' }
    ];

    const staffMembers = rawStaff.map((s, idx) => ({
        user_id: `a0000000-0000-4000-8000-${String(idx + 1).padStart(12, '0')}`,
        facility_id: facilities[s.facIdx].facility_id,
        first_name: s.first_name,
        middle_name: s.middle_name,
        last_name: s.last_name,
        role: s.role,
        phone_number: s.phone,
        email: s.email,
        address: s.address,
        password: standardStaffPasswordHash,
        is_active: true
    }));

    const staffSchedules = staffMembers.map((staff, idx) => ({
        schedule_id: `b0000000-0000-4000-8000-${String(idx + 1).padStart(12, '0')}`,
        user_id: staff.user_id,
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        start_time: "08:00",
        end_time: "17:00"
    }));

    const motherProfiles = [
        { num: 1, facIdx: 0, first_name: 'Maria Luisa', middle_name: 'Del Rosario', last_name: 'Santos', age: 26, civil_status: 'Married', blood_type: 'O+', phone: '09171010001', address: 'Zone 1, San Vicente, Pili, Camarines Sur', hasUser: true, email: 'maria.santos@gmail.com', gravida: 1, parity: 0, lmp: '2026-05-10', edd: '2027-02-14', status: 'Active', risk: 'Low Risk', bmi: 21.5, height: 155.0, comorbidities: null, prev_cs: false },
        { num: 2, facIdx: 0, first_name: 'Angelica', middle_name: 'Flores', last_name: 'Reyes', age: 36, civil_status: 'Married', blood_type: 'A+', phone: '09171010002', address: 'Zone 3, San Vicente, Pili, Camarines Sur', hasUser: true, email: 'angelica.reyes@gmail.com', gravida: 3, parity: 2, lmp: '2026-04-05', edd: '2027-01-10', status: 'Active', risk: 'Moderate Risk', bmi: 27.2, height: 152.0, comorbidities: 'Advanced Maternal Age (36), Mild Nutritional Anemia', prev_cs: true },
        { num: 3, facIdx: 0, first_name: 'Catherine', middle_name: 'Gonzales', last_name: 'Cruz', age: 29, civil_status: 'Married', blood_type: 'B+', phone: '09171010003', address: 'Purok 2, San Agustin, Pili, Camarines Sur', hasUser: true, email: 'catherine.cruz@gmail.com', gravida: 2, parity: 1, lmp: '2026-03-12', edd: '2026-12-17', status: 'Active', risk: 'High Risk', bmi: 31.4, height: 150.0, comorbidities: 'Severe Preeclampsia, Gestational Hypertension', prev_cs: false },
        { num: 4, facIdx: 0, first_name: 'Jennilyn', middle_name: 'Morales', last_name: 'Bautista', age: 23, civil_status: 'Cohabiting', blood_type: 'O+', phone: '09171010004', address: 'Zone 4, San Vicente, Pili, Camarines Sur', hasUser: false, email: null, gravida: 1, parity: 0, lmp: '2026-06-20', edd: '2027-03-27', status: 'Active', risk: 'Low Risk', bmi: 20.8, height: 158.0, comorbidities: null, prev_cs: false },
        { num: 5, facIdx: 0, first_name: 'Mary Grace', middle_name: 'Torres', last_name: 'Ocampo', age: 17, civil_status: 'Single', blood_type: 'A+', phone: '09171010005', address: 'Zone 5, San Vicente, Pili, Camarines Sur', hasUser: true, email: 'marygrace.ocampo@gmail.com', gravida: 1, parity: 0, lmp: '2026-07-01', edd: '2027-04-07', status: 'Active', risk: 'Moderate Risk', bmi: 18.2, height: 149.0, comorbidities: 'Adolescent Pregnancy (17)', prev_cs: false },
        { num: 6, facIdx: 0, first_name: 'Kristine Joy', middle_name: 'Alvarez', last_name: 'Garcia', age: 28, civil_status: 'Married', blood_type: 'O+', phone: '09171010006', address: 'Purok 3, San Jose, Pili, Camarines Sur', hasUser: false, email: null, gravida: 2, parity: 1, lmp: '2026-02-15', edd: '2026-11-22', status: 'Delivered', deliveryDate: '2026-11-18', risk: 'Low Risk', bmi: 22.4, height: 156.0, comorbidities: null, prev_cs: false },
        { num: 7, facIdx: 0, first_name: 'Rochelle', middle_name: 'Pascual', last_name: 'Mendoza', age: 31, civil_status: 'Married', blood_type: 'AB+', phone: '09171010007', address: 'Purok 1, La Purisima, Pili, Camarines Sur', hasUser: true, email: 'rochelle.mendoza@gmail.com', gravida: 3, parity: 2, lmp: '2026-01-20', edd: '2026-10-27', status: 'Delivered', deliveryDate: '2026-10-25', risk: 'Low Risk', bmi: 24.1, height: 154.0, comorbidities: null, prev_cs: false },
        { num: 8, facIdx: 0, first_name: 'Bernadette', middle_name: 'Castillo', last_name: 'Flores', age: 27, civil_status: 'Married', blood_type: 'O+', phone: '09171010008', address: 'Zone 2, San Vicente, Pili, Camarines Sur', hasUser: false, email: null, gravida: 2, parity: 1, lmp: '2026-08-10', edd: '2027-05-17', status: 'Active', risk: 'Low Risk', bmi: 21.0, height: 160.0, comorbidities: null, prev_cs: false },
        { num: 9, facIdx: 0, first_name: 'Maricar', middle_name: 'Tolentino', last_name: 'Gonzales', age: 33, civil_status: 'Married', blood_type: 'B+', phone: '09171010009', address: 'Purok 4, San Agustin, Pili, Camarines Sur', hasUser: false, email: null, gravida: 4, parity: 3, lmp: '2026-04-18', edd: '2027-01-23', status: 'Active', risk: 'High Risk', bmi: 29.5, height: 151.0, comorbidities: 'Gestational Diabetes Mellitus (GDM), Multiparous', prev_cs: false },
        { num: 10, facIdx: 0, first_name: 'Rosemarie', middle_name: 'Aquino', last_name: 'Villanueva', age: 24, civil_status: 'Single', blood_type: 'O+', phone: '09171010010', address: 'Zone 3, San Vicente, Pili, Camarines Sur', hasUser: true, email: 'rosemarie.villanueva@gmail.com', gravida: 1, parity: 0, lmp: '2026-05-25', edd: '2027-03-01', status: 'Active', risk: 'Low Risk', bmi: 22.0, height: 153.0, comorbidities: null, prev_cs: false },
        { num: 11, facIdx: 0, first_name: 'Julie Ann', middle_name: 'De Leon', last_name: 'Mercado', age: 22, civil_status: 'Married', blood_type: 'A+', phone: '09171010011', address: 'Zone 1, San Juan, Pili, Camarines Sur', hasUser: false, email: null, gravida: 1, parity: 0, lmp: '2026-06-05', edd: '2027-03-12', status: 'Active', risk: 'Low Risk', bmi: 19.8, height: 157.0, comorbidities: null, prev_cs: false },
        { num: 12, facIdx: 0, first_name: 'Diane', middle_name: 'Soriano', last_name: 'Tolentino', age: 38, civil_status: 'Married', blood_type: 'O+', phone: '09171010012', address: 'Purok 2, San Jose, Pili, Camarines Sur', hasUser: false, email: null, gravida: 5, parity: 4, lmp: '2026-03-25', edd: '2026-12-30', status: 'Active', risk: 'Moderate Risk', bmi: 28.0, height: 150.0, comorbidities: 'Grand Multipara (Parity 4), AMA (38)', prev_cs: false },
        { num: 13, facIdx: 0, first_name: 'Camille', middle_name: 'Navarro', last_name: 'Aguilar', age: 25, civil_status: 'Cohabiting', blood_type: 'O+', phone: '09171010013', address: 'Zone 6, San Vicente, Pili, Camarines Sur', hasUser: false, email: null, gravida: 2, parity: 1, lmp: '2026-02-01', edd: '2026-11-08', status: 'Delivered', deliveryDate: '2026-11-06', risk: 'Low Risk', bmi: 23.0, height: 155.0, comorbidities: null, prev_cs: false },
        { num: 14, facIdx: 0, first_name: 'Stephanie', middle_name: 'Salvador', last_name: 'Castillo', age: 30, civil_status: 'Married', blood_type: 'B+', phone: '09171010014', address: 'Zone 2, San Vicente, Pili, Camarines Sur', hasUser: true, email: 'stephanie.castillo@gmail.com', gravida: 2, parity: 1, lmp: '2026-04-12', edd: '2027-01-17', status: 'Active', risk: 'Low Risk', bmi: 22.8, height: 159.0, comorbidities: null, prev_cs: false },

        { num: 15, facIdx: 1, first_name: 'Joanna Marie', middle_name: 'Dalisay', last_name: 'Pascual', age: 25, civil_status: 'Married', blood_type: 'O+', phone: '09182020001', address: 'Zone 1, Cadlan, Pili, Camarines Sur', hasUser: true, email: 'joanna.pascual@gmail.com', gravida: 1, parity: 0, lmp: '2026-05-15', edd: '2027-02-19', status: 'Active', risk: 'Low Risk', bmi: 21.2, height: 153.0, comorbidities: null, prev_cs: false },
        { num: 16, facIdx: 1, first_name: 'Kimberly', middle_name: 'Torres', last_name: 'Alcantara', age: 32, civil_status: 'Married', blood_type: 'A+', phone: '09182020002', address: 'Zone 2, Cadlan, Pili, Camarines Sur', hasUser: true, email: 'kimberly.alcantara@gmail.com', gravida: 3, parity: 2, lmp: '2026-03-30', edd: '2027-01-04', status: 'Active', risk: 'High Risk', bmi: 30.1, height: 150.0, comorbidities: 'Severe Gestational Hypertension, Antepartum Bleeding Spotting', prev_cs: true },
        { num: 17, facIdx: 1, first_name: 'Maricel', middle_name: 'Mercado', last_name: 'Manalo', age: 27, civil_status: 'Married', blood_type: 'B+', phone: '09182020003', address: 'Purok 1, Tagbong, Pili, Camarines Sur', hasUser: false, email: null, gravida: 2, parity: 1, lmp: '2026-06-10', edd: '2027-03-17', status: 'Active', risk: 'Low Risk', bmi: 22.5, height: 156.0, comorbidities: null, prev_cs: false },
        { num: 18, facIdx: 1, first_name: 'Rowena', middle_name: 'Bautista', last_name: 'Ilagan', age: 35, civil_status: 'Married', blood_type: 'O+', phone: '09182020004', address: 'Zone 3, Cadlan, Pili, Camarines Sur', hasUser: true, email: 'rowena.ilagan@gmail.com', gravida: 4, parity: 3, lmp: '2026-04-20', edd: '2027-01-25', status: 'Active', risk: 'Moderate Risk', bmi: 26.5, height: 152.0, comorbidities: 'Advanced Maternal Age (35), Bronchial Asthma', prev_cs: false },
        { num: 19, facIdx: 1, first_name: 'Cristina', middle_name: 'Santos', last_name: 'Morales', age: 21, civil_status: 'Single', blood_type: 'O+', phone: '09182020005', address: 'Zone 4, Cadlan, Pili, Camarines Sur', hasUser: false, email: null, gravida: 1, parity: 0, lmp: '2026-07-15', edd: '2027-04-21', status: 'Active', risk: 'Low Risk', bmi: 19.5, height: 155.0, comorbidities: null, prev_cs: false },
        { num: 20, facIdx: 1, first_name: 'Sheryl', middle_name: 'Castillo', last_name: 'Cruz', age: 29, civil_status: 'Married', blood_type: 'A+', phone: '09182020006', address: 'Purok 2, Curry, Pili, Camarines Sur', hasUser: false, email: null, gravida: 2, parity: 1, lmp: '2026-02-10', edd: '2026-11-17', status: 'Delivered', deliveryDate: '2026-11-14', risk: 'Low Risk', bmi: 23.8, height: 154.0, comorbidities: null, prev_cs: false },
        { num: 21, facIdx: 1, first_name: 'Jennifer', middle_name: 'Ramos', last_name: 'De Guzman', age: 34, civil_status: 'Married', blood_type: 'O+', phone: '09182020007', address: 'Zone 1, Cadlan, Pili, Camarines Sur', hasUser: true, email: 'jennifer.deguzman@gmail.com', gravida: 3, parity: 2, lmp: '2026-01-15', edd: '2026-10-22', status: 'Delivered', deliveryDate: '2026-10-19', risk: 'Moderate Risk', bmi: 27.0, height: 151.0, comorbidities: 'Previous Caesarean Section Delivery', prev_cs: true },
        { num: 22, facIdx: 1, first_name: 'Bea', middle_name: 'Villanueva', last_name: 'Reyes', age: 18, civil_status: 'Cohabiting', blood_type: 'B+', phone: '09182020008', address: 'Purok 3, Curry, Pili, Camarines Sur', hasUser: true, email: 'bea.reyes@gmail.com', gravida: 1, parity: 0, lmp: '2026-06-25', edd: '2027-04-01', status: 'Active', risk: 'Moderate Risk', bmi: 19.0, height: 150.0, comorbidities: 'Adolescent Pregnancy (18), Nutritional Risk', prev_cs: false },
        { num: 23, facIdx: 1, first_name: 'Sarah', middle_name: 'Gonzales', last_name: 'Ocampo', age: 30, civil_status: 'Married', blood_type: 'O+', phone: '09182020009', address: 'Zone 2, Cadlan, Pili, Camarines Sur', hasUser: false, email: null, gravida: 2, parity: 1, lmp: '2026-05-01', edd: '2027-02-05', status: 'Active', risk: 'Low Risk', bmi: 24.2, height: 158.0, comorbidities: null, prev_cs: false },
        { num: 24, facIdx: 1, first_name: 'Hazel', middle_name: 'Perez', last_name: 'Tolentino', age: 26, civil_status: 'Married', blood_type: 'A+', phone: '09182020010', address: 'Purok 1, New San Roque, Pili, Camarines Sur', hasUser: false, email: null, gravida: 1, parity: 0, lmp: '2026-08-01', edd: '2027-05-08', status: 'Active', risk: 'Low Risk', bmi: 21.8, height: 155.0, comorbidities: null, prev_cs: false },
        { num: 25, facIdx: 1, first_name: 'Melanie', middle_name: 'Alvarez', last_name: 'Garcia', age: 31, civil_status: 'Married', blood_type: 'O+', phone: '09182020011', address: 'Zone 3, Cadlan, Pili, Camarines Sur', hasUser: true, email: 'melanie.garcia@gmail.com', gravida: 3, parity: 2, lmp: '2026-04-10', edd: '2027-01-15', status: 'Active', risk: 'High Risk', bmi: 28.9, height: 152.0, comorbidities: 'Severe Anemia (Hb 8.4 g/dL), Chronic Goiter', prev_cs: false },
        { num: 26, facIdx: 1, first_name: 'April', middle_name: 'Flores', last_name: 'Mendoza', age: 24, civil_status: 'Single', blood_type: 'B+', phone: '09182020012', address: 'Purok 2, Caroyroyan, Pili, Camarines Sur', hasUser: false, email: null, gravida: 1, parity: 0, lmp: '2026-06-15', edd: '2027-03-22', status: 'Active', risk: 'Low Risk', bmi: 20.5, height: 157.0, comorbidities: null, prev_cs: false },
        { num: 27, facIdx: 1, first_name: 'Joy', middle_name: 'Navarro', last_name: 'Aguilar', age: 28, civil_status: 'Married', blood_type: 'O+', phone: '09182020013', address: 'Zone 4, Cadlan, Pili, Camarines Sur', hasUser: false, email: null, gravida: 2, parity: 1, lmp: '2026-02-28', edd: '2026-12-05', status: 'Active', risk: 'Low Risk', bmi: 23.1, height: 156.0, comorbidities: null, prev_cs: false },

        { num: 28, facIdx: 2, first_name: 'Lorna', middle_name: 'Santos', last_name: 'Castillo', age: 27, civil_status: 'Married', blood_type: 'O+', phone: '09203030001', address: 'Zone 1, Palestina, Pili, Camarines Sur', hasUser: true, email: 'lorna.castillo@gmail.com', gravida: 2, parity: 1, lmp: '2026-05-18', edd: '2027-02-22', status: 'Active', risk: 'Low Risk', bmi: 22.0, height: 154.0, comorbidities: null, prev_cs: false },
        { num: 29, facIdx: 2, first_name: 'Glenda', middle_name: 'Ramos', last_name: 'Pascual', age: 37, civil_status: 'Married', blood_type: 'A+', phone: '09203030002', address: 'Zone 2, Palestina, Pili, Camarines Sur', hasUser: true, email: 'glenda.pascual@gmail.com', gravida: 4, parity: 3, lmp: '2026-04-14', edd: '2027-01-19', status: 'Active', risk: 'Moderate Risk', bmi: 26.8, height: 151.0, comorbidities: 'Advanced Maternal Age (37), Recurrent UTI', prev_cs: false },
        { num: 30, facIdx: 2, first_name: 'Aileen', middle_name: 'Cruz', last_name: 'Torres', age: 25, civil_status: 'Married', blood_type: 'B+', phone: '09203030003', address: 'Zone 3, Palestina, Pili, Camarines Sur', hasUser: false, email: null, gravida: 1, parity: 0, lmp: '2026-06-01', edd: '2027-03-08', status: 'Active', risk: 'Low Risk', bmi: 21.4, height: 158.0, comorbidities: null, prev_cs: false },
        { num: 31, facIdx: 2, first_name: 'Nenita', middle_name: 'Bautista', last_name: 'Alcantara', age: 39, civil_status: 'Married', blood_type: 'O+', phone: '09203030004', address: 'Zone 4, Palestina, Pili, Camarines Sur', hasUser: true, email: 'nenita.alcantara@gmail.com', gravida: 5, parity: 4, lmp: '2026-03-10', edd: '2026-12-15', status: 'Active', risk: 'High Risk', bmi: 32.0, height: 150.0, comorbidities: 'Chronic Hypertension in Pregnancy, Grand Multipara', prev_cs: false },
        { num: 32, facIdx: 2, first_name: 'Maureen', middle_name: 'Mercado', last_name: 'Ilagan', age: 22, civil_status: 'Single', blood_type: 'A+', phone: '09203030005', address: 'Zone 1, Palestina, Pili, Camarines Sur', hasUser: false, email: null, gravida: 1, parity: 0, lmp: '2026-07-20', edd: '2027-04-26', status: 'Active', risk: 'Low Risk', bmi: 20.1, height: 155.0, comorbidities: null, prev_cs: false },
        { num: 33, facIdx: 2, first_name: 'Sherlene', middle_name: 'Gonzales', last_name: 'Morales', age: 28, civil_status: 'Married', blood_type: 'O+', phone: '09203030006', address: 'Zone 2, Palestina, Pili, Camarines Sur', hasUser: false, email: null, gravida: 2, parity: 1, lmp: '2026-01-25', edd: '2026-11-01', status: 'Delivered', deliveryDate: '2026-10-29', risk: 'Low Risk', bmi: 23.5, height: 153.0, comorbidities: null, prev_cs: false },
        { num: 34, facIdx: 2, first_name: 'Charito', middle_name: 'Perez', last_name: 'Cruz', age: 33, civil_status: 'Married', blood_type: 'O+', phone: '09203030007', address: 'Purok 1, Pawili, Pili, Camarines Sur', hasUser: true, email: 'charito.cruz@gmail.com', gravida: 3, parity: 2, lmp: '2026-02-05', edd: '2026-11-12', status: 'Delivered', deliveryDate: '2026-11-10', risk: 'Low Risk', bmi: 24.0, height: 156.0, comorbidities: null, prev_cs: false },
        { num: 35, facIdx: 2, first_name: 'Giselle', middle_name: 'Alvarez', last_name: 'De Guzman', age: 24, civil_status: 'Cohabiting', blood_type: 'B+', phone: '09203030008', address: 'Zone 3, Palestina, Pili, Camarines Sur', hasUser: false, email: null, gravida: 1, parity: 0, lmp: '2026-08-05', edd: '2027-05-12', status: 'Active', risk: 'Low Risk', bmi: 21.7, height: 157.0, comorbidities: null, prev_cs: false },
        { num: 36, facIdx: 2, first_name: 'Princess', middle_name: 'Flores', last_name: 'Reyes', age: 19, civil_status: 'Single', blood_type: 'O+', phone: '09203030009', address: 'Zone 4, Palestina, Pili, Camarines Sur', hasUser: false, email: null, gravida: 1, parity: 0, lmp: '2026-05-28', edd: '2027-03-04', status: 'Active', risk: 'Low Risk', bmi: 19.4, height: 152.0, comorbidities: null, prev_cs: false },
        { num: 37, facIdx: 2, first_name: 'Evelyn', middle_name: 'Navarro', last_name: 'Ocampo', age: 31, civil_status: 'Married', blood_type: 'A+', phone: '09203030010', address: 'Purok 2, Sagurong, Pili, Camarines Sur', hasUser: false, email: null, gravida: 2, parity: 1, lmp: '2026-04-25', edd: '2027-01-30', status: 'Active', risk: 'Moderate Risk', bmi: 25.8, height: 154.0, comorbidities: 'Previous C-Section delivery (2023)', prev_cs: true },
        { num: 38, facIdx: 2, first_name: 'Cynthia', middle_name: 'Dalisay', last_name: 'Tolentino', age: 26, civil_status: 'Married', blood_type: 'O+', phone: '09203030011', address: 'Zone 1, Palestina, Pili, Camarines Sur', hasUser: false, email: null, gravida: 1, parity: 0, lmp: '2026-06-18', edd: '2027-03-25', status: 'Active', risk: 'Low Risk', bmi: 22.3, height: 159.0, comorbidities: null, prev_cs: false },
        { num: 39, facIdx: 2, first_name: 'Riza', middle_name: 'Salvador', last_name: 'Garcia', age: 30, civil_status: 'Married', blood_type: 'O+', phone: '09203030012', address: 'Zone 2, Palestina, Pili, Camarines Sur', hasUser: true, email: 'riza.garcia@gmail.com', gravida: 2, parity: 1, lmp: '2026-03-15', edd: '2026-12-20', status: 'Active', risk: 'High Risk', bmi: 29.1, height: 153.0, comorbidities: 'Fetal Tachycardia (172 bpm), Oligohydramnios Suspicion', prev_cs: false },

        { num: 40, facIdx: 3, first_name: 'Jemimah', middle_name: 'Pascual', last_name: 'Mendoza', age: 25, civil_status: 'Married', blood_type: 'O+', phone: '09224040001', address: 'Purok 1, Anayan, Pili, Camarines Sur', hasUser: true, email: 'jemimah.mendoza@gmail.com', gravida: 1, parity: 0, lmp: '2026-05-12', edd: '2027-02-16', status: 'Active', risk: 'Low Risk', bmi: 21.0, height: 156.0, comorbidities: null, prev_cs: false },
        { num: 41, facIdx: 3, first_name: 'Mylene', middle_name: 'Castillo', last_name: 'Aguilar', age: 34, civil_status: 'Married', blood_type: 'A+', phone: '09224040002', address: 'Purok 2, Anayan, Pili, Camarines Sur', hasUser: true, email: 'mylene.aguilar@gmail.com', gravida: 3, parity: 2, lmp: '2026-04-02', edd: '2027-01-07', status: 'Active', risk: 'High Risk', bmi: 31.2, height: 151.0, comorbidities: 'Gestational Diabetes Mellitus, Borderline BP', prev_cs: false },
        { num: 42, facIdx: 3, first_name: 'Kaye', middle_name: 'Ramos', last_name: 'Castillo', age: 21, civil_status: 'Single', blood_type: 'B+', phone: '09224040003', address: 'Purok 3, Anayan, Pili, Camarines Sur', hasUser: false, email: null, gravida: 1, parity: 0, lmp: '2026-06-22', edd: '2027-03-29', status: 'Active', risk: 'Low Risk', bmi: 19.9, height: 155.0, comorbidities: null, prev_cs: false },
        { num: 43, facIdx: 3, first_name: 'Lorena', middle_name: 'Cruz', last_name: 'Pascual', age: 36, civil_status: 'Married', blood_type: 'O+', phone: '09224040004', address: 'Purok 1, Binobong, Pili, Camarines Sur', hasUser: true, email: 'lorena.pascual@gmail.com', gravida: 4, parity: 3, lmp: '2026-03-22', edd: '2026-12-27', status: 'Active', risk: 'Moderate Risk', bmi: 27.5, height: 152.0, comorbidities: 'Advanced Maternal Age (36), Mild Iron Deficiency Anemia', prev_cs: false },
        { num: 44, facIdx: 3, first_name: 'Ivy', middle_name: 'Bautista', last_name: 'Torres', age: 23, civil_status: 'Cohabiting', blood_type: 'O+', phone: '09224040005', address: 'Purok 4, Anayan, Pili, Camarines Sur', hasUser: false, email: null, gravida: 1, parity: 0, lmp: '2026-07-12', edd: '2027-04-18', status: 'Active', risk: 'Low Risk', bmi: 20.6, height: 158.0, comorbidities: null, prev_cs: false },
        { num: 45, facIdx: 3, first_name: 'Leilani', middle_name: 'Mercado', last_name: 'Alcantara', age: 29, civil_status: 'Married', blood_type: 'A+', phone: '09224040006', address: 'Purok 2, Anayan, Pili, Camarines Sur', hasUser: false, email: null, gravida: 2, parity: 1, lmp: '2026-01-18', edd: '2026-10-25', status: 'Delivered', deliveryDate: '2026-10-22', risk: 'Low Risk', bmi: 22.9, height: 154.0, comorbidities: null, prev_cs: false },
        { num: 46, facIdx: 3, first_name: 'Maritess', middle_name: 'Gonzales', last_name: 'Ilagan', age: 32, civil_status: 'Married', blood_type: 'O+', phone: '09224040007', address: 'Purok 3, Anayan, Pili, Camarines Sur', hasUser: false, email: null, gravida: 3, parity: 2, lmp: '2026-02-12', edd: '2026-11-19', status: 'Delivered', deliveryDate: '2026-11-16', risk: 'Moderate Risk', bmi: 25.1, height: 153.0, comorbidities: 'History of Postpartum Hemorrhage in previous pregnancy', prev_cs: false },
        { num: 47, facIdx: 3, first_name: 'Carmina', middle_name: 'Perez', last_name: 'Morales', age: 26, civil_status: 'Married', blood_type: 'B+', phone: '09224040008', address: 'Purok 1, Anayan, Pili, Camarines Sur', hasUser: false, email: null, gravida: 1, parity: 0, lmp: '2026-08-14', edd: '2027-05-21', status: 'Active', risk: 'Low Risk', bmi: 21.5, height: 156.0, comorbidities: null, prev_cs: false },
        { num: 48, facIdx: 3, first_name: 'Judy', middle_name: 'Alvarez', last_name: 'Cruz', age: 27, civil_status: 'Married', blood_type: 'O+', phone: '09224040009', address: 'Purok 2, Tinangis, Pili, Camarines Sur', hasUser: true, email: 'judy.cruz@gmail.com', gravida: 2, parity: 1, lmp: '2026-05-20', edd: '2027-02-24', status: 'Active', risk: 'Low Risk', bmi: 23.3, height: 157.0, comorbidities: null, prev_cs: false },
        { num: 49, facIdx: 3, first_name: 'Beverly', middle_name: 'Flores', last_name: 'De Guzman', age: 18, civil_status: 'Single', blood_type: 'O+', phone: '09224040010', address: 'Purok 4, Anayan, Pili, Camarines Sur', hasUser: false, email: null, gravida: 1, parity: 0, lmp: '2026-06-08', edd: '2027-03-15', status: 'Active', risk: 'Moderate Risk', bmi: 18.5, height: 151.0, comorbidities: 'Adolescent Pregnancy (18), Underweight BMI', prev_cs: false },
        { num: 50, facIdx: 3, first_name: 'Regina', middle_name: 'Navarro', last_name: 'Reyes', age: 30, civil_status: 'Married', blood_type: 'A+', phone: '09224040011', address: 'Purok 3, Anayan, Pili, Camarines Sur', hasUser: false, email: null, gravida: 2, parity: 1, lmp: '2026-04-16', edd: '2027-01-21', status: 'Active', risk: 'Low Risk', bmi: 24.5, height: 155.0, comorbidities: null, prev_cs: false },

        { num: 51, facIdx: 4, first_name: 'Flordeliza', middle_name: 'Dalisay', last_name: 'Ocampo', age: 26, civil_status: 'Married', blood_type: 'O+', phone: '09255050001', address: 'Zone 1, Himaao, Pili, Camarines Sur', hasUser: true, email: 'flordeliza.ocampo@gmail.com', gravida: 1, parity: 0, lmp: '2026-05-08', edd: '2027-02-12', status: 'Active', risk: 'Low Risk', bmi: 21.8, height: 154.0, comorbidities: null, prev_cs: false },
        { num: 52, facIdx: 4, first_name: 'Jacqueline', middle_name: 'Salvador', last_name: 'Tolentino', age: 35, civil_status: 'Married', blood_type: 'B+', phone: '09255050002', address: 'Zone 2, Himaao, Pili, Camarines Sur', hasUser: true, email: 'jacqueline.tolentino@gmail.com', gravida: 3, parity: 2, lmp: '2026-03-28', edd: '2027-01-02', status: 'Active', risk: 'High Risk', bmi: 29.8, height: 152.0, comorbidities: 'Preeclampsia, Severe Frontal Headaches, Facial Puffiness', prev_cs: true },
        { num: 53, facIdx: 4, first_name: 'Norma', middle_name: 'Pascual', last_name: 'Garcia', age: 28, civil_status: 'Married', blood_type: 'O+', phone: '09255050003', address: 'Zone 3, Himaao, Pili, Camarines Sur', hasUser: false, email: null, gravida: 2, parity: 1, lmp: '2026-06-12', edd: '2027-03-19', status: 'Active', risk: 'Low Risk', bmi: 22.4, height: 158.0, comorbidities: null, prev_cs: false },
        { num: 54, facIdx: 4, first_name: 'Tanya', middle_name: 'Castillo', last_name: 'Mendoza', age: 22, civil_status: 'Single', blood_type: 'A+', phone: '09255050004', address: 'Zone 4, Himaao, Pili, Camarines Sur', hasUser: false, email: null, gravida: 1, parity: 0, lmp: '2026-07-08', edd: '2027-04-14', status: 'Active', risk: 'Low Risk', bmi: 20.3, height: 153.0, comorbidities: null, prev_cs: false },
        { num: 55, facIdx: 4, first_name: 'Wilma', middle_name: 'Ramos', last_name: 'Aguilar', age: 38, civil_status: 'Married', blood_type: 'O+', phone: '09255050005', address: 'Zone 1, Himaao, Pili, Camarines Sur', hasUser: true, email: 'wilma.aguilar@gmail.com', gravida: 5, parity: 4, lmp: '2026-04-05', edd: '2027-01-10', status: 'Active', risk: 'Moderate Risk', bmi: 28.5, height: 149.0, comorbidities: 'Advanced Maternal Age (38), Grand Multipara', prev_cs: false },
        { num: 56, facIdx: 4, first_name: 'Cherry', middle_name: 'Cruz', last_name: 'Castillo', age: 24, civil_status: 'Cohabiting', blood_type: 'O+', phone: '09255050006', address: 'Zone 2, Himaao, Pili, Camarines Sur', hasUser: false, email: null, gravida: 1, parity: 0, lmp: '2026-08-08', edd: '2027-05-15', status: 'Active', risk: 'Low Risk', bmi: 21.1, height: 155.0, comorbidities: null, prev_cs: false },
        { num: 57, facIdx: 4, first_name: 'Leonora', middle_name: 'Bautista', last_name: 'Pascual', age: 30, civil_status: 'Married', blood_type: 'B+', phone: '09255050007', address: 'Zone 3, Himaao, Pili, Camarines Sur', hasUser: false, email: null, gravida: 2, parity: 1, lmp: '2026-01-28', edd: '2026-11-04', status: 'Delivered', deliveryDate: '2026-11-01', risk: 'Low Risk', bmi: 23.6, height: 157.0, comorbidities: null, prev_cs: false },
        { num: 58, facIdx: 4, first_name: 'Rosanna', middle_name: 'Mercado', last_name: 'Torres', age: 33, civil_status: 'Married', blood_type: 'O+', phone: '09255050008', address: 'Purok 1, Sagrada, Pili, Camarines Sur', hasUser: false, email: null, gravida: 3, parity: 2, lmp: '2026-02-18', edd: '2026-11-25', status: 'Delivered', deliveryDate: '2026-11-20', risk: 'Moderate Risk', bmi: 26.0, height: 151.0, comorbidities: 'Twin Gestation (Twins A & B delivered)', prev_cs: true },
        { num: 59, facIdx: 4, first_name: 'Gemma', middle_name: 'Gonzales', last_name: 'Alcantara', age: 27, civil_status: 'Married', blood_type: 'A+', phone: '09255050009', address: 'Zone 1, Himaao, Pili, Camarines Sur', hasUser: true, email: 'gemma.alcantara@gmail.com', gravida: 2, parity: 1, lmp: '2026-05-22', edd: '2027-02-26', status: 'Active', risk: 'Low Risk', bmi: 22.1, height: 156.0, comorbidities: null, prev_cs: false },
        { num: 60, facIdx: 4, first_name: 'Amalia', middle_name: 'Perez', last_name: 'Ilagan', age: 23, civil_status: 'Single', blood_type: 'O+', phone: '09255050010', address: 'Zone 2, Himaao, Pili, Camarines Sur', hasUser: false, email: null, gravida: 1, parity: 0, lmp: '2026-06-28', edd: '2027-04-04', status: 'Active', risk: 'Low Risk', bmi: 20.7, height: 154.0, comorbidities: null, prev_cs: false },
        { num: 61, facIdx: 4, first_name: 'Marilyn', middle_name: 'Alvarez', last_name: 'Morales', age: 32, civil_status: 'Married', blood_type: 'O+', phone: '09255050011', address: 'Zone 3, Himaao, Pili, Camarines Sur', hasUser: false, email: null, gravida: 2, parity: 1, lmp: '2026-04-28', edd: '2027-02-02', status: 'Active', risk: 'High Risk', bmi: 30.5, height: 150.0, comorbidities: 'Severe Gestational Hypertension (BP 155/100), Blurred Vision Episodes', prev_cs: false },
        { num: 62, facIdx: 4, first_name: 'Eunice', middle_name: 'Flores', last_name: 'Cruz', age: 25, civil_status: 'Married', blood_type: 'B+', phone: '09255050012', address: 'Zone 4, Himaao, Pili, Camarines Sur', hasUser: true, email: 'eunice.cruz@gmail.com', gravida: 1, parity: 0, lmp: '2026-07-02', edd: '2027-04-08', status: 'Active', risk: 'Low Risk', bmi: 21.3, height: 157.0, comorbidities: null, prev_cs: false }
    ];

    const EHR_FILES = [
        { url: '/uploads/doc3.png', format: 'PNG', size: '253 KB', title: 'Obstetric Ultrasound Report' },
        { url: '/uploads/doc3.webp', format: 'WEBP', size: '76 KB', title: 'Maternal Health Booklet Scan' },
        { url: '/uploads/doc4.png', format: 'PNG', size: '40 KB', title: 'Clinical Laboratory Summary' },
        { url: '/uploads/lab1.jpg', format: 'JPG', size: '34 KB', title: 'CBC and Blood Typing Result' },
        { url: '/uploads/lab2.png', format: 'PNG', size: '66 KB', title: '75g OGTT Diabetes Evaluation' }
    ];

    const users = [];
    const mothers = [];
    const enrollments = [];
    const pregnancies = [];
    const prenatalVisits = [];
    const supplementationRecords = [];
    const labScreenings = [];
    const cdssAlerts = [];
    const onlineReferrals = [];
    const deliveryOutcomes = [];
    const newbornRecords = [];
    const postpartumVisits = [];
    const appointments = [];
    const facilityDocuments = [];

    const slotTimes = ['08:30', '09:15', '10:00', '10:45', '11:30', '13:30', '14:15', '15:00'];
    const facilityAppointmentDayCounter = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };

    let visitGlobalIdx = 1;
    let suppGlobalIdx = 1;
    let labGlobalIdx = 1;
    let cdssGlobalIdx = 1;
    let refGlobalIdx = 1;
    let delivGlobalIdx = 1;
    let nbGlobalIdx = 1;
    let pvGlobalIdx = 1;
    let apptGlobalIdx = 1;
    let docGlobalIdx = 1;

    motherProfiles.forEach((prof) => {
        const motherId = `d0000000-0000-4000-8000-${String(prof.num).padStart(12, '0')}`;
        const facility = facilities[prof.facIdx];
        const assignedStaff = staffMembers.find(s => s.facility_id === facility.facility_id && (s.role === 'Midwife' || s.role === 'Nurse'));
        const physicianStaff = staffMembers.find(s => s.facility_id === facility.facility_id && s.role === 'Doctor') || staffMembers[0];

        let userId = null;
        if (prof.hasUser && prof.email) {
            userId = `c0000000-0000-4000-8000-${String(prof.num).padStart(12, '0')}`;
            users.push({
                user_id: userId,
                facility_id: facility.facility_id,
                first_name: prof.first_name,
                middle_name: prof.middle_name,
                last_name: prof.last_name,
                role: 'Mother',
                phone_number: prof.phone,
                email: prof.email,
                address: prof.address,
                password: standardMotherPasswordHash,
                is_active: true
            });
        }

        const birthYear = 2026 - prof.age;
        const birthDate = `${birthYear}-0${(prof.num % 9) + 1}-15T00:00:00.000Z`;

        mothers.push({
            mother_id: motherId,
            user_id: userId,
            assigned_worker_id: assignedStaff ? assignedStaff.user_id : null,
            created_by_id: assignedStaff ? assignedStaff.user_id : null,
            family_serial_no: `PILI-2026-${String(prof.num).padStart(4, '0')}`,
            birth_date: birthDate,
            age: prof.age,
            civil_status: prof.civil_status,
            blood_type: prof.blood_type,
            sync_status: 'synced',
            version: 1
        });

        enrollments.push({
            enrollment_id: `e0000000-0000-4000-8000-${String(prof.num).padStart(12, '0')}`,
            mother_id: motherId,
            facility_id: facility.facility_id,
            status: 'Active',
            notes: `Enrolled for primary maternal healthcare at ${facility.facility_name}.`
        });

        const pregnancyId = `f0000000-0000-4000-8000-${String(prof.num).padStart(12, '0')}`;
        pregnancies.push({
            pregnancy_id: pregnancyId,
            mother_id: motherId,
            date_of_registration: `${prof.lmp}T08:00:00.000Z`,
            lmp_date: `${prof.lmp}T00:00:00.000Z`,
            edd_date: `${prof.edd}T00:00:00.000Z`,
            gravida: prof.gravida,
            parity: prof.parity,
            previous_delivery_history: prof.prev_cs ? 'Previous Caesarean Section Delivery' : (prof.parity > 0 ? 'Normal Spontaneous Vaginal Delivery' : 'Primigravida'),
            co_morbidities: prof.comorbidities,
            age_group: prof.age < 19 ? 'Adolescent (<19)' : (prof.age >= 35 ? 'Advanced (>=35)' : 'Adult (19-34)'),
            height_cm: prof.height,
            bmi_1st_trimester: prof.bmi,
            bmi_category: prof.bmi < 18.5 ? 'Underweight' : (prof.bmi < 25.0 ? 'Normal' : (prof.bmi < 30.0 ? 'Overweight' : 'Obese')),
            pregnancy_status: prof.status === 'Delivered' ? 'Delivered' : (prof.risk === 'High Risk' ? 'High Risk' : 'Active'),
            prev_caesarean: prof.prev_cs,
            has_diabetes: prof.comorbidities && prof.comorbidities.includes('Gestational Diabetes') ? true : false,
            has_heart_disease: false,
            has_asthma: prof.comorbidities && prof.comorbidities.includes('Asthma') ? true : false,
            has_goiter: prof.comorbidities && prof.comorbidities.includes('Goiter') ? true : false,
            has_tb: false,
            completed_8anc: prof.status === 'Delivered' ? true : false,
            deworming_given: true,
            deworming_date: `${prof.lmp}T08:00:00.000Z`
        });

        const visitCount = prof.status === 'Delivered' ? 6 : (prof.risk === 'High Risk' ? 5 : (prof.num % 3 === 0 ? 4 : 3));
        const lmpTime = new Date(prof.lmp).getTime();

        for (let v = 1; v <= visitCount; v++) {
            const visitId = `10000000-0000-4000-8000-${String(visitGlobalIdx++).padStart(12, '0')}`;
            const weeksOffset = v === 1 ? 8 : (v === 2 ? 14 : (v === 3 ? 20 : (v === 4 ? 26 : (v === 5 ? 32 : 36))));
            const visitDate = new Date(lmpTime + (weeksOffset * 7 * 24 * 3600 * 1000));
            const visitDateIso = visitDate.toISOString();

            let sys = 110 + (prof.num % 8);
            let dia = 70 + (prof.num % 6);
            let hr = 74 + (prof.num % 10);
            let temp = 36.5 + ((prof.num % 4) * 0.1);
            let dangerSigns = null;
            let hasBleeding = false;
            let hasEdema = false;
            let hasFever = false;
            let hasPallor = false;
            let riskAssessed = 'Low Risk';

            if (prof.risk === 'High Risk') {
                if (prof.comorbidities && prof.comorbidities.includes('Preeclampsia')) {
                    sys = 150 + (v * 3);
                    dia = 96 + (v * 2);
                    hasEdema = true;
                    dangerSigns = 'Severe persistent frontal headache and bilateral facial/hand edema';
                    riskAssessed = 'High Risk';
                } else if (prof.comorbidities && prof.comorbidities.includes('Bleeding')) {
                    hasBleeding = true;
                    dangerSigns = 'Vaginal spotting with lower pelvic heaviness';
                    riskAssessed = 'High Risk';
                } else if (prof.comorbidities && prof.comorbidities.includes('Tachycardia')) {
                    hr = 112;
                    dangerSigns = 'Maternal palpitations and fetal heart tone elevation (172 bpm)';
                    riskAssessed = 'High Risk';
                } else if (prof.comorbidities && prof.comorbidities.includes('Anemia')) {
                    hasPallor = true;
                    dangerSigns = 'Severe conjunctival and palmar pallor with easy fatigability';
                    riskAssessed = 'High Risk';
                } else {
                    sys = 144;
                    dia = 92;
                    riskAssessed = 'High Risk';
                }
            } else if (prof.risk === 'Moderate Risk') {
                riskAssessed = 'Moderate Risk';
                if (v >= 3) {
                    hasEdema = true;
                    dangerSigns = 'Mild pedal edema in late afternoon, relieved by elevation';
                }
            }

            const fundic = weeksOffset >= 14 ? weeksOffset : null;
            const fht = weeksOffset >= 14 ? (prof.risk === 'High Risk' && prof.comorbidities?.includes('Tachycardia') ? 172 : 138 + (v % 8)) : null;

            prenatalVisits.push({
                visit_id: visitId,
                pregnancy_id: pregnancyId,
                health_worker_id: (prof.risk === 'High Risk' && v >= 3 ? physicianStaff.user_id : assignedStaff.user_id),
                visit_date: visitDateIso,
                trimester: weeksOffset < 14 ? 1 : (weeksOffset < 28 ? 2 : 3),
                visit_number: v,
                age_of_gestation_weeks: weeksOffset,
                weight_kg: (prof.height * prof.height * prof.bmi / 10000) + (v * 1.5),
                temperature_celsius: temp,
                pulse_rate_bpm: hr,
                bp_diastolic: dia,
                bp_systolic: sys,
                fundic_height_cm: fundic,
                fetal_heart_tone_bpm: fht,
                fetal_presentation: weeksOffset >= 28 ? 'Cephalic' : 'Breech',
                chief_complaint: v === 1 ? 'Initial prenatal registration and baseline health check' : 'Routine antenatal monitoring',
                danger_signs_observed: dangerSigns,
                risk_level_assessed: riskAssessed,
                has_vaginal_bleeding: hasBleeding,
                has_pallor: hasPallor,
                has_edema: hasEdema,
                has_fever: hasFever,
                sync_status: 'synced',
                version: 1
            });

            supplementationRecords.push({
                supplement_id: `20000000-0000-4000-8000-${String(suppGlobalIdx++).padStart(12, '0')}`,
                pregnancy_id: pregnancyId,
                visit_id: visitId,
                supplement_type: v % 2 === 1 ? 'Iron + Folic Acid (60mg/400mcg)' : 'Calcium Carbonate (500mg)',
                tablets_given_count: 30,
                date_given: visitDateIso,
                is_completed: true,
                sync_status: 'synced',
                version: 1
            });

            if (v === 1 || v === 3) {
                const ehrFile = EHR_FILES[(prof.num + v) % EHR_FILES.length];
                const screeningType = v === 1 ? 'Complete Blood Count (CBC) & Blood Typing' : (prof.comorbidities?.includes('Diabetes') ? '75g Oral Glucose Tolerance Test (OGTT)' : 'Obstetric Ultrasound Scan');
                const resultText = v === 1
                    ? `Hemoglobin: ${prof.risk === 'High Risk' && prof.comorbidities?.includes('Anemia') ? '8.4 g/dL (Severe Anemia)' : '12.2 g/dL (Normal)'}, Blood Type: ${prof.blood_type}`
                    : (prof.comorbidities?.includes('Diabetes') ? 'Fasting: 104 mg/dL (High), 1-hr: 188 mg/dL, 2-hr: 162 mg/dL. Diagnosis: GDM.' : 'Single live intrauterine pregnancy in cephalic presentation. Adequate amniotic fluid.');

                labScreenings.push({
                    screening_id: `30000000-0000-4000-8000-${String(labGlobalIdx++).padStart(12, '0')}`,
                    pregnancy_id: pregnancyId,
                    visit_id: visitId,
                    screening_type: screeningType,
                    result: resultText,
                    file_url: ehrFile.url,
                    date_of_screening: visitDateIso,
                    remarks: prof.risk === 'High Risk' ? 'Abnormal findings flagged for clinical escalation' : 'Normal parameters for gestational age',
                    sync_status: 'synced',
                    version: 1
                });
            }

            if (prof.risk === 'High Risk' && v >= 2) {
                cdssAlerts.push({
                    alert_id: `40000000-0000-4000-8000-${String(cdssGlobalIdx++).padStart(12, '0')}`,
                    pregnancy_id: pregnancyId,
                    visit_id: visitId,
                    alert_type: prof.comorbidities?.includes('Preeclampsia') ? 'Critical Hypertensive Surge' : 'Obstetric High Risk Warning',
                    alert_message: `CDSS Alert: ${dangerSigns || 'Critical vital sign elevation requiring physician review'}`,
                    severity: 'high',
                    is_resolved: false,
                    sync_status: 'synced',
                    version: 1
                });
            } else if (prof.risk === 'Moderate Risk' && v === 1) {
                cdssAlerts.push({
                    alert_id: `40000000-0000-4000-8000-${String(cdssGlobalIdx++).padStart(12, '0')}`,
                    pregnancy_id: pregnancyId,
                    visit_id: visitId,
                    alert_type: 'Demographic & Obstetric Risk Alert',
                    alert_message: `CDSS Alert: ${prof.comorbidities}`,
                    severity: 'moderate',
                    is_resolved: true,
                    resolved_by: assignedStaff.user_id,
                    resolved_at: visitDateIso,
                    sync_status: 'synced',
                    version: 1
                });
            }
        }

        if (prof.risk === 'High Risk') {
            const highRiskVisit = prenatalVisits[prenatalVisits.length - 1];
            onlineReferrals.push({
                referral_id: `50000000-0000-4000-8000-${String(refGlobalIdx++).padStart(12, '0')}`,
                pregnancy_id: pregnancyId,
                from_facility_id: facility.facility_id,
                to_facility_id: prof.facIdx > 1 ? facilities[0].facility_id : null,
                external_facility_name: prof.facIdx <= 1 ? 'Bicol Medical Center (BMC Naga City)' : null,
                reason: `Urgent Maternal-Fetal Referral: ${prof.comorbidities}`,
                date_referred: highRiskVisit.visit_date,
                secure_link: `https://silang.ph/referral/${pregnancyId}`,
                shared_pin: String(1000 + (prof.num * 17) % 9000),
                is_completed: false,
                status: 'pending',
                sync_status: 'synced',
                version: 1
            });
        }

        if (prof.status === 'Delivered') {
            const delivId = `60000000-0000-4000-8000-${String(delivGlobalIdx++).padStart(12, '0')}`;
            const delivDate = `${prof.deliveryDate}T06:30:00.000Z`;

            deliveryOutcomes.push({
                delivery_id: delivId,
                pregnancy_id: pregnancyId,
                delivery_date: delivDate,
                place_of_delivery: prof.prev_cs ? 'Bicol Medical Center (BMC Naga City)' : `${facility.facility_name} Birthing Room`,
                mode_of_delivery: prof.prev_cs ? 'Repeat Caesarean Section' : 'Normal Spontaneous Vaginal Delivery',
                birth_attendant: prof.prev_cs ? 'Dr. Aris Ramos, MD' : assignedStaff.first_name + ' ' + assignedStaff.last_name + ' (RMW)',
                maternal_outcome: 'Alive',
                immediate_breastfeeding: true,
                duration_of_labor_hours: prof.prev_cs ? 2.5 : 6.0,
                blood_loss_ml: prof.prev_cs ? 450 : 250,
                delivery_complications: prof.prev_cs ? 'None (Scheduled Elective CS)' : 'None (Uncomplicated)',
                sync_status: 'synced',
                version: 1
            });

            const isTwin = prof.num === 58;
            newbornRecords.push({
                newborn_id: `70000000-0000-4000-8000-${String(nbGlobalIdx++).padStart(12, '0')}`,
                delivery_id: delivId,
                sex: prof.num % 2 === 0 ? 'Male' : 'Female',
                birth_weight_kg: isTwin ? 2.3 : 3.1,
                status_at_birth: 'Alive and Vigorous',
                apgar_score: 9,
                sync_status: 'synced',
                version: 1
            });

            if (isTwin) {
                newbornRecords.push({
                    newborn_id: `70000000-0000-4000-8000-${String(nbGlobalIdx++).padStart(12, '0')}`,
                    delivery_id: delivId,
                    sex: 'Female',
                    birth_weight_kg: 2.4,
                    status_at_birth: 'Alive and Vigorous',
                    apgar_score: 9,
                    sync_status: 'synced',
                    version: 1
                });
            }

            postpartumVisits.push({
                postpartum_visit_id: `80000000-0000-4000-8000-${String(pvGlobalIdx++).padStart(12, '0')}`,
                delivery_id: delivId,
                visit_timing: '1-Week Postpartum Visit',
                visit_date: `${prof.deliveryDate}T10:00:00.000Z`,
                visit_number: 1,
                weight_kg: (prof.height * prof.height * prof.bmi / 10000) + 4.0,
                temperature_celsius: 36.6,
                pulse_rate_bpm: 76,
                bp_diastolic: 72,
                bp_systolic: 114,
                fundic_height_cm: 12.0,
                chief_complaint: 'Routine 1-week postpartum checkup and newborn cord evaluation',
                danger_signs_observed: null,
                risk_level_assessed: 'Low Risk',
                foul_smelling_discharge: false,
                cord_condition_normal: true,
                vitamin_a_given: true,
                iron_supplement_given: true,
                fp_method_accepted: prof.num % 3 === 0 ? 'DMPA Injectable' : (prof.num % 3 === 1 ? 'Progestin-Only Pill (Microlut)' : 'Subdermal Implant (Implanon)'),
                fp_quantity_given: 1,
                sync_status: 'synced',
                version: 1
            });
        }

        const apptCount = prof.status === 'Delivered' ? 1 : 2;
        for (let a = 1; a <= apptCount; a++) {
            const facCounter = facilityAppointmentDayCounter[prof.facIdx]++;
            const dayOffset = Math.floor(facCounter / slotTimes.length);
            const slotIdx = facCounter % slotTimes.length;
            const slotTime = slotTimes[slotIdx];

            const baseApptDate = new Date(2026, 10, 24 + dayOffset);
            if (baseApptDate.getDay() === 0) baseApptDate.setDate(baseApptDate.getDate() + 1);
            if (baseApptDate.getDay() === 6) baseApptDate.setDate(baseApptDate.getDate() + 2);

            const apptDateStr = baseApptDate.toISOString().split('T')[0];
            const apptId = `90000000-0000-4000-8000-${String(apptGlobalIdx++).padStart(12, '0')}`;

            appointments.push({
                appointment_id: apptId,
                user_id: userId || assignedStaff.user_id,
                facility_id: facility.facility_id,
                appointment_date: `${apptDateStr}T${slotTime}:00.000Z`,
                appointment_time: slotTime,
                appointment_type: prof.status === 'Delivered' ? 'Postpartum Follow-up' : (prof.risk === 'High Risk' ? 'High Risk Consultation' : 'Routine Prenatal Visit'),
                reason: prof.status === 'Delivered' ? 'Postpartum family planning and pediatric newborn assessment' : (prof.risk === 'High Risk' ? 'Physician blood pressure and preeclampsia re-evaluation' : 'Regular 4-week antenatal checkup'),
                status: 'scheduled',
                sync_status: 'synced',
                version: 1
            });
        }

        const docIndex = prof.num % EHR_FILES.length;
        const ehrDoc = EHR_FILES[docIndex];
        facilityDocuments.push({
            document_id: `a0000001-0000-4000-8000-${String(docGlobalIdx++).padStart(12, '0')}`,
            facility_id: facility.facility_id,
            mother_id: motherId,
            title: `${ehrDoc.title} - ${prof.first_name} ${prof.last_name}`,
            category: 'Prenatal Records',
            patient_name: `${prof.first_name} ${prof.last_name}`,
            security_level: 'Confidential',
            format: ehrDoc.format,
            size: ehrDoc.size,
            file_url: ehrDoc.url,
            uploaded_by: `${assignedStaff.first_name} ${assignedStaff.last_name} (${assignedStaff.role})`,
            sync_status: 'synced',
            version: 1
        });
    });

    facilities.forEach((fac, idx) => {
        const doc = EHR_FILES[idx % EHR_FILES.length];
        facilityDocuments.push({
            document_id: `a0000001-0000-4000-8000-${String(docGlobalIdx++).padStart(12, '0')}`,
            facility_id: fac.facility_id,
            mother_id: null,
            title: `BEmONC Clinical Protocols & Emergency Care Guidelines - ${fac.facility_name}`,
            category: 'Clinical Protocols',
            patient_name: 'Facility General',
            security_level: 'Internal',
            format: doc.format,
            size: doc.size,
            file_url: doc.url,
            uploaded_by: 'Pili Municipal Health Office',
            sync_status: 'synced',
            version: 1
        });
    });

    const dataset = {
        metadata: {
            title: 'Pili Municipal Health Office (Camarines Sur) - Realistic Maternal Dataset',
            generated_at: '2026-11-22T14:30:00.000Z',
            facilities_count: facilities.length,
            staff_count: staffMembers.length,
            mothers_count: mothers.length,
            pregnancies_count: pregnancies.length,
            prenatal_visits_count: prenatalVisits.length,
            supplements_count: supplementationRecords.length,
            labs_count: labScreenings.length,
            alerts_count: cdssAlerts.length,
            referrals_count: onlineReferrals.length,
            deliveries_count: deliveryOutcomes.length,
            newborns_count: newbornRecords.length,
            postpartum_visits_count: postpartumVisits.length,
            appointments_count: appointments.length,
            facility_documents_count: facilityDocuments.length
        },
        facilities,
        staffMembers,
        staffSchedules,
        users,
        mothers,
        enrollments,
        pregnancies,
        prenatalVisits,
        supplementationRecords,
        labScreenings,
        cdssAlerts,
        onlineReferrals,
        deliveryOutcomes,
        newbornRecords,
        postpartumVisits,
        appointments,
        facilityDocuments
    };

    const outJsonPath = path.join(__dirname, '../data/seed-realistic-data.json');
    fs.writeFileSync(outJsonPath, JSON.stringify(dataset, null, 2), 'utf-8');
    console.log(`Generated JSON dataset: ${outJsonPath} (${(fs.statSync(outJsonPath).size / 1024).toFixed(1)} KB)`);

    const markdownDoc = `# 📖 Pili Municipal Health System (Camarines Sur) - Clinical Dataset Specification

## 1. Overview & Location Hierarchy
This dataset represents a clinically authentic, chronological maternal health cohort for the capital municipality of **Pili, Camarines Sur** (Bicol Region / Region V).

* **Municipality**: Pili, Camarines Sur
* **Facilities**: 5 Public Health Facilities (2 Rural Health Units, 3 Barangay Health Stations)
* **Healthcare Staff**: 17 Multidisciplinary Healthcare Providers (MHO Physicians, Public Health Nurses, Midwives, Administrators)
* **Maternal Patients**: 62 Realistically Profiled Filipino Mothers residing across Pili barangays (San Vicente, Cadlan, Palestina, Anayan, Himaao, Curry, San Agustin, San Jose, Pawili, Sagurong, etc.)
* **Active Pregnancies & Deliveries**: 62 Total Records (51 Active Trimesters 1-3, 11 Completed Deliveries with Newborns)
* **Prenatal Consultations**: ${prenatalVisits.length} Chronological Visits with Vitals
* **Clinical Decision Support (CDSS) Alerts**: ${cdssAlerts.length} Automated Alerts
* **Inter-Clinic Referrals**: ${onlineReferrals.length} Transfers to Pili RHU I or Bicol Medical Center (BMC Naga City)
* **Scheduled Appointments**: ${appointments.length} Conflict-Free Calendar Bookings

---

## 2. Facilities Roster (Pili, Camarines Sur)
| Facility Name | Facility Type | Address | Contact | Assigned Staff |
| :--- | :--- | :--- | :--- | :--- |
| **Pili Rural Health Unit I** | RHU / Health Center | National Highway, San Vicente, Pili | 0917-824-1101 | Dr. Aris Ramos (MD), Elena Soriano (RN), Lita Macaraig (RMW), Joseph Mendoza (Admin) |
| **Pili Rural Health Unit II** | RHU / Health Center | Capitol Complex Area, Cadlan, Pili | 0917-824-1102 | Dr. Carmela Dalisay (MD), Paolo Cruz (RN), Gina Morales (RMW), Rachel Tolentino (Admin) |
| **BHS Palestina** | BHS | Zone 2, Palestina, Pili | 0918-931-2201 | Teresa Alcantara (RMW), Remedios Pangan (RN), Danilo Ilagan (Admin) |
| **BHS Anayan** | BHS | Purok 1, Anayan, Pili | 0918-931-2202 | Jocelyn Bautista (RMW), Corazon Mercado (RN), Grace De Guzman (Admin) |
| **BHS Himaao** | BHS | Barangay Road, Himaao, Pili | 0918-931-2203 | Marites Villanueva (RMW), Anita Santos (RN), Manuel Castillo (Admin) |

---

## 3. Standard Test Credentials
* **SuperAdmin**: \`superadmin@silang.ph\` (Existing Municipal SuperAdmin)
* **All Healthcare Staff**: \`PiliHealth2026!\`
* **All Patient Mobile App Accounts**: \`Password123!\` (27 mobile app accounts provisioned)

---

## 4. Clinical Referral Destinations
* Primary Care Escalations: **Pili Rural Health Unit I (San Vicente Main Center)**
* Secondary/Tertiary Referral Hospital: **Bicol Medical Center (BMC), Naga City**
`;

    const outMdPath = path.join(__dirname, '../data/DATASET_SPECIFICATION.md');
    fs.writeFileSync(outMdPath, markdownDoc, 'utf-8');
    console.log(`Generated Markdown specification: ${outMdPath}`);
}

generateCompleteDataset().catch(console.error);
