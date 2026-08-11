require('dotenv').config();
console.log("DATABASE_URL is:", process.env.DATABASE_URL);
const { createClient } = require('@libsql/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const dbUrl = 'file:dev.db';
  const adapter = new PrismaLibSql({ url: dbUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    const res = await prisma.gameSession.findMany();
    console.log('Success!', res);
  } catch (e) {
    console.error('Error in PrismaClient:', e);
  }
}
main();
