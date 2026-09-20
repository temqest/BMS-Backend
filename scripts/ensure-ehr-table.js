require('dotenv').config();
const prisma = require('../util/db');

async function ensureTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Facility_Document" (
        "document_id" TEXT PRIMARY KEY,
        "facility_id" TEXT NOT NULL,
        "mother_id" TEXT,
        "title" TEXT NOT NULL,
        "category" TEXT NOT NULL DEFAULT 'Clinical Protocols',
        "patient_name" TEXT DEFAULT 'Facility General',
        "security_level" TEXT DEFAULT 'Confidential',
        "format" TEXT DEFAULT 'PDF',
        "size" TEXT DEFAULT '1.0 MB',
        "file_url" TEXT,
        "uploaded_by" TEXT DEFAULT 'Healthcare Staff',
        "sync_status" TEXT DEFAULT 'synced',
        "version" INTEGER NOT NULL DEFAULT 1,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Facility_Document_facility_id_idx" ON "Facility_Document"("facility_id");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Facility_Document_mother_id_idx" ON "Facility_Document"("mother_id");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Facility_Document_category_idx" ON "Facility_Document"("category");
    `);

    console.log("✅ Facility_Document table and indexes verified in PostgreSQL.");
  } catch (err) {
    console.error("❌ Error setting up table:", err);
  } finally {
    await prisma.$disconnect();
  }
}

ensureTable();
