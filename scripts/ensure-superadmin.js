require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../util/db');

async function ensureSuperAdmin() {
  const email = process.env.SUPERADMIN_EMAIL || process.argv[2];
  const password = process.env.SUPERADMIN_PASSWORD || process.argv[3];

  if (!email || !password) {
    console.error("Usage: node scripts/ensure-superadmin.js <email> <password> OR define SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD in environment.");
    process.exit(1);
  }

  try {
    const existing = await prisma.user.findFirst({
      where: {
        email: { equals: email.trim(), mode: 'insensitive' }
      }
    });

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (existing) {
      const updated = await prisma.user.update({
        where: { user_id: existing.user_id },
        data: {
          role: 'SystemAdmin',
          facility_id: null,
          password: hashedPassword,
          is_active: true
        }
      });
      console.log(`Updated user ${updated.email} to SystemAdmin with facility_id: null`);
    } else {
      const created = await prisma.user.create({
        data: {
          first_name: "Municipal",
          last_name: "Superadmin",
          email: email.trim(),
          role: "SystemAdmin",
          facility_id: null,
          address: "Silang Municipal Health Office",
          password: hashedPassword,
          is_active: true,
          sync_status: "synced"
        }
      });
      console.log(`Created new SystemAdmin user: ${created.email}`);
    }
  } catch (err) {
    console.error("Error setting up super admin:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

ensureSuperAdmin();

