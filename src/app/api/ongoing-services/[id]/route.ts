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

// PATCH - Update ongoing service status (MECHANIC only)
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

    // Only mechanics can update ongoing services
    if (decoded.userType !== 'MECHANIC') {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Only mechanics can update ongoing services' 
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { serviceFinished, totalPrice } = body;

    if (typeof serviceFinished !== 'boolean') {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Service finished status must be a boolean' 
        },
        { status: 400 }
      );
    }

    // Validate total price if provided
    if (totalPrice !== undefined && (typeof totalPrice !== 'number' || totalPrice < 0)) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Total price must be a non-negative number' 
        },
        { status: 400 }
      );
    }

    // Get the ongoing service and verify access
    const ongoingService = await prisma.ongoingService.findUnique({
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

    if (!ongoingService) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Ongoing service not found' 
        },
        { status: 404 }
      );
    }

    // Check if mechanic is assigned to this service request
    if (ongoingService.status.serviceRequest.mechanicId !== decoded.id) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'You are not assigned to this service request' 
        },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: { serviceFinished: boolean; totalPrice?: number } = { serviceFinished };
    if (totalPrice !== undefined) {
      updateData.totalPrice = totalPrice;
    }

    // Update the ongoing service
    const updatedService = await prisma.ongoingService.update({
      where: { id: serviceId },
      data: updateData,
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

    // Create notification for customer if service is finished using standardized template
    if (serviceFinished) {
      const template = NOTIFICATION_TEMPLATES[NOTIFICATION_TYPES.SERVICE_FINISHED].toCustomer(ongoingService.service.serviceName);
      
      await createNotification(
        decoded.id,
        ongoingService.status.serviceRequest.customerId,
        NOTIFICATION_TYPES.SERVICE_FINISHED,
        template.title,
        template.message
      );
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: `Ongoing service ${serviceFinished ? 'completed' : 'updated'} successfully`,
        data: { 
          service: {
            ...updatedService,
            expectedDate: updatedService.expectedDate.toISOString()
          }
        }
      }
    );

  } catch (error) {
    console.error('Update ongoing service error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// DELETE - Remove ongoing service (MECHANIC only)
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

    // Only mechanics can delete ongoing services
    if (decoded.userType !== 'MECHANIC') {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Only mechanics can remove ongoing services' 
        },
        { status: 403 }
      );
    }

    // Get the ongoing service and verify access
    const ongoingService = await prisma.ongoingService.findUnique({
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

    if (!ongoingService) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Ongoing service not found' 
        },
        { status: 404 }
      );
    }

    // Check if mechanic is assigned to this service request
    if (ongoingService.status.serviceRequest.mechanicId !== decoded.id) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'You are not assigned to this service request' 
        },
        { status: 403 }
      );
    }

    // Cannot delete if service is already finished
    if (ongoingService.serviceFinished) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Cannot remove completed services' 
        },
        { status: 400 }
      );
    }

    // Delete the ongoing service
    await prisma.ongoingService.delete({
      where: { id: serviceId }
    });

    // Create notification for customer
    await prisma.notification.create({
      data: {
        senderId: decoded.id,
        receiverId: ongoingService.status.serviceRequest.customerId,
        type: 'SERVICE_REMOVED',
        title: 'Service Removed',
        message: `The service "${ongoingService.service.serviceName}" has been removed from your vehicle service.`,
      }
    });

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'Ongoing service removed successfully'
      }
    );

  } catch (error) {
    console.error('Delete ongoing service error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}