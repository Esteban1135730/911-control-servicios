import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin123!', 10);
  const driverHash = await bcrypt.hash('Conductor123!', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
      fullName: 'Administrador 911',
      phone: '3000000001',
      role: Role.ADMIN,
    },
  });

  const drivers = [
    { username: 'conductor1', fullName: 'Carlos Pérez', phone: '3001112233', rate: 18000 },
    { username: 'conductor2', fullName: 'María Gómez', phone: '3004445566', rate: 18000 },
    { username: 'conductor3', fullName: 'Andrés López', phone: '3007778899', rate: 20000 },
  ];

  for (const d of drivers) {
    await prisma.user.upsert({
      where: { username: d.username },
      update: {},
      create: {
        username: d.username,
        passwordHash: driverHash,
        fullName: d.fullName,
        phone: d.phone,
        role: Role.DRIVER,
        hourlyRate: d.rate,
      },
    });
  }

  console.log('Seed OK');
  console.log('Admin: admin / Admin123!');
  console.log('Conductor: conductor1 / Conductor123!');
  console.log('Admin id:', admin.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
