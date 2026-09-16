const prisma = require('../util/db');

async function main() {
  console.log('Adding fcm_token column to User table if not exists...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "fcm_token" TEXT;
  `);
  console.log('Successfully executed ALTER TABLE!');
  
  const sampleUser = await prisma.user.findFirst({
    select: { user_id: true, fcm_token: true }
  });
  console.log('Verified query on User table! Sample result:', sampleUser);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
