-- CreateTable
CREATE TABLE "Facility" (
    "facility_id" TEXT NOT NULL,
    "facility_name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "contact_number" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("facility_id")
);

-- CreateTable
CREATE TABLE "User" (
    "user_id" TEXT NOT NULL,
    "facility_id" TEXT,
    "first_name" TEXT NOT NULL,
    "middle_name" TEXT,
    "last_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone_number" TEXT,
    "email" TEXT,
    "address" TEXT NOT NULL,
    "password" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sync_status" TEXT DEFAULT 'synced',

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "Mother" (
    "mother_id" TEXT NOT NULL,
    "user_id" TEXT,
    "family_serial_no" TEXT,
    "birth_date" TIMESTAMP(3) NOT NULL,
    "age" INTEGER,
    "civil_status" TEXT NOT NULL,
    "blood_type" TEXT NOT NULL,
    "sync_status" TEXT DEFAULT 'synced',

    CONSTRAINT "Mother_pkey" PRIMARY KEY ("mother_id")
);

-- CreateTable
CREATE TABLE "Pregnancy" (
    "pregnancy_id" TEXT NOT NULL,
    "mother_id" TEXT NOT NULL,
    "date_of_registration" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lmp_date" TIMESTAMP(3) NOT NULL,
    "gravida" INTEGER NOT NULL,
    "parity" INTEGER NOT NULL,
    "previous_delivery_history" TEXT,
    "co_morbidities" TEXT,
    "age_group" TEXT NOT NULL,
    "bmi_1st_trimester" DECIMAL(65,30),
    "bmi_category" TEXT,
    "pregnancy_status" TEXT NOT NULL,
    "deworming_given" BOOLEAN NOT NULL DEFAULT false,
    "deworming_date" TIMESTAMP(3),
    "sync_status" TEXT DEFAULT 'synced',

    CONSTRAINT "Pregnancy_pkey" PRIMARY KEY ("pregnancy_id")
);

-- CreateTable
CREATE TABLE "PrenatalVisit" (
    "visit_id" TEXT NOT NULL,
    "pregnancy_id" TEXT NOT NULL,
    "health_worker_id" TEXT NOT NULL,
    "visit_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trimester" INTEGER NOT NULL,
    "visit_number" INTEGER NOT NULL,
    "age_of_gestation_weeks" INTEGER NOT NULL,
    "weight_kg" DECIMAL(65,30) NOT NULL,
    "temperature_celsius" DECIMAL(65,30) NOT NULL,
    "pulse_rate_bpm" INTEGER NOT NULL,
    "bp_diastolic" INTEGER NOT NULL,
    "bp_systolic" INTEGER NOT NULL,
    "fundic_height_cm" DECIMAL(65,30),
    "fetal_heart_tone_bpm" INTEGER,
    "chief_complaint" TEXT,
    "danger_signs_observed" TEXT,
    "risk_level_assessed" TEXT,
    "sync_status" TEXT DEFAULT 'synced',

    CONSTRAINT "PrenatalVisit_pkey" PRIMARY KEY ("visit_id")
);

-- CreateTable
CREATE TABLE "Immunization_Record" (
    "immunization_id" TEXT NOT NULL,
    "pregnancy_id" TEXT NOT NULL,
    "vaccine_dose" TEXT NOT NULL,
    "date_administered" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fully_immunized_mother" BOOLEAN NOT NULL DEFAULT false,
    "sync_status" TEXT NOT NULL DEFAULT 'synced',

    CONSTRAINT "Immunization_Record_pkey" PRIMARY KEY ("immunization_id")
);

-- CreateTable
CREATE TABLE "Supplementation_Record" (
    "supplement_id" TEXT NOT NULL,
    "pregnancy_id" TEXT NOT NULL,
    "visit_id" TEXT NOT NULL,
    "supplement_type" TEXT NOT NULL,
    "tablets_given_count" INTEGER NOT NULL,
    "date_given" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "sync_status" TEXT NOT NULL DEFAULT 'synced',

    CONSTRAINT "Supplementation_Record_pkey" PRIMARY KEY ("supplement_id")
);

-- CreateTable
CREATE TABLE "Lab_Screening" (
    "screening_id" TEXT NOT NULL,
    "pregnancy_id" TEXT NOT NULL,
    "visit_id" TEXT NOT NULL,
    "screening_type" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "date_of_screening" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,
    "sync_status" TEXT NOT NULL DEFAULT 'synced',

    CONSTRAINT "Lab_Screening_pkey" PRIMARY KEY ("screening_id")
);

-- CreateTable
CREATE TABLE "CDSS_Alert" (
    "alert_id" TEXT NOT NULL,
    "pregnancy_id" TEXT NOT NULL,
    "visit_id" TEXT NOT NULL,
    "alert_type" TEXT NOT NULL,
    "alert_message" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "sync_status" TEXT NOT NULL DEFAULT 'synced',

    CONSTRAINT "CDSS_Alert_pkey" PRIMARY KEY ("alert_id")
);

-- CreateTable
CREATE TABLE "Online_Referral" (
    "referral_id" TEXT NOT NULL,
    "pregnancy_id" TEXT NOT NULL,
    "from_facility_id" TEXT NOT NULL,
    "to_facility_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "date_referred" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sync_status" TEXT NOT NULL DEFAULT 'synced',

    CONSTRAINT "Online_Referral_pkey" PRIMARY KEY ("referral_id")
);

-- CreateTable
CREATE TABLE "Delivery_Outcome" (
    "delivery_id" TEXT NOT NULL,
    "pregnancy_id" TEXT NOT NULL,
    "delivery_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "place_of_delivery" TEXT NOT NULL,
    "mode_of_delivery" TEXT NOT NULL,
    "duration_of_labor_hours" DECIMAL(65,30),
    "blood_loss_ml" INTEGER,
    "delivery_complications" TEXT,
    "sync_status" TEXT NOT NULL DEFAULT 'synced',

    CONSTRAINT "Delivery_Outcome_pkey" PRIMARY KEY ("delivery_id")
);

-- CreateTable
CREATE TABLE "Newborn_Record" (
    "newborn_id" TEXT NOT NULL,
    "delivery_id" TEXT NOT NULL,
    "sex" TEXT NOT NULL,
    "birth_date_kg" DECIMAL(65,30) NOT NULL,
    "status_at_birth" TEXT NOT NULL,
    "apgrar_score" INTEGER NOT NULL,
    "sync_status" TEXT NOT NULL DEFAULT 'synced',

    CONSTRAINT "Newborn_Record_pkey" PRIMARY KEY ("newborn_id")
);

-- CreateTable
CREATE TABLE "postpartum_visit" (
    "postpartum_visit_id" TEXT NOT NULL,
    "delivery_id" TEXT NOT NULL,
    "visit_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visit_number" INTEGER NOT NULL,
    "weight_kg" DECIMAL(65,30) NOT NULL,
    "temperature_celsius" DECIMAL(65,30) NOT NULL,
    "pulse_rate_bpm" INTEGER NOT NULL,
    "bp_diastolic" INTEGER NOT NULL,
    "bp_systolic" INTEGER NOT NULL,
    "fundic_height_cm" DECIMAL(65,30),
    "chief_complaint" TEXT,
    "danger_signs_observed" TEXT,
    "risk_level_assessed" TEXT,
    "vitamin_a_given" BOOLEAN NOT NULL DEFAULT false,
    "iron_supplement_given" BOOLEAN NOT NULL DEFAULT false,
    "sync_status" TEXT NOT NULL DEFAULT 'synced',

    CONSTRAINT "postpartum_visit_pkey" PRIMARY KEY ("postpartum_visit_id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "appointment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "appointment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appointment_time" TEXT NOT NULL,
    "sync_status" TEXT NOT NULL DEFAULT 'synced',

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("appointment_id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "notification_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "notification_type" TEXT NOT NULL,
    "notification_message" TEXT NOT NULL,
    "notification_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "sync_status" TEXT NOT NULL DEFAULT 'synced',

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "In_App_Message" (
    "message_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "message_type" TEXT NOT NULL,
    "message_content" TEXT NOT NULL,
    "message_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "sync_status" TEXT NOT NULL DEFAULT 'synced',

    CONSTRAINT "In_App_Message_pkey" PRIMARY KEY ("message_id")
);

-- CreateTable
CREATE TABLE "Audit_Revision_Log" (
    "audit_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "previous_state" TEXT,
    "new_state" TEXT,
    "client_timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sync_status" TEXT NOT NULL DEFAULT 'synced',

    CONSTRAINT "Audit_Revision_Log_pkey" PRIMARY KEY ("audit_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mother_user_id_key" ON "Mother"("user_id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "Facility"("facility_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mother" ADD CONSTRAINT "Mother_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pregnancy" ADD CONSTRAINT "Pregnancy_mother_id_fkey" FOREIGN KEY ("mother_id") REFERENCES "Mother"("mother_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrenatalVisit" ADD CONSTRAINT "PrenatalVisit_pregnancy_id_fkey" FOREIGN KEY ("pregnancy_id") REFERENCES "Pregnancy"("pregnancy_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrenatalVisit" ADD CONSTRAINT "PrenatalVisit_health_worker_id_fkey" FOREIGN KEY ("health_worker_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Immunization_Record" ADD CONSTRAINT "Immunization_Record_pregnancy_id_fkey" FOREIGN KEY ("pregnancy_id") REFERENCES "Pregnancy"("pregnancy_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplementation_Record" ADD CONSTRAINT "Supplementation_Record_pregnancy_id_fkey" FOREIGN KEY ("pregnancy_id") REFERENCES "Pregnancy"("pregnancy_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplementation_Record" ADD CONSTRAINT "Supplementation_Record_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "PrenatalVisit"("visit_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lab_Screening" ADD CONSTRAINT "Lab_Screening_pregnancy_id_fkey" FOREIGN KEY ("pregnancy_id") REFERENCES "Pregnancy"("pregnancy_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lab_Screening" ADD CONSTRAINT "Lab_Screening_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "PrenatalVisit"("visit_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CDSS_Alert" ADD CONSTRAINT "CDSS_Alert_pregnancy_id_fkey" FOREIGN KEY ("pregnancy_id") REFERENCES "Pregnancy"("pregnancy_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CDSS_Alert" ADD CONSTRAINT "CDSS_Alert_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "PrenatalVisit"("visit_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Online_Referral" ADD CONSTRAINT "Online_Referral_pregnancy_id_fkey" FOREIGN KEY ("pregnancy_id") REFERENCES "Pregnancy"("pregnancy_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Online_Referral" ADD CONSTRAINT "Online_Referral_from_facility_id_fkey" FOREIGN KEY ("from_facility_id") REFERENCES "Facility"("facility_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Online_Referral" ADD CONSTRAINT "Online_Referral_to_facility_id_fkey" FOREIGN KEY ("to_facility_id") REFERENCES "Facility"("facility_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery_Outcome" ADD CONSTRAINT "Delivery_Outcome_pregnancy_id_fkey" FOREIGN KEY ("pregnancy_id") REFERENCES "Pregnancy"("pregnancy_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Newborn_Record" ADD CONSTRAINT "Newborn_Record_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "Delivery_Outcome"("delivery_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postpartum_visit" ADD CONSTRAINT "postpartum_visit_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "Delivery_Outcome"("delivery_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "In_App_Message" ADD CONSTRAINT "In_App_Message_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "In_App_Message" ADD CONSTRAINT "In_App_Message_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit_Revision_Log" ADD CONSTRAINT "Audit_Revision_Log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
