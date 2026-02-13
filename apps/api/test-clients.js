const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

async function test() {
  try {
    console.log('Testing client query...');
    const clients = await prisma.client.findMany({
      take: 5,
      include: { clientProfile: true },
    });
    console.log(`Found ${clients.length} clients`);
    console.log('First client:', JSON.stringify(clients[0], null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

test();
