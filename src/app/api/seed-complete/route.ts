import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { UserType, ServiceStatus, PaymentStatus, PaymentMethod, ApplicationType } from '@/generated/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shouldReset = searchParams.get('reset') === 'true';

    // Check if data already exists
    const existingUsers = await prisma.user.count();
    if (existingUsers > 1 && !shouldReset) { // More than just the system admin
      return NextResponse.json({
        success: true,
        message: 'Database already has demo data. Use ?reset=true to force reseed.',
        dataExists: true
      });
    }

    // Reset database if requested
    if (shouldReset) {
      console.log('Resetting database...');

      // Delete in order to handle foreign key constraints
      await prisma.invoiceItem.deleteMany();
      await prisma.invoice.deleteMany();
      await prisma.payment.deleteMany();
      await prisma.rating.deleteMany();
      await prisma.notification.deleteMany();
      await prisma.application.deleteMany();
      await prisma.additionalService.deleteMany();
      await prisma.ongoingService.deleteMany();
      await prisma.vehicleStatus.deleteMany();
      await prisma.serviceRequest.deleteMany();
      await prisma.vehicle.deleteMany();
      await prisma.garageService.deleteMany();
      await prisma.mechanic.deleteMany();
      await prisma.garage.deleteMany();
      await prisma.service.deleteMany();

      // Delete all users except system admin
      await prisma.user.deleteMany({
        where: {
          userType: {
            not: UserType.SYSTEM_ADMIN
          }
        }
      });

      console.log('Database reset complete.');
    }

    const hashedPassword = await bcrypt.hash('password123', 12);

    // Ethiopian names and locations data
    const ethiopianNames = {
      firstNames: [
        'Alemayehu', 'Meseret', 'Dawit', 'Hanan', 'Yohannes', 'Mulugeta', 'Tigist',
        'Solomon', 'Meron', 'Abel', 'Hanan', 'Kalkidan', 'Biruk', 'Senait', 'Haile',
        'Mekdes', 'Samuel', 'Helen', 'Daniel', 'Alemnesh', 'Tesfaye', 'Eyerusalem',
        'Gebremariam', 'Aster', 'Yonas', 'Meskerem', 'Alem', 'Selam', 'Tewodros',
        'Hanan', 'Mekuria', 'Frehiwot', 'Abiy', 'Mulu', 'Genet', 'Kassahun',
        'Worknesh', 'Bereket', 'Tsion', 'Mulugeta', 'Eden', 'Fikru', 'Hanan',
        'Lulit', 'Mekonnen', 'Rahel', 'Sisay', 'Tsedale', 'Yared', 'Zewditu'
      ],
      lastNames: [
        'Kebede', 'Asfaw', 'Tadesse', 'Gebremariam', 'Mekonnen', 'Tesfaye',
        'Abraham', 'Haile', 'Solomon', 'Mengistu', 'Bekele', 'Woldemariam',
        'Girma', 'Yohannes', 'Alemayehu', 'Kassa', 'Demissie', 'Getachew',
        'Teferi', 'Mulugeta', 'Worku', 'Desta', 'Zewdie', 'Meseret', 'Fikadu',
        'Alem', 'Birhanu', 'Chala', 'Dejene', 'Elias', 'Fantahun', 'Gebreselassie',
        'Habte', 'Iyasu', 'Jemberu', 'Kifle', 'Lemma', 'Mekuria', 'Negash',
        'Oumer', 'Petros', 'Qes', 'Robel', 'Seifu', 'Teka', 'Umer', 'Vidal',
        'Wassihun', 'Yemane', 'Zerihun'
      ]
    };

    const addisAbabaLocations = [
      { name: 'Piassa', lat: 9.0347, lng: 38.7578 },
      { name: 'Kazanchis', lat: 9.0167, lng: 38.7667 },
      { name: 'Bole', lat: 8.9914, lng: 38.7944 },
      { name: 'Piazza', lat: 9.0347, lng: 38.7578 },
      { name: 'Merkato', lat: 9.0333, lng: 38.7333 },
      { name: 'Kality', lat: 9.0333, lng: 38.7667 },
      { name: 'Gerji', lat: 9.0167, lng: 38.7833 },
      { name: 'CMC', lat: 9.0167, lng: 38.7667 },
      { name: 'Sarbet', lat: 9.0333, lng: 38.7500 },
      { name: 'Lebu', lat: 9.0333, lng: 38.7333 },
      { name: 'Ayat', lat: 9.0167, lng: 38.7833 },
      { name: 'Wello Sefer', lat: 9.0333, lng: 38.7667 },
      { name: 'Stadium', lat: 9.0167, lng: 38.7667 },
      { name: 'Mexico', lat: 9.0333, lng: 38.7500 },
      { name: 'Semit', lat: 9.0167, lng: 38.7833 }
    ];

    const vehicleTypes = ['Sedan', 'SUV', 'Truck', 'Motorcycle', 'Van', 'Hatchback'];
    const vehicleColors = ['White', 'Black', 'Silver', 'Blue', 'Red', 'Green', 'Gray'];

    // Create system admin if not exists
    let systemAdmin = await prisma.user.findFirst({
      where: { userType: UserType.SYSTEM_ADMIN }
    });

    if (!systemAdmin) {
      systemAdmin = await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@autoservice.com',
          password: await bcrypt.hash('admin', 12),
          firstName: 'System',
          lastName: 'Administrator',
          phoneNumber: '+251911000000',
          userType: UserType.SYSTEM_ADMIN,
        },
      });
    }

    // Create garage admins
    const garageAdmins = [];
    for (let i = 0; i < 8; i++) {
      const firstName = ethiopianNames.firstNames[Math.floor(Math.random() * ethiopianNames.firstNames.length)];
      const lastName = ethiopianNames.lastNames[Math.floor(Math.random() * ethiopianNames.lastNames.length)];

      const garageAdmin = await prisma.user.create({
        data: {
          username: `garageadmin${i + 1}`,
          email: `garageadmin${i + 1}@autoservice.com`,
          password: hashedPassword,
          firstName,
          lastName,
          phoneNumber: `+2519${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
          userType: UserType.GARAGE_ADMIN,
        },
      });
      garageAdmins.push(garageAdmin);
    }

    // Create mechanics
    const mechanics = [];
    for (let i = 0; i < 15; i++) {
      const firstName = ethiopianNames.firstNames[Math.floor(Math.random() * ethiopianNames.firstNames.length)];
      const lastName = ethiopianNames.lastNames[Math.floor(Math.random() * ethiopianNames.lastNames.length)];

      const mechanic = await prisma.user.create({
        data: {
          username: `mechanic${i + 1}`,
          email: `mechanic${i + 1}@autoservice.com`,
          password: hashedPassword,
          firstName,
          lastName,
          phoneNumber: `+2519${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
          userType: UserType.MECHANIC,
        },
      });
      mechanics.push(mechanic);
    }

    // Create customers
    const customers = [];
    for (let i = 0; i < 25; i++) {
      const firstName = ethiopianNames.firstNames[Math.floor(Math.random() * ethiopianNames.firstNames.length)];
      const lastName = ethiopianNames.lastNames[Math.floor(Math.random() * ethiopianNames.lastNames.length)];

      const customer = await prisma.user.create({
        data: {
          username: `customer${i + 1}`,
          email: `customer${i + 1}@autoservice.com`,
          password: hashedPassword,
          firstName,
          lastName,
          phoneNumber: `+2519${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
          userType: UserType.CUSTOMER,
        },
      });
      customers.push(customer);
    }

    // Create garages
    const garages = [];
    const garageNames = [
      'Addis Auto Service', 'Ethio Car Care', 'Shewa Auto Repair', 'Abyssinia Motors',
      'Lion Auto Workshop', 'Addis Ababa Auto', 'Ethiopian Car Service', 'Blue Nile Auto',
      'Rift Valley Motors', 'Simien Auto Care', 'Entoto Auto Service', 'Awash Auto Repair',
      'Omo Auto Workshop', 'Tekeze Car Service', 'Danakil Auto Care'
    ];

    for (let i = 0; i < garageAdmins.length; i++) {
      const location = addisAbabaLocations[i % addisAbabaLocations.length];
      const garage = await prisma.garage.create({
        data: {
          garageName: garageNames[i],
          adminId: garageAdmins[i].id,
          latitude: location.lat + (Math.random() - 0.5) * 0.01, // Add some variation
          longitude: location.lng + (Math.random() - 0.5) * 0.01,
          rating: Math.floor(Math.random() * 3) + 3, // 3-5 stars
          available: true,
          approved: true,
        },
      });
      garages.push(garage);
    }

    // Create mechanics and assign to garages
    for (let i = 0; i < mechanics.length; i++) {
      const garage = garages[i % garages.length];
      await prisma.mechanic.create({
        data: {
          userId: mechanics[i].id,
          garageId: garage.id,
          approved: true,
        },
      });
    }

    // Create comprehensive services
    const services = [
      { serviceName: 'Oil Change', estimatedPrice: 500.0 },
      { serviceName: 'Brake Service', estimatedPrice: 1200.0 },
      { serviceName: 'Tire Replacement', estimatedPrice: 800.0 },
      { serviceName: 'Engine Diagnostic', estimatedPrice: 300.0 },
      { serviceName: 'Battery Replacement', estimatedPrice: 1500.0 },
      { serviceName: 'Transmission Service', estimatedPrice: 2000.0 },
      { serviceName: 'AC Repair', estimatedPrice: 1800.0 },
      { serviceName: 'Suspension Repair', estimatedPrice: 2500.0 },
      { serviceName: 'Exhaust System Repair', estimatedPrice: 1500.0 },
      { serviceName: 'Electrical System Repair', estimatedPrice: 1200.0 },
      { serviceName: 'Cooling System Service', estimatedPrice: 900.0 },
      { serviceName: 'Fuel System Service', estimatedPrice: 1100.0 },
      { serviceName: 'Wheel Alignment', estimatedPrice: 600.0 },
      { serviceName: 'Car Wash', estimatedPrice: 200.0 },
      { serviceName: 'Detailing Service', estimatedPrice: 1500.0 },
      { serviceName: 'Emergency Towing', estimatedPrice: 800.0 },
      { serviceName: 'Roadside Assistance', estimatedPrice: 400.0 },
      { serviceName: 'Vehicle Inspection', estimatedPrice: 300.0 },
      { serviceName: 'Paint Job', estimatedPrice: 5000.0 },
      { serviceName: 'Body Repair', estimatedPrice: 3000.0 }
    ];

    const createdServices = [];
    for (const service of services) {
      const createdService = await prisma.service.create({
        data: {
          ...service,
          createdBy: systemAdmin.id,
        },
      });
      createdServices.push(createdService);
    }

    // Assign services to garages
    for (const garage of garages) {
      const numServices = Math.floor(Math.random() * 8) + 8; // 8-15 services per garage
      const shuffledServices = [...createdServices].sort(() => 0.5 - Math.random());
      const selectedServices = shuffledServices.slice(0, numServices);

      for (const service of selectedServices) {
        await prisma.garageService.create({
          data: {
            garageId: garage.id,
            serviceId: service.id,
            available: true,
          },
        });
      }
    }

    // Create vehicles for customers
    const vehicles = [];
    for (const customer of customers) {
      const numVehicles = Math.floor(Math.random() * 2) + 1; // 1-2 vehicles per customer
      for (let i = 0; i < numVehicles; i++) {
        const vehicle = await prisma.vehicle.create({
          data: {
            customerId: customer.id,
            vehicleType: vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)],
            plateNumber: `AA${Math.floor(Math.random() * 90000) + 10000}`,
            plateCode: 'AA',
            countryCode: 'ET',
            color: vehicleColors[Math.floor(Math.random() * vehicleColors.length)],
          },
        });
        vehicles.push(vehicle);
      }
    }

    // Create service requests
    const serviceRequests = [];
    const statuses = [ServiceStatus.PENDING, ServiceStatus.ACCEPTED, ServiceStatus.IN_PROGRESS, ServiceStatus.COMPLETED];

    for (let i = 0; i < 50; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const garage = garages[Math.floor(Math.random() * garages.length)];
      const customerVehicles = vehicles.filter(v => v.customerId === customer.id);
      const vehicle = customerVehicles[Math.floor(Math.random() * customerVehicles.length)];
      const location = addisAbabaLocations[Math.floor(Math.random() * addisAbabaLocations.length)];

      const serviceRequest = await prisma.serviceRequest.create({
        data: {
          customerId: customer.id,
          garageId: garage.id,
          vehicleId: vehicle.id,
          latitude: location.lat + (Math.random() - 0.5) * 0.02,
          longitude: location.lng + (Math.random() - 0.5) * 0.02,
          status: statuses[Math.floor(Math.random() * statuses.length)],
        },
      });
      serviceRequests.push(serviceRequest);
    }

    // Create ratings
    for (const request of serviceRequests.filter(r => r.status === ServiceStatus.COMPLETED)) {
      const customer = await prisma.user.findUnique({ where: { id: request.customerId } });
      const garage = await prisma.garage.findUnique({ where: { id: request.garageId } });

      if (customer && garage) {
        await prisma.rating.create({
          data: {
            customerId: customer.id,
            garageId: garage.id,
            rating: Math.floor(Math.random() * 3) + 3, // 3-5 stars
            comment: 'Good service, professional work.',
          },
        });
      }
    }

    // Create payments
    for (const request of serviceRequests.filter(r => r.status === ServiceStatus.COMPLETED)) {
      const customer = await prisma.user.findUnique({ where: { id: request.customerId } });
      const garage = await prisma.garage.findUnique({ where: { id: request.garageId } });

      if (customer && garage) {
        const amount = Math.floor(Math.random() * 5000) + 500; // 500-5500 ETB
        const payment = await prisma.payment.create({
          data: {
            customerId: customer.id,
            garageId: garage.id,
            serviceRequestId: request.id,
            amount,
            paymentMethod: PaymentMethod.CASH,
            status: PaymentStatus.COMPLETED,
            paymentDate: new Date(),
          },
        });

        // Create invoice for payment
        await prisma.invoice.create({
          data: {
            paymentId: payment.id,
            invoiceNumber: `INV-${payment.id.toString().padStart(6, '0')}`,
            customerId: customer.id,
            garageId: garage.id,
            serviceRequestId: request.id,
            subtotal: amount * 0.9,
            taxAmount: amount * 0.1,
            totalAmount: amount,
            status: 'paid',
            paidDate: new Date(),
          },
        });
      }
    }

    // Create notifications
    for (const request of serviceRequests) {
      const customer = await prisma.user.findUnique({ where: { id: request.customerId } });
      const garage = await prisma.garage.findUnique({ where: { id: request.garageId } });

      if (customer && garage) {
        const garageAdmin = await prisma.user.findUnique({ where: { id: garage.adminId } });

        if (garageAdmin) {
          await prisma.notification.create({
            data: {
              senderId: customer.id,
              receiverId: garageAdmin.id,
              type: 'SERVICE_REQUEST',
              title: 'New Service Request',
              message: `New service request from ${customer.firstName} ${customer.lastName}`,
              read: Math.random() > 0.5,
            },
          });
        }
      }
    }

    // Create some applications
    for (let i = 0; i < 5; i++) {
      const applicant = customers[Math.floor(Math.random() * customers.length)];
      await prisma.application.create({
        data: {
          applicantId: applicant.id,
          applicationType: Math.random() > 0.5 ? ApplicationType.GARAGE : ApplicationType.MECHANIC,
          approved: Math.random() > 0.5,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: shouldReset
        ? 'Database reset and complete demo data seeded successfully!'
        : 'Complete demo database seeded successfully!',
      data: {
        resetPerformed: shouldReset,
        usersCreated: customers.length + mechanics.length + garageAdmins.length + 1,
        garagesCreated: garages.length,
        servicesCreated: createdServices.length,
        vehiclesCreated: vehicles.length,
        serviceRequestsCreated: serviceRequests.length,
        paymentsCreated: serviceRequests.filter(r => r.status === ServiceStatus.COMPLETED).length,
      }
    });

  } catch (error) {
    console.error('Database seeding error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({
      error: `Database seeding failed: ${errorMessage}`,
      details: error
    }, { status: 500 });
  }
}