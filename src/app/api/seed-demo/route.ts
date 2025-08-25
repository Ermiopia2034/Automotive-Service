import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { UserType, ServiceStatus, PaymentStatus, PaymentMethod, ApplicationType } from '@/generated/prisma';

export async function GET() {
  try {
    // Check if demo data already exists
    const existingDemoUser = await prisma.user.findFirst({
      where: { username: 'user' }
    });

    if (existingDemoUser) {
      return NextResponse.json({
        success: true,
        message: 'Demo data already exists.',
        demoExists: true
      });
    }

    // Ethiopian names and data
    const ethiopianData = {
      maleNames: ['Abebe', 'Alemayehu', 'Bekele', 'Dawit', 'Ephrem', 'Girma', 'Haile', 'Kassahun', 'Melaku', 'Negash', 'Tadesse', 'Worku', 'Yohannes', 'Zerihun'],
      femaleNames: ['Almaz', 'Birtukan', 'Chaltu', 'Desta', 'Feven', 'Genet', 'Hanan', 'Kokeb', 'Meron', 'Netsanet', 'Rahel', 'Sara', 'Tigist', 'Wubit'],
      lastNames: ['Alemu', 'Bekele', 'Desta', 'Hailu', 'Kassa', 'Lemma', 'Mekonnen', 'Tadesse', 'Tesfaye', 'Wolde', 'Yohannes', 'Zerihun'],
      cities: [
        { name: 'Addis Ababa', lat: 9.0320, lng: 38.7460, code: '1' },
        { name: 'Bahir Dar', lat: 11.5940, lng: 37.3900, code: '2' },
        { name: 'Mekelle', lat: 13.4970, lng: 39.4750, code: '3' },
        { name: 'Dire Dawa', lat: 9.6010, lng: 41.8550, code: '4' },
        { name: 'Hawassa', lat: 7.0620, lng: 38.4760, code: '5' },
        { name: 'Gondar', lat: 12.6090, lng: 37.4470, code: '6' },
        { name: 'Jimma', lat: 7.6730, lng: 36.8340, code: '7' },
        { name: 'Adama', lat: 8.5400, lng: 39.2690, code: '8' }
      ],
      vehicleTypes: ['Toyota Corolla', 'Suzuki Alto', 'Hyundai Elantra', 'Bajaj Tuk Tuk', 'Isuzu D-Max', 'Toyota Hiace', 'Honda Fit', 'Nissan Sunny'],
      garageNames: ['Autotech Service', 'Bole Car Care', 'Mercato Motors', 'Piazza Auto', 'Summit Auto Service', 'Unity Garage', 'Modern Car Service', 'Reliable Motors']
    };

    const hashedPassword = await bcrypt.hash('JJasdkjfas123123...?', 12);
    const timestamp = Date.now();

    // 1. Create demo user (main user)
    const demoUser = await prisma.user.create({
      data: {
        username: 'user',
        email: `user.${timestamp}@demo.com`,
        password: hashedPassword,
        firstName: 'Abebe',
        lastName: 'Bekele',
        phoneNumber: '+251911123456',
        userType: UserType.CUSTOMER,
      },
    });

    // 2. Create multiple customers
    const customers = [];
    for (let i = 0; i < 15; i++) {
      const firstName = Math.random() > 0.5 ? 
        ethiopianData.maleNames[Math.floor(Math.random() * ethiopianData.maleNames.length)] :
        ethiopianData.femaleNames[Math.floor(Math.random() * ethiopianData.femaleNames.length)];
      const lastName = ethiopianData.lastNames[Math.floor(Math.random() * ethiopianData.lastNames.length)];
      
      const customer = await prisma.user.create({
        data: {
          username: `customer_${firstName.toLowerCase()}_${i}_${timestamp}`,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i}.${timestamp}@email.com`,
          password: await bcrypt.hash('password123', 12),
          firstName,
          lastName,
          phoneNumber: `+2519${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
          userType: UserType.CUSTOMER,
        },
      });
      customers.push(customer);
    }

    // 3. Create garage admins and garages
    const garages = [];
    for (let i = 0; i < 8; i++) {
      const city = ethiopianData.cities[i];
      const firstName = ethiopianData.maleNames[Math.floor(Math.random() * ethiopianData.maleNames.length)];
      const lastName = ethiopianData.lastNames[Math.floor(Math.random() * ethiopianData.lastNames.length)];

      const garageAdmin = await prisma.user.create({
        data: {
          username: `garage_admin_${i}_${timestamp}`,
          email: `admin.${ethiopianData.garageNames[i].toLowerCase().replace(/\s+/g, '')}.${timestamp}@garage.com`,
          password: await bcrypt.hash('garage123', 12),
          firstName,
          lastName,
          phoneNumber: `+2519${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
          userType: UserType.GARAGE_ADMIN,
        },
      });

      const garage = await prisma.garage.create({
        data: {
          garageName: `${ethiopianData.garageNames[i]} - ${city.name}`,
          adminId: garageAdmin.id,
          latitude: city.lat + (Math.random() - 0.5) * 0.1,
          longitude: city.lng + (Math.random() - 0.5) * 0.1,
          rating: 3.5 + Math.random() * 1.5,
          approved: true,
          available: true,
        },
      });
      garages.push(garage);
    }

    // 4. Create mechanics
    const mechanics = [];
    for (let i = 0; i < 20; i++) {
      const firstName = ethiopianData.maleNames[Math.floor(Math.random() * ethiopianData.maleNames.length)];
      const lastName = ethiopianData.lastNames[Math.floor(Math.random() * ethiopianData.lastNames.length)];

      const mechanicUser = await prisma.user.create({
        data: {
          username: `mechanic_${firstName.toLowerCase()}_${i}_${timestamp}`,
          email: `${firstName.toLowerCase()}.mechanic.${i}.${timestamp}@garage.com`,
          password: await bcrypt.hash('mechanic123', 12),
          firstName,
          lastName,
          phoneNumber: `+2519${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
          userType: UserType.MECHANIC,
        },
      });

      const mechanic = await prisma.mechanic.create({
        data: {
          userId: mechanicUser.id,
          garageId: garages[Math.floor(Math.random() * garages.length)].id,
          approved: true,
        },
      });
      mechanics.push({ user: mechanicUser, mechanic });
    }

    // 5. Create comprehensive services
    const services = [];
    const servicesList = [
      { name: 'General Inspection (Tekita)', price: 200.0 },
      { name: 'Oil Change Service (Zeit Melewat)', price: 450.0 },
      { name: 'Brake System Repair (Brake Sera)', price: 1200.0 },
      { name: 'Tire Replacement (Goma Melewat)', price: 800.0 },
      { name: 'Engine Diagnostic (Makina Kitat)', price: 350.0 },
      { name: 'Battery Replacement (Battery Melewat)', price: 1500.0 },
      { name: 'Transmission Service (Transmission Sera)', price: 2200.0 },
      { name: 'Air Conditioning Repair (AC Sera)', price: 900.0 },
      { name: 'Suspension Repair (Suspension Sera)', price: 1800.0 },
      { name: 'Electrical System Repair (Electric Sera)', price: 650.0 },
      { name: 'Exhaust System Repair (Exhaust Sera)', price: 750.0 },
      { name: 'Clutch Repair (Clutch Sera)', price: 1600.0 },
      { name: 'Radiator Service (Radiator Sera)', price: 550.0 },
      { name: 'Fuel System Cleaning (Benzin Sera)', price: 400.0 },
      { name: 'Wheel Alignment (Wheel Alignment)', price: 300.0 },
    ];

    const adminUser = await prisma.user.findFirst({
      where: { userType: UserType.SYSTEM_ADMIN }
    });

    for (const serviceItem of servicesList) {
      const service = await prisma.service.create({
        data: {
          serviceName: serviceItem.name,
          estimatedPrice: serviceItem.price,
          createdBy: adminUser?.id || 1,
        },
      });
      services.push(service);

      // Assign services to garages randomly
      for (const garage of garages) {
        if (Math.random() > 0.3) { // 70% chance to have each service
          await prisma.garageService.create({
            data: {
              garageId: garage.id,
              serviceId: service.id,
              available: Math.random() > 0.1, // 90% available
            },
          });
        }
      }
    }

    // 6. Create vehicles for customers
    const vehicles = [];
    const allCustomers = [demoUser, ...customers];
    
    for (const customer of allCustomers) {
      if (!customer) continue;
      const numVehicles = Math.floor(Math.random() * 3) + 1; // 1-3 vehicles per customer
      
      for (let v = 0; v < numVehicles; v++) {
        const city = ethiopianData.cities[Math.floor(Math.random() * ethiopianData.cities.length)];
        const plateNumber = String(Math.floor(Math.random() * 90000) + 10000);
        
        const vehicle = await prisma.vehicle.create({
          data: {
            customerId: customer.id,
            vehicleType: ethiopianData.vehicleTypes[Math.floor(Math.random() * ethiopianData.vehicleTypes.length)],
            plateNumber,
            plateCode: city.code,
            countryCode: 'ET',
            color: ['White', 'Silver', 'Black', 'Blue', 'Red', 'Green'][Math.floor(Math.random() * 6)],
          },
        });
        vehicles.push(vehicle);
      }
    }

    // 7. Create service requests with various statuses
    const serviceRequests = [];
    for (let i = 0; i < 50; i++) {
      const customer = allCustomers[Math.floor(Math.random() * allCustomers.length)];
      if (!customer) continue;
      const customerVehicles = vehicles.filter(v => v.customerId === customer.id);
      if (customerVehicles.length === 0) continue;

      const vehicle = customerVehicles[Math.floor(Math.random() * customerVehicles.length)];
      const garage = garages[Math.floor(Math.random() * garages.length)];
      const mechanic = mechanics.find(m => m.mechanic.garageId === garage.id);
      
      const statuses = [ServiceStatus.PENDING, ServiceStatus.ACCEPTED, ServiceStatus.IN_PROGRESS, ServiceStatus.COMPLETED];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      const city = ethiopianData.cities[Math.floor(Math.random() * ethiopianData.cities.length)];
      
      const serviceRequest = await prisma.serviceRequest.create({
        data: {
          customerId: customer.id,
          garageId: garage.id,
          mechanicId: status !== ServiceStatus.PENDING ? mechanic?.user.id : null,
          vehicleId: vehicle.id,
          latitude: city.lat + (Math.random() - 0.5) * 0.05,
          longitude: city.lng + (Math.random() - 0.5) * 0.05,
          status,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      });
      serviceRequests.push(serviceRequest);
    }

    // 8. Create vehicle status updates
    for (const request of serviceRequests.slice(0, 30)) {
      if (request.mechanicId) {
        for (let s = 0; s < Math.floor(Math.random() * 4) + 1; s++) {
          const statusUpdates = [
            'Vehicle received and initial inspection completed',
            'Issue diagnosed - brake pads need replacement',
            'Parts ordered and work in progress',
            'Service completed and vehicle ready for pickup',
            'Quality check passed - vehicle delivered'
          ];
          
          await prisma.vehicleStatus.create({
            data: {
              serviceRequestId: request.id,
              mechanicId: request.mechanicId,
              description: statusUpdates[s] || `Update ${s + 1}: Work in progress`,
              approved: Math.random() > 0.2, // 80% approved
              createdAt: new Date(request.createdAt.getTime() + s * 24 * 60 * 60 * 1000),
            },
          });
        }
      }
    }

    // 9. Create payments and invoices
    const paymentMethods = [PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.MOBILE_MONEY, PaymentMethod.BANK_TRANSFER];
    
    for (const request of serviceRequests.filter(r => r.status === ServiceStatus.COMPLETED)) {
      const amount = 500 + Math.random() * 2000; // 500-2500 Birr
      
      const payment = await prisma.payment.create({
        data: {
          customerId: request.customerId,
          garageId: request.garageId,
          serviceRequestId: request.id,
          amount,
          paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
          status: Math.random() > 0.1 ? PaymentStatus.COMPLETED : PaymentStatus.PENDING,
          transactionId: `TXN_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
          paymentDate: new Date(request.createdAt.getTime() + 2 * 24 * 60 * 60 * 1000),
          notes: 'Payment for automotive service',
        },
      });

      // Create invoice
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
      
      await prisma.invoice.create({
        data: {
          paymentId: payment.id,
          invoiceNumber,
          customerId: request.customerId,
          garageId: request.garageId,
          serviceRequestId: request.id,
          subtotal: amount * 0.85,
          taxAmount: amount * 0.15,
          totalAmount: amount,
          status: payment.status === PaymentStatus.COMPLETED ? 'paid' : 'unpaid',
          paidDate: payment.status === PaymentStatus.COMPLETED ? payment.paymentDate : null,
        },
      });
    }

    // 10. Create ratings and feedback
    for (const request of serviceRequests.filter(r => r.status === ServiceStatus.COMPLETED).slice(0, 25)) {
      const rating = Math.floor(Math.random() * 8) + 3; // 3-10 rating
      const comments = [
        'Excellent service, very professional',
        'Good work but took longer than expected',
        'Satisfied with the quality of service',
        'Mechanic was knowledgeable and helpful',
        'Fair pricing and good customer service',
        'Will definitely come back for future services'
      ];

      await prisma.rating.create({
        data: {
          customerId: request.customerId,
          garageId: request.garageId,
          mechanicId: request.mechanicId,
          rating,
          comment: Math.random() > 0.3 ? comments[Math.floor(Math.random() * comments.length)] : null,
          createdAt: new Date(request.createdAt.getTime() + 3 * 24 * 60 * 60 * 1000),
        },
      });
    }

    // 11. Create notifications
    for (let i = 0; i < 100; i++) {
      const sender = allCustomers[Math.floor(Math.random() * allCustomers.length)];
      const receiver = allCustomers[Math.floor(Math.random() * allCustomers.length)];
      
      if (sender.id === receiver.id) continue;

      const notificationTypes = [
        { type: 'service_update', title: 'Service Update', message: 'Your vehicle service has been updated' },
        { type: 'payment_completed', title: 'Payment Confirmed', message: 'Your payment has been processed successfully' },
        { type: 'service_completed', title: 'Service Ready', message: 'Your vehicle is ready for pickup' },
        { type: 'new_request', title: 'New Service Request', message: 'You have received a new service request' },
      ];

      const notification = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
      
      await prisma.notification.create({
        data: {
          senderId: sender.id,
          receiverId: receiver.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          read: Math.random() > 0.4, // 60% read
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      });
    }

    // 12. Create applications (for demonstration)
    for (let i = 0; i < 10; i++) {
      const applicant = customers[Math.floor(Math.random() * customers.length)];
      const isGarageApp = Math.random() > 0.5;
      
      await prisma.application.create({
        data: {
          applicantId: applicant.id,
          applicationType: isGarageApp ? ApplicationType.GARAGE : ApplicationType.MECHANIC,
          garageId: !isGarageApp ? garages[Math.floor(Math.random() * garages.length)].id : null,
          approved: Math.random() > 0.3 ? true : null, // 70% approved, 30% pending
          createdAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000), // Last 14 days
        },
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Comprehensive Ethiopian demo data created successfully!',
      data: {
        demoUser: { username: 'user', password: 'JJasdkjfas123123...?' },
        customersCreated: customers.length + 1,
        garagesCreated: garages.length,
        mechanicsCreated: mechanics.length,
        servicesCreated: services.length,
        vehiclesCreated: vehicles.length,
        serviceRequestsCreated: serviceRequests.length,
        paymentsCreated: serviceRequests.filter(r => r.status === ServiceStatus.COMPLETED).length,
        ratingsCreated: 25,
        notificationsCreated: 100,
        applicationsCreated: 10,
      }
    });

  } catch (error) {
    console.error('Demo data creation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ 
      error: `Demo data creation failed: ${errorMessage}`,
      details: error 
    }, { status: 500 });
  }
}