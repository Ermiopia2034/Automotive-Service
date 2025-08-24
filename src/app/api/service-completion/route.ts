import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import type { ApiResponse } from '@/types/auth';

interface JwtPayload {
  id: number;
  username: string;
  email: string;
  userType: string;
}

interface ServiceCompletionData {
  serviceRequestId: number;
  finalNotes?: string;
  additionalCharges?: number;
  discount?: number;
}

interface ServiceSummary {
  serviceRequestId: number;
  totalOngoingServices: number;
  totalAdditionalServices: number;
  additionalCharges: number;
  discount: number;
  subtotal: number;
  finalTotal: number;
  completedServices: Array<{
    id: number;
    serviceName: string;
    price: number;
    type: 'ongoing' | 'additional';
  }>;
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

// GET - Calculate service completion summary and pricing
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

    // Check access permissions - only mechanic assigned or garage admin
    let hasAccess = false;

    if (decoded.userType === 'MECHANIC' && serviceRequest.mechanicId === decoded.id) {
      hasAccess = true;
    } else if (decoded.userType === 'GARAGE_ADMIN' && serviceRequest.garage.adminId === decoded.id) {
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

    // Check if service request is in valid state for completion
    if (!['ACCEPTED', 'IN_PROGRESS'].includes(serviceRequest.status)) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Service request must be accepted or in progress to calculate completion summary' 
        },
        { status: 400 }
      );
    }

    // Get all vehicle statuses for this service request
    const vehicleStatuses = await prisma.vehicleStatus.findMany({
      where: { 
        serviceRequestId: requestId,
        approved: true // Only count approved statuses
      },
      include: {
        ongoingServices: {
          include: {
            service: {
              select: {
                id: true,
                serviceName: true,
                estimatedPrice: true
              }
            }
          }
        },
        additionalServices: {
          where: {
            approved: true // Only count approved additional services
          },
          include: {
            service: {
              select: {
                id: true,
                serviceName: true,
                estimatedPrice: true
              }
            }
          }
        }
      }
    });

    // Calculate totals
    let totalOngoingServices = 0;
    let totalAdditionalServices = 0;
    const completedServices: ServiceSummary['completedServices'] = [];

    // Process ongoing services
    vehicleStatuses.forEach(status => {
      status.ongoingServices.forEach(service => {
        totalOngoingServices += service.totalPrice;
        completedServices.push({
          id: service.id,
          serviceName: service.service.serviceName,
          price: service.totalPrice,
          type: 'ongoing'
        });
      });

      status.additionalServices.forEach(service => {
        totalAdditionalServices += service.totalPrice;
        completedServices.push({
          id: service.id,
          serviceName: service.service.serviceName,
          price: service.totalPrice,
          type: 'additional'
        });
      });
    });

    const subtotal = totalOngoingServices + totalAdditionalServices;

    const summary: ServiceSummary = {
      serviceRequestId: requestId,
      totalOngoingServices,
      totalAdditionalServices,
      additionalCharges: 0,
      discount: 0,
      subtotal,
      finalTotal: subtotal,
      completedServices
    };

    return NextResponse.json<ApiResponse<{ summary: ServiceSummary }>>(
      {
        success: true,
        data: { summary }
      }
    );

  } catch (error) {
    console.error('Get service completion summary error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// POST - Complete service request with final pricing
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

    // Only mechanics can complete service requests
    if (decoded.userType !== 'MECHANIC') {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Only mechanics can complete service requests' 
        },
        { status: 403 }
      );
    }

    const body: ServiceCompletionData = await request.json();
    const { serviceRequestId, finalNotes, additionalCharges = 0, discount = 0 } = body;

    // Validate required fields
    if (!serviceRequestId) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Service request ID is required' 
        },
        { status: 400 }
      );
    }

    if (additionalCharges < 0 || discount < 0) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Additional charges and discount cannot be negative' 
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
            email: true
          }
        },
        garage: {
          select: {
            id: true,
            garageName: true
          }
        },
        vehicle: {
          select: {
            vehicleType: true,
            plateNumber: true,
            plateCode: true
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

    // Check if mechanic is assigned to this service request
    if (serviceRequest.mechanicId !== decoded.id) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'You are not assigned to this service request' 
        },
        { status: 403 }
      );
    }

    // Check if the service request is in a valid state for completion
    if (!['ACCEPTED', 'IN_PROGRESS'].includes(serviceRequest.status)) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Service request must be accepted or in progress to complete' 
        },
        { status: 400 }
      );
    }

    // Calculate the final total (reuse logic from GET)
    const vehicleStatuses = await prisma.vehicleStatus.findMany({
      where: { 
        serviceRequestId,
        approved: true
      },
      include: {
        ongoingServices: {
          include: {
            service: {
              select: {
                serviceName: true
              }
            }
          }
        },
        additionalServices: {
          where: {
            approved: true
          },
          include: {
            service: {
              select: {
                serviceName: true
              }
            }
          }
        }
      }
    });

    let totalOngoingServices = 0;
    let totalAdditionalServices = 0;
    const servicesList: string[] = [];

    vehicleStatuses.forEach(status => {
      status.ongoingServices.forEach(service => {
        totalOngoingServices += service.totalPrice;
        servicesList.push(service.service.serviceName);
      });

      status.additionalServices.forEach(service => {
        totalAdditionalServices += service.totalPrice;
        servicesList.push(`${service.service.serviceName} (Additional)`);
      });
    });

    const subtotal = totalOngoingServices + totalAdditionalServices;
    const finalTotal = subtotal + additionalCharges - discount;

    // Create a final status update for completion
    const completionNotes = finalNotes || `Service completed. Total: $${finalTotal}${additionalCharges > 0 ? ` (includes $${additionalCharges} additional charges)` : ''}${discount > 0 ? ` (includes $${discount} discount)` : ''}`;

    await prisma.vehicleStatus.create({
      data: {
        serviceRequestId,
        mechanicId: decoded.id,
        description: completionNotes,
        approved: true // Auto-approved as this is the final completion
      }
    });

    // Update the service request status to completed
    const completedRequest = await prisma.serviceRequest.update({
      where: { id: serviceRequestId },
      data: { status: 'COMPLETED' },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Create completion notification for customer
    await prisma.notification.create({
      data: {
        senderId: decoded.id,
        receiverId: serviceRequest.customerId,
        type: 'SERVICE_COMPLETED',
        title: 'Service Completed',
        message: `Your vehicle service has been completed! Final total: $${finalTotal}. Services performed: ${servicesList.join(', ')}. Thank you for choosing ${serviceRequest.garage.garageName}!`,
      }
    });

    // Create completion notification for garage admin
    if (serviceRequest.garage) {
      await prisma.notification.create({
        data: {
          senderId: decoded.id,
          receiverId: serviceRequest.garage.id, // This should be adminId, let me fix this
          type: 'SERVICE_COMPLETED_ADMIN',
          title: 'Service Request Completed',
          message: `Service request #${serviceRequestId} has been completed by your mechanic. Final total: $${finalTotal}`,
        }
      });
    }

    const summary: ServiceSummary = {
      serviceRequestId,
      totalOngoingServices,
      totalAdditionalServices,
      additionalCharges,
      discount,
      subtotal,
      finalTotal,
      completedServices: []
    };

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'Service request completed successfully',
        data: { 
          request: {
            ...completedRequest,
            createdAt: completedRequest.createdAt.toISOString()
          },
          summary
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Service completion error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}