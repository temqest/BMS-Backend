const prisma = require('../util/db');
const bcrypt = require('bcryptjs');
const { calculateTewsScore } = require('../services/cdssRiskServices');

const MOTHERS_DATA = [
  {
    firstName: "Maria Clara",
    lastName: "Santos",
    age: 24,
    civilStatus: "Married",
    bloodType: "O+",
    address: "Barangay Biluso, Silang, Cavite",
    phone: "09880000001",
    email: "cdss.mother01@silang.ph",
    gravida: 1,
    parity: 0,
    aogWeeks: 16,
    trimester: 2,
    visitNumber: 2,
    weightKg: 52.0,
    heightCm: 154,
    bpSystolic: 110,
    bpDiastolic: 70,
    pulseRate: 76,
    tempC: 36.6,
    fundicHeight: 16.0,
    fht: 148,
    presentation: "Cephalic",
    complaint: "Routine prenatal checkup, no acute discomfort",
    history: {}
  },
  {
    firstName: "Joy",
    lastName: "Alcantara",
    age: 27,
    civilStatus: "Married",
    bloodType: "A+",
    address: "Barangay Tubuan, Silang, Cavite",
    phone: "09880000002",
    email: "cdss.mother02@silang.ph",
    gravida: 2,
    parity: 1,
    aogWeeks: 24,
    trimester: 2,
    visitNumber: 3,
    weightKg: 56.5,
    heightCm: 156,
    bpSystolic: 115,
    bpDiastolic: 75,
    pulseRate: 78,
    tempC: 36.5,
    fundicHeight: 24.0,
    fht: 142,
    presentation: "Cephalic",
    complaint: "Active fetal movement felt daily",
    history: {}
  },
  {
    firstName: "Patricia",
    lastName: "Dalisay",
    age: 28,
    civilStatus: "Married",
    bloodType: "B+",
    address: "Barangay Lalaan I, Silang, Cavite",
    phone: "09880000003",
    email: "cdss.mother03@silang.ph",
    gravida: 2,
    parity: 1,
    aogWeeks: 32,
    trimester: 3,
    visitNumber: 5,
    weightKg: 62.0,
    heightCm: 152,
    bpSystolic: 118,
    bpDiastolic: 78,
    pulseRate: 82,
    tempC: 36.7,
    fundicHeight: 32.0,
    fht: 138,
    presentation: "Cephalic",
    complaint: "Mild backache relieved by rest",
    history: {}
  },
  {
    firstName: "Cristina",
    lastName: "Mercado",
    age: 25,
    civilStatus: "Single",
    bloodType: "O+",
    address: "Barangay Lucsuhin, Silang, Cavite",
    phone: "09880000004",
    email: "cdss.mother04@silang.ph",
    gravida: 1,
    parity: 0,
    aogWeeks: 36,
    trimester: 3,
    visitNumber: 6,
    weightKg: 64.5,
    heightCm: 158,
    bpSystolic: 120,
    bpDiastolic: 80,
    pulseRate: 80,
    tempC: 36.8,
    fundicHeight: 35.0,
    fht: 140,
    presentation: "Cephalic",
    complaint: "Routine 3rd trimester pelvic check",
    history: {}
  },
  {
    firstName: "Angela",
    lastName: "Bautista",
    age: 23,
    civilStatus: "Married",
    bloodType: "A+",
    address: "Barangay Tartaria, Silang, Cavite",
    phone: "09880000005",
    email: "cdss.mother05@silang.ph",
    gravida: 1,
    parity: 0,
    aogWeeks: 10,
    trimester: 1,
    visitNumber: 1,
    weightKg: 49.5,
    heightCm: 150,
    bpSystolic: 105,
    bpDiastolic: 65,
    pulseRate: 74,
    tempC: 36.6,
    fundicHeight: null,
    fht: 152,
    presentation: null,
    complaint: "Mild morning nausea, tolerating oral fluids",
    history: {}
  },
  {
    firstName: "Camille",
    lastName: "Villanueva",
    age: 31,
    civilStatus: "Married",
    bloodType: "O+",
    address: "Barangay Biga I, Silang, Cavite",
    phone: "09880000006",
    email: "cdss.mother06@silang.ph",
    gravida: 3,
    parity: 2,
    aogWeeks: 28,
    trimester: 3,
    visitNumber: 4,
    weightKg: 60.0,
    heightCm: 155,
    bpSystolic: 112,
    bpDiastolic: 72,
    pulseRate: 80,
    tempC: 36.6,
    fundicHeight: 28.0,
    fht: 144,
    presentation: "Cephalic",
    complaint: "Routine 28-week prenatal assessment",
    history: {}
  },
  {
    firstName: "Dianne",
    lastName: "Ramos",
    age: 26,
    civilStatus: "Cohabiting",
    bloodType: "AB+",
    address: "Barangay Pasong Langka, Silang, Cavite",
    phone: "09880000007",
    email: "cdss.mother07@silang.ph",
    gravida: 1,
    parity: 0,
    aogWeeks: 20,
    trimester: 2,
    visitNumber: 2,
    weightKg: 54.0,
    heightCm: 153,
    bpSystolic: 114,
    bpDiastolic: 74,
    pulseRate: 84,
    tempC: 36.7,
    fundicHeight: 20.0,
    fht: 146,
    presentation: "Cephalic",
    complaint: "Noticed fetal movements, feeling healthy",
    history: {}
  },
  {
    firstName: "Rochelle",
    lastName: "Morales",
    age: 29,
    civilStatus: "Married",
    bloodType: "B+",
    address: "Barangay Sabutan, Silang, Cavite",
    phone: "09880000008",
    email: "cdss.mother08@silang.ph",
    gravida: 2,
    parity: 1,
    aogWeeks: 26,
    trimester: 2,
    visitNumber: 3,
    weightKg: 58.5,
    heightCm: 157,
    bpSystolic: 122,
    bpDiastolic: 76,
    pulseRate: 82,
    tempC: 36.5,
    fundicHeight: 26.0,
    fht: 140,
    presentation: "Cephalic",
    complaint: "Normal appetite and sleep pattern",
    history: {}
  },
  {
    firstName: "Katrina",
    lastName: "Pangan",
    age: 24,
    civilStatus: "Married",
    bloodType: "A+",
    address: "Barangay Kaong, Silang, Cavite",
    phone: "09880000009",
    email: "cdss.mother09@silang.ph",
    gravida: 2,
    parity: 1,
    aogWeeks: 34,
    trimester: 3,
    visitNumber: 5,
    weightKg: 63.0,
    heightCm: 154,
    bpSystolic: 116,
    bpDiastolic: 74,
    pulseRate: 86,
    tempC: 36.7,
    fundicHeight: 34.0,
    fht: 136,
    presentation: "Cephalic",
    complaint: "Reviewing delivery preparedness plan",
    history: {}
  },
  {
    firstName: "Joanna",
    lastName: "Castaneda",
    age: 27,
    civilStatus: "Married",
    bloodType: "O+",
    address: "Barangay Malabag, Silang, Cavite",
    phone: "09880000010",
    email: "cdss.mother10@silang.ph",
    gravida: 1,
    parity: 0,
    aogWeeks: 30,
    trimester: 3,
    visitNumber: 4,
    weightKg: 61.2,
    heightCm: 155,
    bpSystolic: 118,
    bpDiastolic: 75,
    pulseRate: 84,
    tempC: 36.6,
    fundicHeight: 30.0,
    fht: 142,
    presentation: "Cephalic",
    complaint: "Routine antenatal consultation",
    history: {}
  },
  {
    firstName: "Bea Kimberly",
    lastName: "Reyes",
    age: 17,
    civilStatus: "Single",
    bloodType: "O+",
    address: "Barangay Biluso, Silang, Cavite",
    phone: "09880000011",
    email: "cdss.mother11@silang.ph",
    gravida: 1,
    parity: 0,
    aogWeeks: 20,
    trimester: 2,
    visitNumber: 2,
    weightKg: 46.5,
    heightCm: 148,
    bpSystolic: 142,
    bpDiastolic: 86,
    pulseRate: 102,
    tempC: 36.6,
    fundicHeight: 20.0,
    fht: 148,
    presentation: "Cephalic",
    complaint: "Mild fatigue, adolescent pregnancy surveillance",
    history: {}
  },
  {
    firstName: "Teresa",
    lastName: "Macaraig",
    age: 38,
    civilStatus: "Married",
    bloodType: "B+",
    address: "Barangay Tubuan, Silang, Cavite",
    phone: "09880000012",
    email: "cdss.mother12@silang.ph",
    gravida: 3,
    parity: 2,
    aogWeeks: 32,
    trimester: 3,
    visitNumber: 5,
    weightKg: 67.0,
    heightCm: 153,
    bpSystolic: 144,
    bpDiastolic: 92,
    pulseRate: 88,
    tempC: 36.7,
    fundicHeight: 32.0,
    fht: 140,
    presentation: "Cephalic",
    complaint: "Advanced maternal age, borderline elevated blood pressure",
    history: {}
  },
  {
    firstName: "Melanie",
    lastName: "Soriano",
    age: 28,
    civilStatus: "Married",
    bloodType: "A+",
    address: "Barangay Lalaan II, Silang, Cavite",
    phone: "09880000013",
    email: "cdss.mother13@silang.ph",
    gravida: 2,
    parity: 1,
    aogWeeks: 26,
    trimester: 2,
    visitNumber: 3,
    weightKg: 59.0,
    heightCm: 156,
    bpSystolic: 140,
    bpDiastolic: 84,
    pulseRate: 104,
    tempC: 37.8,
    fundicHeight: 26.0,
    fht: 146,
    presentation: "Cephalic",
    complaint: "Mild dysuria and subfebrile warmth",
    history: { has_asthma: true }
  },
  {
    firstName: "Lorna",
    lastName: "Castillo",
    age: 29,
    civilStatus: "Married",
    bloodType: "O+",
    address: "Barangay Lucsuhin, Silang, Cavite",
    phone: "09880000014",
    email: "cdss.mother14@silang.ph",
    gravida: 2,
    parity: 1,
    aogWeeks: 30,
    trimester: 3,
    visitNumber: 4,
    weightKg: 68.0,
    heightCm: 154,
    bpSystolic: 136,
    bpDiastolic: 88,
    pulseRate: 88,
    tempC: 36.7,
    fundicHeight: 30.0,
    fht: 142,
    presentation: "Cephalic",
    complaint: "Bilateral lower extremity puffiness in the afternoon",
    history: {},
    hasEdema: true
  },
  {
    firstName: "Evelyn",
    lastName: "Navarro",
    age: 34,
    civilStatus: "Married",
    bloodType: "O+",
    address: "Barangay Tartaria, Silang, Cavite",
    phone: "09880000015",
    email: "cdss.mother15@silang.ph",
    gravida: 6,
    parity: 5,
    aogWeeks: 28,
    trimester: 3,
    visitNumber: 4,
    weightKg: 65.0,
    heightCm: 151,
    bpSystolic: 142,
    bpDiastolic: 88,
    pulseRate: 86,
    tempC: 36.8,
    fundicHeight: 28.0,
    fht: 142,
    presentation: "Cephalic",
    complaint: "Grand multipara with mild shortness of breath on exertion",
    history: { has_asthma: true }
  },
  {
    firstName: "Cynthia",
    lastName: "De Leon",
    age: 31,
    civilStatus: "Married",
    bloodType: "A+",
    address: "Barangay Biga II, Silang, Cavite",
    phone: "09880000016",
    email: "cdss.mother16@silang.ph",
    gravida: 3,
    parity: 1,
    aogWeeks: 24,
    trimester: 2,
    visitNumber: 3,
    weightKg: 61.5,
    heightCm: 155,
    bpSystolic: 140,
    bpDiastolic: 90,
    pulseRate: 86,
    tempC: 36.6,
    fundicHeight: 24.0,
    fht: 144,
    presentation: "Cephalic",
    complaint: "History of stillbirth in prior pregnancy, checking BP and fetal wellbeing",
    history: { stillbirth_history: true }
  },
  {
    firstName: "Kaye",
    lastName: "Roxas",
    age: 33,
    civilStatus: "Married",
    bloodType: "B+",
    address: "Barangay Pasong Langka, Silang, Cavite",
    phone: "09880000017",
    email: "cdss.mother17@silang.ph",
    gravida: 2,
    parity: 1,
    aogWeeks: 30,
    trimester: 3,
    visitNumber: 4,
    weightKg: 72.0,
    heightCm: 156,
    bpSystolic: 142,
    bpDiastolic: 86,
    pulseRate: 102,
    tempC: 36.7,
    fundicHeight: 31.0,
    fht: 140,
    presentation: "Cephalic",
    complaint: "Gestational diabetes monitoring, blood glucose tracking",
    history: { has_diabetes: true }
  },
  {
    firstName: "Ivy",
    lastName: "Manalo",
    age: 25,
    civilStatus: "Single",
    bloodType: "O+",
    address: "Barangay Sabutan, Silang, Cavite",
    phone: "09880000018",
    email: "cdss.mother18@silang.ph",
    gravida: 1,
    parity: 0,
    aogWeeks: 22,
    trimester: 2,
    visitNumber: 3,
    weightKg: 50.0,
    heightCm: 152,
    bpSystolic: 110,
    bpDiastolic: 70,
    pulseRate: 96,
    tempC: 36.6,
    fundicHeight: 22.0,
    fht: 146,
    presentation: "Cephalic",
    complaint: "Generalized weakness, pale conjunctiva and nail beds",
    history: {},
    hasPallor: true
  },
  {
    firstName: "Leilani",
    lastName: "Tolentino",
    age: 30,
    civilStatus: "Married",
    bloodType: "AB+",
    address: "Barangay Kaong, Silang, Cavite",
    phone: "09880000019",
    email: "cdss.mother19@silang.ph",
    gravida: 2,
    parity: 1,
    aogWeeks: 26,
    trimester: 2,
    visitNumber: 3,
    weightKg: 57.5,
    heightCm: 153,
    bpSystolic: 138,
    bpDiastolic: 86,
    pulseRate: 114,
    tempC: 37.1,
    fundicHeight: 26.0,
    fht: 148,
    presentation: "Cephalic",
    complaint: "Diffuse anterior neck swelling, occasional palpitations",
    history: { has_goiter: true }
  },
  {
    firstName: "Maritess",
    lastName: "Aguinaldo",
    age: 26,
    civilStatus: "Married",
    bloodType: "A+",
    address: "Barangay Malabag, Silang, Cavite",
    phone: "09880000020",
    email: "cdss.mother20@silang.ph",
    gravida: 1,
    parity: 0,
    aogWeeks: 34,
    trimester: 3,
    visitNumber: 5,
    weightKg: 66.0,
    heightCm: 155,
    bpSystolic: 138,
    bpDiastolic: 102,
    pulseRate: 90,
    tempC: 36.8,
    fundicHeight: 34.0,
    fht: 138,
    presentation: "Cephalic",
    complaint: "Elevated diastolic pressure noted during triage",
    history: {}
  },
  {
    firstName: "Carmina",
    lastName: "Legaspi",
    age: 32,
    civilStatus: "Married",
    bloodType: "O+",
    address: "Barangay Biluso, Silang, Cavite",
    phone: "09880000021",
    email: "cdss.mother21@silang.ph",
    gravida: 2,
    parity: 1,
    aogWeeks: 34,
    trimester: 3,
    visitNumber: 5,
    weightKg: 71.0,
    heightCm: 154,
    bpSystolic: 168,
    bpDiastolic: 112,
    pulseRate: 98,
    tempC: 36.8,
    fundicHeight: 34.0,
    fht: 144,
    presentation: "Cephalic",
    complaint: "Severe throbbing frontal headache and visual blurring",
    history: {},
    hasEdema: true,
    dangerSigns: "Severe headache, visual blurring, critical hypertensive spike"
  },
  {
    firstName: "Beverly",
    lastName: "Tan",
    age: 28,
    civilStatus: "Married",
    bloodType: "A+",
    address: "Barangay Tubuan, Silang, Cavite",
    phone: "09880000022",
    email: "cdss.mother22@silang.ph",
    gravida: 3,
    parity: 2,
    aogWeeks: 30,
    trimester: 3,
    visitNumber: 4,
    weightKg: 61.0,
    heightCm: 157,
    bpSystolic: 108,
    bpDiastolic: 68,
    pulseRate: 106,
    tempC: 36.7,
    fundicHeight: 30.0,
    fht: 140,
    presentation: "Cephalic",
    complaint: "Sudden fresh bright red vaginal bleeding with mild hypogastric cramps",
    history: {},
    hasBleeding: true,
    dangerSigns: "Active vaginal bleeding"
  },
  {
    firstName: "Regina",
    lastName: "Sarmiento",
    age: 26,
    civilStatus: "Single",
    bloodType: "B+",
    address: "Barangay Lalaan I, Silang, Cavite",
    phone: "09880000023",
    email: "cdss.mother23@silang.ph",
    gravida: 1,
    parity: 0,
    aogWeeks: 33,
    trimester: 3,
    visitNumber: 5,
    weightKg: 63.5,
    heightCm: 153,
    bpSystolic: 115,
    bpDiastolic: 75,
    pulseRate: 126,
    tempC: 38.6,
    fundicHeight: 33.0,
    fht: 174,
    presentation: "Cephalic",
    complaint: "High spiking fever with rigors, abdominal tenderness, fetal tachycardia",
    history: {},
    hasFever: true,
    dangerSigns: "High fever, maternal and fetal tachycardia"
  },
  {
    firstName: "Norma",
    lastName: "Salazar",
    age: 35,
    civilStatus: "Married",
    bloodType: "O+",
    address: "Barangay Lucsuhin, Silang, Cavite",
    phone: "09880000024",
    email: "cdss.mother24@silang.ph",
    gravida: 2,
    parity: 1,
    aogWeeks: 28,
    trimester: 3,
    visitNumber: 4,
    weightKg: 65.0,
    heightCm: 156,
    bpSystolic: 136,
    bpDiastolic: 88,
    pulseRate: 88,
    tempC: 36.7,
    fundicHeight: 28.0,
    fht: 142,
    presentation: "Cephalic",
    complaint: "Acute blood pressure velocity surge from first trimester baseline",
    history: { prev_caesarean: true },
    isVelocityCase: true
  },
  {
    firstName: "Tanya",
    lastName: "Dimaculangan",
    age: 36,
    civilStatus: "Married",
    bloodType: "O+",
    address: "Barangay Tartaria, Silang, Cavite",
    phone: "09880000025",
    email: "cdss.mother25@silang.ph",
    gravida: 3,
    parity: 1,
    aogWeeks: 36,
    trimester: 3,
    visitNumber: 6,
    weightKg: 69.0,
    heightCm: 152,
    bpSystolic: 148,
    bpDiastolic: 96,
    pulseRate: 106,
    tempC: 36.7,
    fundicHeight: 36.0,
    fht: 140,
    presentation: "Cephalic",
    complaint: "Sharp lower abdominal pain over previous transverse caesarean scar",
    history: { prev_caesarean: true }
  },
  {
    firstName: "Cherry",
    lastName: "Valenzuela",
    age: 27,
    civilStatus: "Single",
    bloodType: "A+",
    address: "Barangay Biga I, Silang, Cavite",
    phone: "09880000026",
    email: "cdss.mother26@silang.ph",
    gravida: 1,
    parity: 0,
    aogWeeks: 24,
    trimester: 2,
    visitNumber: 3,
    weightKg: 49.0,
    heightCm: 150,
    bpSystolic: 82,
    bpDiastolic: 48,
    pulseRate: 46,
    tempC: 36.2,
    fundicHeight: 24.0,
    fht: 138,
    presentation: "Cephalic",
    complaint: "Profound lightheadedness, syncopal episode, symptomatic hypotension and bradycardia",
    history: {},
    dangerSigns: "Severe hypotension, profound bradycardia, near-syncope"
  },
  {
    firstName: "Leonora",
    lastName: "Crisostomo",
    age: 32,
    civilStatus: "Married",
    bloodType: "B+",
    address: "Barangay Pasong Langka, Silang, Cavite",
    phone: "09880000027",
    email: "cdss.mother27@silang.ph",
    gravida: 2,
    parity: 1,
    aogWeeks: 28,
    trimester: 3,
    visitNumber: 4,
    weightKg: 64.0,
    heightCm: 155,
    bpSystolic: 152,
    bpDiastolic: 98,
    pulseRate: 122,
    tempC: 36.8,
    fundicHeight: 28.0,
    fht: 146,
    presentation: "Cephalic",
    complaint: "Known valvular heart disease presenting with orthopnea and marked tachycardia",
    history: { has_heart_disease: true },
    dangerSigns: "Cardiac decompensation, severe resting tachycardia"
  },
  {
    firstName: "Rosanna",
    lastName: "Ilagan",
    age: 34,
    civilStatus: "Married",
    bloodType: "O+",
    address: "Barangay Sabutan, Silang, Cavite",
    phone: "09880000028",
    email: "cdss.mother28@silang.ph",
    gravida: 4,
    parity: 3,
    aogWeeks: 32,
    trimester: 3,
    visitNumber: 5,
    weightKg: 58.0,
    heightCm: 154,
    bpSystolic: 98,
    bpDiastolic: 60,
    pulseRate: 114,
    tempC: 36.5,
    fundicHeight: 32.0,
    fht: 142,
    presentation: "Cephalic",
    complaint: "History of severe postpartum hemorrhage, recurrent pregnancy losses, marked pallor",
    history: { pph_history: true, consecutive_miscarriages: true },
    hasPallor: true
  },
  {
    firstName: "Amalia",
    lastName: "Macatangay",
    age: 18,
    civilStatus: "Single",
    bloodType: "A+",
    address: "Barangay Kaong, Silang, Cavite",
    phone: "09880000029",
    email: "cdss.mother29@silang.ph",
    gravida: 1,
    parity: 0,
    aogWeeks: 35,
    trimester: 3,
    visitNumber: 6,
    weightKg: 67.5,
    heightCm: 152,
    bpSystolic: 174,
    bpDiastolic: 114,
    pulseRate: 116,
    tempC: 37.4,
    fundicHeight: 35.0,
    fht: 148,
    presentation: "Cephalic",
    complaint: "Critical blood pressure elevation with epigastric right upper quadrant pain and scotoma",
    history: {},
    hasEdema: true,
    dangerSigns: "Imminent eclampsia, visual disturbances, severe hypertension"
  },
  {
    firstName: "Marilyn",
    lastName: "Estacio",
    age: 30,
    civilStatus: "Married",
    bloodType: "O+",
    address: "Barangay Malabag, Silang, Cavite",
    phone: "09880000030",
    email: "cdss.mother30@silang.ph",
    gravida: 2,
    parity: 1,
    aogWeeks: 26,
    trimester: 2,
    visitNumber: 3,
    weightKg: 52.0,
    heightCm: 153,
    bpSystolic: 112,
    bpDiastolic: 72,
    pulseRate: 118,
    tempC: 38.4,
    fundicHeight: 26.0,
    fht: 144,
    presentation: "Cephalic",
    complaint: "Active tuberculosis with high spiking fever, drenching night sweats, and blood-streaked sputum",
    history: { has_tb: true },
    hasFever: true,
    dangerSigns: "High fever, pulmonary tuberculosis with hemoptysis"
  }
];

async function seedCdssValidationEnvironment() {
  const facilityName = "RHU - CDSS Clinical Validation Lab";
  let facility = await prisma.facility.findFirst({
    where: { facility_name: facilityName }
  });

  if (!facility) {
    facility = await prisma.facility.create({
      data: {
        facility_name: facilityName,
        address: "J.P. Rizal Street, Silang, Cavite",
        contact_number: "0917-CDSS-LAB",
        email: "cdss.facility@silang.ph",
        type: "RHU",
        is_active: true
      }
    });
  }

  const adminEmail = "cdss@admin.com";
  const hashedPassword = await bcrypt.hash("password", 12);

  let adminUser = await prisma.user.findFirst({
    where: { email: { equals: adminEmail, mode: "insensitive" } }
  });

  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        facility_id: facility.facility_id,
        first_name: "CDSS",
        middle_name: "Clinical",
        last_name: "Administrator",
        role: "Admin",
        email: adminEmail,
        password: hashedPassword,
        address: "Silang RHU Complex, Silang, Cavite",
        is_active: true,
        sync_status: "synced"
      }
    });
  } else {
    adminUser = await prisma.user.update({
      where: { user_id: adminUser.user_id },
      data: {
        facility_id: facility.facility_id,
        role: "Admin",
        password: hashedPassword,
        is_active: true
      }
    });
  }

  const resultsSummary = {
    LOW: 0,
    MODERATE: 0,
    HIGH: 0
  };

  const now = new Date();

  for (let i = 0; i < MOTHERS_DATA.length; i++) {
    const item = MOTHERS_DATA[i];
    const serialNo = `CDSS-FSN-${String(i + 1).padStart(3, '0')}`;

    let motherUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: item.email },
          { phone_number: item.phone }
        ]
      }
    });

    if (!motherUser) {
      motherUser = await prisma.user.create({
        data: {
          facility_id: facility.facility_id,
          first_name: item.firstName,
          last_name: item.lastName,
          role: "Mother",
          email: item.email,
          phone_number: item.phone,
          address: item.address,
          is_active: true,
          sync_status: "synced"
        }
      });
    } else {
      motherUser = await prisma.user.update({
        where: { user_id: motherUser.user_id },
        data: {
          facility_id: facility.facility_id,
          first_name: item.firstName,
          last_name: item.lastName,
          address: item.address,
          is_active: true
        }
      });
    }

    const birthYear = now.getFullYear() - item.age;
    const birthDate = new Date(birthYear, 4, 15);

    let motherRecord = await prisma.mother.findUnique({
      where: { user_id: motherUser.user_id }
    });

    if (!motherRecord) {
      motherRecord = await prisma.mother.create({
        data: {
          user_id: motherUser.user_id,
          assigned_worker_id: adminUser.user_id,
          created_by_id: adminUser.user_id,
          family_serial_no: serialNo,
          birth_date: birthDate,
          age: item.age,
          civil_status: item.civilStatus,
          blood_type: item.bloodType,
          sync_status: "synced"
        }
      });
    } else {
      motherRecord = await prisma.mother.update({
        where: { mother_id: motherRecord.mother_id },
        data: {
          assigned_worker_id: adminUser.user_id,
          created_by_id: adminUser.user_id,
          family_serial_no: serialNo,
          birth_date: birthDate,
          age: item.age,
          civil_status: item.civilStatus,
          blood_type: item.bloodType
        }
      });
    }

    await prisma.mother_Facility_Enrollment.upsert({
      where: {
        mother_id_facility_id: {
          mother_id: motherRecord.mother_id,
          facility_id: facility.facility_id
        }
      },
      create: {
        mother_id: motherRecord.mother_id,
        facility_id: facility.facility_id,
        status: "Active",
        notes: "CDSS Clinical Validation Cohort"
      },
      update: {
        status: "Active"
      }
    });

    const lmpDate = new Date(now.getTime() - (item.aogWeeks * 7 * 24 * 60 * 60 * 1000));
    const eddDate = new Date(lmpDate.getTime() + (280 * 24 * 60 * 60 * 1000));

    let pregnancy = await prisma.pregnancy.findFirst({
      where: {
        mother_id: motherRecord.mother_id,
        pregnancy_status: "Active"
      }
    });

    const pregnancyData = {
      mother_id: motherRecord.mother_id,
      date_of_registration: lmpDate,
      lmp_date: lmpDate,
      edd_date: eddDate,
      gravida: item.gravida,
      parity: item.parity,
      age_group: item.age < 19 ? "Adolescent" : (item.age >= 35 ? "Advanced Maternal Age" : "Adult"),
      height_cm: item.heightCm,
      bmi_1st_trimester: Number((item.weightKg / Math.pow(item.heightCm / 100, 2)).toFixed(1)),
      bmi_category: "Normal",
      pregnancy_status: "Active",
      prev_caesarean: Boolean(item.history.prev_caesarean),
      consecutive_miscarriages: Boolean(item.history.consecutive_miscarriages),
      stillbirth_history: Boolean(item.history.stillbirth_history),
      pph_history: Boolean(item.history.pph_history),
      has_tb: Boolean(item.history.has_tb),
      has_heart_disease: Boolean(item.history.has_heart_disease),
      has_diabetes: Boolean(item.history.has_diabetes),
      has_asthma: Boolean(item.history.has_asthma),
      has_goiter: Boolean(item.history.has_goiter),
      previous_delivery_history: item.history.prev_caesarean ? "Cesarean Section" : (item.parity > 0 ? "Normal Spontaneous Vaginal Delivery" : null),
      sync_status: "synced"
    };

    if (!pregnancy) {
      pregnancy = await prisma.pregnancy.create({
        data: pregnancyData
      });
    } else {
      pregnancy = await prisma.pregnancy.update({
        where: { pregnancy_id: pregnancy.pregnancy_id },
        data: pregnancyData
      });
    }

    let baselineVisit = null;
    if (item.isVelocityCase) {
      const baselineDate = new Date(now.getTime() - (16 * 7 * 24 * 60 * 60 * 1000));
      baselineVisit = await prisma.prenatalVisit.findFirst({
        where: {
          pregnancy_id: pregnancy.pregnancy_id,
          visit_number: 1
        }
      });

      if (!baselineVisit) {
        baselineVisit = await prisma.prenatalVisit.create({
          data: {
            pregnancy_id: pregnancy.pregnancy_id,
            health_worker_id: adminUser.user_id,
            visit_date: baselineDate,
            trimester: 1,
            visit_number: 1,
            age_of_gestation_weeks: 12,
            weight_kg: 58.0,
            temperature_celsius: 36.5,
            pulse_rate_bpm: 74,
            bp_systolic: 102,
            bp_diastolic: 66,
            fundic_height_cm: null,
            fetal_heart_tone_bpm: 150,
            fetal_presentation: null,
            chief_complaint: "First trimester baseline registration",
            danger_signs_observed: null,
            risk_level_assessed: "Low Risk",
            has_vaginal_bleeding: false,
            has_pallor: false,
            has_edema: false,
            has_fever: false,
            sync_status: "synced"
          }
        });
      }
    }

    const vitalsPayload = {
      bp_systolic: item.bpSystolic,
      bp_diastolic: item.bpDiastolic,
      pulse_rate_bpm: item.pulseRate,
      temperature_celsius: item.tempC,
      danger_signs_observed: item.dangerSigns || null,
      has_vaginal_bleeding: Boolean(item.hasBleeding),
      has_fever: Boolean(item.hasFever),
      has_pallor: Boolean(item.hasPallor),
      has_edema: Boolean(item.hasEdema)
    };

    const assessment = calculateTewsScore({
      vitals: vitalsPayload,
      mother: { age: item.age },
      pregnancy: pregnancy,
      baselineVisit: baselineVisit
    });

    const riskLabel = assessment.risk_level === "HIGH"
      ? "High Risk"
      : (assessment.risk_level === "MODERATE" ? "Moderate Risk" : "Low Risk");

    resultsSummary[assessment.risk_level] = (resultsSummary[assessment.risk_level] || 0) + 1;

    let targetVisit = await prisma.prenatalVisit.findFirst({
      where: {
        pregnancy_id: pregnancy.pregnancy_id,
        visit_number: item.visitNumber
      }
    });

    const visitData = {
      pregnancy_id: pregnancy.pregnancy_id,
      health_worker_id: adminUser.user_id,
      visit_date: now,
      trimester: item.trimester,
      visit_number: item.visitNumber,
      age_of_gestation_weeks: item.aogWeeks,
      weight_kg: item.weightKg,
      temperature_celsius: item.tempC,
      pulse_rate_bpm: item.pulseRate,
      bp_systolic: item.bpSystolic,
      bp_diastolic: item.bpDiastolic,
      fundic_height_cm: item.fundicHeight,
      fetal_heart_tone_bpm: item.fht,
      fetal_presentation: item.presentation,
      chief_complaint: item.complaint,
      danger_signs_observed: item.dangerSigns || null,
      risk_level_assessed: riskLabel,
      has_vaginal_bleeding: Boolean(item.hasBleeding),
      has_pallor: Boolean(item.hasPallor),
      has_edema: Boolean(item.hasEdema),
      has_fever: Boolean(item.hasFever),
      sync_status: "synced"
    };

    if (!targetVisit) {
      targetVisit = await prisma.prenatalVisit.create({
        data: visitData
      });
    } else {
      targetVisit = await prisma.prenatalVisit.update({
        where: { visit_id: targetVisit.visit_id },
        data: visitData
      });
    }

    if (assessment.risk_level === "HIGH" || assessment.risk_level === "MODERATE") {
      const existingAlert = await prisma.cDSS_Alert.findFirst({
        where: {
          visit_id: targetVisit.visit_id
        }
      });

      const alertData = {
        pregnancy_id: pregnancy.pregnancy_id,
        visit_id: targetVisit.visit_id,
        alert_type: assessment.risk_level === "HIGH" ? "CRITICAL_RISK" : "MODERATE_RISK",
        alert_message: `TEWS Score: ${assessment.tews_score}. Risk level: ${riskLabel}.${assessment.triggers?.length ? ` Triggers: ${assessment.triggers.slice(0, 3).join("; ")}.` : ""}`,
        severity: assessment.risk_level === "HIGH" ? "HIGH" : "MODERATE",
        is_resolved: false,
        sync_status: "synced"
      };

      if (!existingAlert) {
        await prisma.cDSS_Alert.create({ data: alertData });
      } else {
        await prisma.cDSS_Alert.update({
          where: { alert_id: existingAlert.alert_id },
          data: alertData
        });
      }
    }
  }

  return {
    facilityId: facility.facility_id,
    facilityName: facility.facility_name,
    adminEmail: adminUser.email,
    summary: resultsSummary
  };
}

seedCdssValidationEnvironment()
  .then((res) => {
    console.log("SEEDING_COMPLETE:", JSON.stringify(res, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error("SEEDING_ERROR:", err);
    process.exit(1);
  });
