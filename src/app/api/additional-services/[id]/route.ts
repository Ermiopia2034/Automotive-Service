import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import type { ApiResponse } from '@/types/auth';
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

// PATCH - Approve/decline additional service (CUSTOMER only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const serviceId = parseInt(id);
    
    if (isNaN(serviceId)) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Invalid service ID' 
        },
        { status: 400 }
      );
    }

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

    const body = await request.json();
    const { approved } = body;

    if (typeof approved !== 'boolean') {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Approved status must be a boolean' 
        },
        { status: 400 }
      );
    }

    // Get the additional service and verify access
    const additionalService = await prisma.additionalService.findUnique({
      where: { id: serviceId },
      include: {
        status: {
          include: {
            serviceRequest: {
              select: {
                customerId: true,
                mechanicId: true,
                customer: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                },
                garage: {
                  select: {
                    adminId: true
                  }
                }
              }
            }
          }
        },
        service: {
          select: {
            serviceName: true
          }
        }
      }
    });

    if (!additionalService) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Additional service not found' 
        },
        { status: 404 }
      );
    }

    // Check permissions - only customer can approve/decline their own additional services
    let canUpdate = false;

    if (decoded.userType === 'CUSTOMER' && additionalService.status.serviceRequest.customerId === decoded.id) {
      canUpdate = true;
    } else if (decoded.userType === 'GARAGE_ADMIN' && additionalService.status.serviceRequest.garage.adminId === decoded.id) {
      canUpdate = true;
    } else if (decoded.userType === 'SYSTEM_ADMIN') {
      canUpdate = true;
    }

    if (!canUpdate) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Permission denied' 
        },
        { status: 403 }
      );
    }

    // Update the additional service
    const updatedService = await prisma.additionalService.update({
      where: { id: serviceId },
      data: { approved },
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

    // Create notification for mechanic about approval/decline using standardized template
    if (additionalService.status.serviceRequest.mechanicId) {
      const customerName = `${additionalService.status.serviceRequest.customer.firstName} ${additionalService.status.serviceRequest.customer.lastName}`;
      
      if (approved) {
        const template = NOTIFICATION_TEMPLATES[NOTIFICATION_TYPES.ADDITIONAL_SERVICE_APPROVED].toMechanic(additionalService.service.serviceName, customerName);
        await createNotification(
          decoded.id,
          additionalService.status.serviceRequest.mechanicId,
          NOTIFICATION_TYPES.ADDITIONAL_SERVICE_APPROVED,
          template.title,
          template.message
        );
      } else {
        const template = NOTIFICATION_TEMPLATES[NOTIFICATION_TYPES.ADDITIONAL_SERVICE_DECLINED].toMechanic(additionalService.service.serviceName, customerName);
        await createNotification(
          decoded.id,
          additionalService.status.serviceRequest.mechanicId,
          NOTIFICATION_TYPES.ADDITIONAL_SERVICE_DECLINED,
          template.title,
          template.message
        );
      }
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: `Additional service ${approved ? 'approved' : 'declined'} successfully`,
        data: { 
          service: updatedService
        }
      }
    );

  } catch (error) {
    console.error('Update additional service error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// DELETE - Remove additional service request (MECHANIC only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const serviceId = parseInt(id);
    
    if (isNaN(serviceId)) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Invalid service ID' 
        },
        { status: 400 }
      );
    }

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

    // Only mechanics can delete additional service requests
    if (decoded.userType !== 'MECHANIC') {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Only mechanics can remove additional service requests' 
        },
        { status: 403 }
      );
    }

    // Get the additional service and verify access
    const additionalService = await prisma.additionalService.findUnique({
      where: { id: serviceId },
      include: {
        status: {
          include: {
            serviceRequest: {
              select: {
                mechanicId: true,
                customerId: true
              }
            }
          }
        },
        service: {
          select: {
            serviceName: true
          }
        }
      }
    });

    if (!additionalService) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Additional service not found' 
        },
        { status: 404 }
      );
    }

    // Check if mechanic is assigned to this service request
    if (additionalService.status.serviceRequest.mechanicId !== decoded.id) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'You are not assigned to this service request' 
        },
        { status: 403 }
      );
    }

    // Cannot delete if already approved
    if (additionalService.approved) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Cannot remove approved additional services' 
        },
        { status: 400 }
      );
    }

    // Delete the additional service
    await prisma.additionalService.delete({
      where: { id: serviceId }
    });

    // Create notification for customer
    await prisma.notification.create({
      data: {
        senderId: decoded.id,
        receiverId: additionalService.status.serviceRequest.customerId,
        type: 'ADDITIONAL_SERVICE_CANCELLED',
        title: 'Additional Service Cancelled',
        message: `The additional service request for "${additionalService.service.serviceName}" has been cancelled by your mechanic.`,
      }
    });

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'Additional service request removed successfully'
      }
    );

  } catch (error) {
    console.error('Delete additional service error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}