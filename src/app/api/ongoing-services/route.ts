import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import type { ApiResponse, OngoingServiceData, OngoingService } from '@/types/auth';
import { createNotification, NOTIFICATION_TYPES, NOTIFICATION_TEMPLATES } from '@/utils/notifications';

interface JwtPayload {
  id: number;
  username: string;
  email: string;
  userType: string;
}

function getTokenFromRequest(request: NextRequest): string | null {
  const tokenFromCookie = request.cookies.get('auth-token')?.value;
  if (tokenFromCookie) return tokenFromCookie;

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

// GET - Get ongoing services for a vehicle status
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    
    if (!token) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Authentication required' 
        },
        { status: 401 }
      );
    }

    // Verify and decode JWT token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as JwtPayload;
    } catch {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Invalid token' 
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const statusId = searchParams.get('status_id');

    if (!statusId) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Status ID is required' 
        },
        { status: 400 }
      );
    }

    const vehicleStatusId = parseInt(statusId);
    if (isNaN(vehicleStatusId)) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Invalid status ID' 
        },
        { status: 400 }
      );
    }

    // Verify access to the vehicle status
    const vehicleStatus = await prisma.vehicleStatus.findUnique({
      where: { id: vehicleStatusId },
      include: {
        serviceRequest: {
          include: {
            garage: {
              select: {
                adminId: true
              }
            }
          }
        }
      }
    });

    if (!vehicleStatus) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Vehicle status not found' 
        },
        { status: 404 }
      );
    }

    // Check access permissions
    let hasAccess = false;

    if (decoded.userType === 'CUSTOMER' && vehicleStatus.serviceRequest.customerId === decoded.id) {
      hasAccess = true;
    } else if (decoded.userType === 'MECHANIC') {
      // Check if mechanic is assigned or belongs to the garage
      const mechanic = await prisma.mechanic.findUnique({
        where: { userId: decoded.id },
        select: { garageId: true, approved: true }
      });

      if (mechanic && mechanic.approved && 
          (mechanic.garageId === vehicleStatus.serviceRequest.garageId || 
           vehicleStatus.serviceRequest.mechanicId === decoded.id)) {
        hasAccess = true;
      }
    } else if (decoded.userType === 'GARAGE_ADMIN' && 
               vehicleStatus.serviceRequest.garage.adminId === decoded.id) {
      hasAccess = true;
    } else if (decoded.userType === 'SYSTEM_ADMIN') {
      hasAccess = true;
    }

    if (!hasAccess) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Access denied' 
        },
        { status: 403 }
      );
    }

    // Get ongoing services
    const ongoingServices = await prisma.ongoingService.findMany({
      where: { statusId: vehicleStatusId },
      include: {
        service: {
          select: {
            id: true,
            serviceName: true,
            estimatedPrice: true,
          }
        }
      },
      orderBy: {
        expectedDate: 'asc'
      }
    });

    const processedServices = ongoingServices.map(service => ({
      ...service,
      expectedDate: service.expectedDate.toISOString()
    }));

    return NextResponse.json<ApiResponse<{ services: OngoingService[] }>>(
      {
        success: true,
        data: { services: processedServices }
      }
    );

  } catch (error) {
    console.error('Get ongoing services error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// POST - Add ongoing service to a vehicle status (MECHANIC only)
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    
    if (!token) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Authentication required' 
        },
        { status: 401 }
      );
    }

    // Verify and decode JWT token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as JwtPayload;
    } catch {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Invalid token' 
        },
        { status: 401 }
      );
    }

    // Only mechanics can add ongoing services
    if (decoded.userType !== 'MECHANIC') {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Only mechanics can add ongoing services' 
        },
        { status: 403 }
      );
    }

    const body: OngoingServiceData = await request.json();
    const { statusId, serviceId, expectedDate, totalPrice } = body;

    // Validate required fields
    if (!statusId || !serviceId || !expectedDate || totalPrice === undefined) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Status ID, service ID, expected date, and total price are required' 
        },
        { status: 400 }
      );
    }

    if (totalPrice < 0) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Total price cannot be negative' 
        },
        { status: 400 }
      );
    }

    // Validate expected date
    const expectedDateObj = new Date(expectedDate);
    if (isNaN(expectedDateObj.getTime())) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Invalid expected date format' 
        },
        { status: 400 }
      );
    }

    // Verify the vehicle status exists and mechanic has access
    const vehicleStatus = await prisma.vehicleStatus.findUnique({
      where: { id: statusId },
      include: {
        serviceRequest: {
          select: {
            mechanicId: true,
            customerId: true,
            status: true
          }
        }
      }
    });

    if (!vehicleStatus) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Vehicle status not found' 
        },
        { status: 404 }
      );
    }

    // Check if mechanic is assigned to this service request
    if (vehicleStatus.serviceRequest.mechanicId !== decoded.id) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'You are not assigned to this service request' 
        },
        { status: 403 }
      );
    }

    // Verify the service exists and is available
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { 
        id: true, 
        serviceName: true, 
        estimatedPrice: true, 
        removed: true 
      }
    });

    if (!service || service.removed) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Service not found or not available' 
        },
        { status: 404 }
      );
    }

    // Check if service is already added to this status
    const existingService = await prisma.ongoingService.findFirst({
      where: {
        statusId: statusId,
        serviceId: serviceId
      }
    });

    if (existingService) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Service is already added to this status update' 
        },
        { status: 409 }
      );
    }

    // Create the ongoing service
    const ongoingService = await prisma.ongoingService.create({
      data: {
        statusId,
        serviceId,
        expectedDate: expectedDateObj,
        totalPrice,
        serviceFinished: false
      },
      include: {
        service: {
          select: {
            id: true,
            serviceName: true,
            estimatedPrice: true,
          }
        }
      }
    });

    // Create notification for customer using standardized template
    const template = NOTIFICATION_TEMPLATES[NOTIFICATION_TYPES.SERVICE_STARTED].toCustomer(service.serviceName);
    
    await createNotification(
      decoded.id,
      vehicleStatus.serviceRequest.customerId,
      NOTIFICATION_TYPES.SERVICE_STARTED,
      template.title,
      template.message
    );

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'Ongoing service added successfully',
        data: { 
          service: {
            ...ongoingService,
            expectedDate: ongoingService.expectedDate.toISOString()
          }
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Ongoing service creation error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}