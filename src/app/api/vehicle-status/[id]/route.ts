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

function getTokenFromRequest(request: NextRequest): string | null {
  const tokenFromCookie = request.cookies.get('auth-token')?.value;
  if (tokenFromCookie) return tokenFromCookie;

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

// PATCH - Approve/disapprove vehicle status update (CUSTOMER only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const statusId = parseInt(id);
    
    if (isNaN(statusId)) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Invalid status ID' 
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

    // Get the vehicle status and verify access
    const vehicleStatus = await prisma.vehicleStatus.findUnique({
      where: { id: statusId },
      include: {
        serviceRequest: {
          select: {
            customerId: true,
            mechanicId: true,
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

    // Check permissions - only customer can approve/disapprove their own service status
    let canUpdate = false;

    if (decoded.userType === 'CUSTOMER' && vehicleStatus.serviceRequest.customerId === decoded.id) {
      canUpdate = true;
    } else if (decoded.userType === 'GARAGE_ADMIN' && vehicleStatus.serviceRequest.garage.adminId === decoded.id) {
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

    // Update the vehicle status
    const updatedStatus = await prisma.vehicleStatus.update({
      where: { id: statusId },
      data: { approved },
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

    // Create notification for mechanic about approval/disapproval
    if (vehicleStatus.serviceRequest.mechanicId) {
      await prisma.notification.create({
        data: {
          senderId: decoded.id,
          receiverId: vehicleStatus.serviceRequest.mechanicId,
          type: 'STATUS_APPROVAL',
          title: `Status Update ${approved ? 'Approved' : 'Rejected'}`,
          message: `Your status update has been ${approved ? 'approved' : 'rejected'} by the customer.`,
        }
      });
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: `Status update ${approved ? 'approved' : 'rejected'} successfully`,
        data: { 
          status: {
            ...updatedStatus,
            createdAt: updatedStatus.createdAt.toISOString(),
            ongoingServices: updatedStatus.ongoingServices.map(service => ({
              ...service,
              expectedDate: service.expectedDate.toISOString()
            }))
          }
        }
      }
    );

  } catch (error) {
    console.error('Update vehicle status error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}