import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearTestData() {
  console.log('🧹 Clearing test data from MDJ Practice Manager database...');

  try {
    // Clear data in dependency order (children first, then parents)
    
    console.log('📋 Clearing events...');
    await prisma.event.deleteMany();

    console.log('📋 Clearing calendar events...');
    await prisma.calendarEvent.deleteMany();

    console.log('📋 Clearing companies house data...');
    await prisma.companiesHouseData.deleteMany();

    console.log('📋 Clearing documents...');
    await prisma.document.deleteMany();

    console.log('📋 Clearing filings...');
    await prisma.filing.deleteMany();

    console.log('📋 Clearing tasks...');
    await prisma.task.deleteMany();

    console.log('📋 Clearing services...');
    await prisma.service.deleteMany();

    console.log('📋 Clearing client parties...');
    await prisma.clientParty.deleteMany();

    console.log('📋 Clearing clients...');
    await prisma.client.deleteMany();

    console.log('📋 Clearing people...');
    await prisma.person.deleteMany();

    console.log('📋 Clearing reference buckets...');
    await prisma.refBucket.deleteMany();

    console.log('📋 Clearing portfolios...');
    await prisma.portfolio.deleteMany();

    console.log('✅ Test data cleared successfully!');
    console.log('');
    console.log('📊 Database is now clean with the following structure preserved:');
    console.log('   - All tables and indexes intact');
    console.log('   - All constraints and relationships preserved');
    console.log('   - Ready for fresh data entry');
    console.log('');
    console.log('🚀 You can now start adding new clients, tasks, and documents');

  } catch (error) {
    console.error('❌ Error clearing test data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearTestData();