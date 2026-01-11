import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    const clientCount = await prisma.client.count();
    const taskCount = await prisma.task.count();
    const documentCount = await prisma.document.count();
    const serviceCount = await prisma.service.count();
    const peopleCount = await prisma.person.count();
    
    console.log('📊 Database Status:');
    console.log(`   Clients: ${clientCount}`);
    console.log(`   Tasks: ${taskCount}`);
    console.log(`   Documents: ${documentCount}`);
    console.log(`   Services: ${serviceCount}`);
    console.log(`   People: ${peopleCount}`);
    
    if (clientCount === 0 && taskCount === 0 && documentCount === 0) {
      console.log('✅ Database is clean!');
    } else {
      console.log('⚠️  Database still has data');
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();