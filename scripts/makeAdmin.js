/**
 * Promueve un usuario a ADMIN por email.
 * Uso: node scripts/makeAdmin.js tu@email.com
 */
import 'dotenv/config';
import { prisma } from '../src/lib/prismaClient.js';

const email = process.argv[2];

if (!email) {
  console.error('Uso: node scripts/makeAdmin.js <email>');
  process.exit(1);
}

const user = await prisma.user.update({
  where: { email },
  data: { role: 'ADMIN' },
});

console.log(`Usuario ${user.email} ahora es ADMIN`);

await prisma.$disconnect();
