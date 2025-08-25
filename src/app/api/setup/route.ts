import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { UserType } from '@/generated/prisma';

export async function GET() {
  try {
    // Check if system admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { userType: UserType.SYSTEM_ADMIN }
    });

    if (existingAdmin) {
      return NextResponse.json({ 
        success: true, 
        message: 'Database already initialized. Admin user exists.',
        adminExists: true 
      });
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

    return NextResponse.json({ 
      success: true, 
      message: 'Database initialized successfully! Admin user and services created.',
      admin: {
        username: 'admin',
        email: 'admin@autoservice.com',
        userType: 'SYSTEM_ADMIN'
      },
      servicesCreated: basicServices.length
    });

  } catch (error) {
    console.error('Database setup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({
      error: `Database setup failed: ${errorMessage}`,
      details: error
    }, { status: 500 });
  }
}