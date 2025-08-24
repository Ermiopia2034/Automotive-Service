import { PrismaClient, UserType } from '../src/generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Check if system admin already exists
  const existingAdmin = await prisma.user.findFirst({
    where: { userType: UserType.SYSTEM_ADMIN }
  });

  if (existingAdmin) {
    console.log('System admin already exists');
    return;
  }

  // Create system admin user
  const hashedPassword = await bcrypt.hash('admin', 12);
  
  const systemAdmin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@autoservice.com',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      phoneNumber: '+251911000000',
      userType: UserType.SYSTEM_ADMIN,
    },
  });

  console.log('System admin created:', systemAdmin.email);

  // Create some basic services
  const basicServices = [
    { serviceName: 'Oil Change', estimatedPrice: 500.0 },
    { serviceName: 'Brake Service', estimatedPrice: 1200.0 },
    { serviceName: 'Tire Replacement', estimatedPrice: 800.0 },
    { serviceName: 'Engine Diagnostic', estimatedPrice: 300.0 },
    { serviceName: 'Battery Replacement', estimatedPrice: 1500.0 },
    { serviceName: 'Transmission Service', estimatedPrice: 2000.0 },
  ];

  for (const service of basicServices) {
    await prisma.service.create({
      data: {
        ...service,
        createdBy: systemAdmin.id,
      },
    });
  }

  console.log('Basic services created');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });