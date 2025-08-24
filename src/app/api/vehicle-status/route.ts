import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import type { ApiResponse, VehicleStatusData, VehicleStatus } from '@/types/auth';
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

// GET - Get vehicle status updates for a service request
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
    const serviceRequestId = searchParams.get('service_request_id');

    if (!serviceRequestId) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Service request ID is required' 
        },
        { status: 400 }
      );
    }

    const requestId = parseInt(serviceRequestId);
    if (isNaN(requestId)) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Invalid service request ID' 
        },
        { status: 400 }
      );
    }

    // Verify access to the service request
    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: {
        garage: {
          select: {
            adminId: true
          }
        }
      }
    });

    if (!serviceRequest) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Service request not found' 
        },
        { status: 404 }
      );
    }

    // Check access permissions
    let hasAccess = false;

    if (decoded.userType === 'CUSTOMER' && serviceRequest.customerId === decoded.id) {
      hasAccess = true;
    } else if (decoded.userType === 'MECHANIC') {
      // Check if mechanic is assigned or belongs to the garage
      const mechanic = await prisma.mechanic.findUnique({
        where: { userId: decoded.id },
        select: { garageId: true, approved: true }
      });

      if (mechanic && mechanic.approved && 
          (mechanic.garageId === serviceRequest.garageId || 
           serviceRequest.mechanicId === decoded.id)) {
        hasAccess = true;
      }
    } else if (decoded.userType === 'GARAGE_ADMIN' && 
               serviceRequest.garage.adminId === decoded.id) {
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

    // Get vehicle status updates
    const vehicleStatuses = await prisma.vehicleStatus.findMany({
      where: { serviceRequestId: requestId },
      include: {
        mechanic: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          }
        },
        ongoingServices: {
          include: {
            service: {
              select: {
                id: true,
                serviceName: true,
                estimatedPrice: true,
              }
            }
          }
        },
        additionalServices: {
          include: {
            service: {
              select: {
                id: true,
                serviceName: true,
                estimatedPrice: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const processedStatuses = vehicleStatuses.map(status => ({
      ...status,
      createdAt: status.createdAt.toISOString(),
      ongoingServices: status.ongoingServices.map(service => ({
        ...service,
        expectedDate: service.expectedDate.toISOString()
      }))
    }));

    return NextResponse.json<ApiResponse<{ statuses: VehicleStatus[] }>>(
      {
        success: true,
        data: { statuses: processedStatuses }
      }
    );

  } catch (error) {
    console.error('Get vehicle status error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// POST - Create a vehicle status update (MECHANIC only)
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

    // Only mechanics can create vehicle status updates
    if (decoded.userType !== 'MECHANIC') {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Only mechanics can create vehicle status updates' 
        },
        { status: 403 }
      );
    }

    const body: VehicleStatusData = await request.json();
    const { serviceRequestId, description } = body;

    // Validate required fields
    if (!serviceRequestId || !description?.trim()) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Service request ID and description are required' 
        },
        { status: 400 }
      );
    }

    // Verify the service request exists and mechanic has access
    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    if (!serviceRequest) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Service request not found' 
        },
        { status: 404 }
      );
    }

    // Check if mechanic is assigned to this request
    if (serviceRequest.mechanicId !== decoded.id) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'You are not assigned to this service request' 
        },
        { status: 403 }
      );
    }

    // Check if the service request is in a valid state for updates
    if (!['ACCEPTED', 'IN_PROGRESS'].includes(serviceRequest.status)) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Service request must be accepted or in progress to add status updates' 
        },
        { status: 400 }
      );
    }

    // Create the vehicle status update
    const vehicleStatus = await prisma.vehicleStatus.create({
      data: {
        serviceRequestId,
        mechanicId: decoded.id,
        description: description.trim(),
        approved: false // Requires customer approval
      },
      include: {
        mechanic: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          }
        },
        ongoingServices: {
          include: {
            service: {
              select: {
                id: true,
                serviceName: true,
                estimatedPrice: true,
              }
            }
          }
        },
        additionalServices: {
          include: {
            service: {
              select: {
                id: true,
                serviceName: true,
                estimatedPrice: true,
              }
            }
          }
        }
      }
    });

    // Create notification for customer using standardized template
    const mechanicName = `${vehicleStatus.mechanic.firstName} ${vehicleStatus.mechanic.lastName}`;
    const template = NOTIFICATION_TEMPLATES[NOTIFICATION_TYPES.STATUS_UPDATE].toCustomer(mechanicName, description.trim());
    
    await createNotification(
      decoded.id,
      serviceRequest.customerId,
      NOTIFICATION_TYPES.STATUS_UPDATE,
      template.title,
      template.message
    );

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'Vehicle status update created successfully',
        data: { 
          status: {
            ...vehicleStatus,
            createdAt: vehicleStatus.createdAt.toISOString(),
            ongoingServices: vehicleStatus.ongoingServices.map(service => ({
              ...service,
              expectedDate: service.expectedDate.toISOString()
            }))
          }
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Vehicle status creation error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}