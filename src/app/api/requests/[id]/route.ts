import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import type { ApiResponse, ServiceRequestStatusUpdate } from '@/types/auth';

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

// GET - Get specific service request
export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const requestId = parseInt(id);
    
    if (isNaN(requestId)) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Invalid request ID' 
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

    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          }
        },
        garage: {
          select: {
            id: true,
            garageName: true,
            latitude: true,
            longitude: true,
          }
        },
        mechanic: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          }
        },
        vehicle: {
          select: {
            id: true,
            vehicleType: true,
            plateNumber: true,
            plateCode: true,
            countryCode: true,
            color: true,
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
    } else if (decoded.userType === 'GARAGE_ADMIN') {
      // Check if admin owns the garage
      const garage = await prisma.garage.findUnique({
        where: { 
          id: serviceRequest.garageId,
          adminId: decoded.id 
        }
      });

      if (garage) {
        hasAccess = true;
      }
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

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: { 
          request: {
            ...serviceRequest,
            createdAt: serviceRequest.createdAt.toISOString()
          }
        }
      }
    );

  } catch (error) {
    console.error('Get service request error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// PATCH - Update service request status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const requestId = parseInt(id);
    
    if (isNaN(requestId)) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Invalid request ID' 
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

    const body: ServiceRequestStatusUpdate = await request.json();
    const { status, mechanicId } = body;

    // Validate status
    const validStatuses = ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Invalid status' 
        },
        { status: 400 }
      );
    }

    // Get the current service request
    const currentRequest = await prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: {
        garage: {
          select: {
            adminId: true
          }
        }
      }
    });

    if (!currentRequest) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Service request not found' 
        },
        { status: 404 }
      );
    }

    // Check permissions for status updates
    let canUpdate = false;

    if (decoded.userType === 'CUSTOMER' && currentRequest.customerId === decoded.id) {
      // Customers can only cancel their own requests
      canUpdate = status === 'CANCELLED';
    } else if (decoded.userType === 'MECHANIC') {
      // Mechanics can accept requests from their garage and update assigned requests
      const mechanic = await prisma.mechanic.findUnique({
        where: { userId: decoded.id },
        select: { garageId: true, approved: true }
      });

      if (mechanic && mechanic.approved) {
        if (mechanic.garageId === currentRequest.garageId) {
          // Can accept requests from their garage
          if (status === 'ACCEPTED' && currentRequest.status === 'PENDING') {
            canUpdate = true;
          }
        }
        
        if (currentRequest.mechanicId === decoded.id) {
          // Can update their assigned requests
          canUpdate = true;
        }
      }
    } else if (decoded.userType === 'GARAGE_ADMIN' && 
               currentRequest.garage.adminId === decoded.id) {
      // Garage admins can update requests for their garage
      canUpdate = true;
    } else if (decoded.userType === 'SYSTEM_ADMIN') {
      canUpdate = true;
    }

    if (!canUpdate) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Permission denied for this status update' 
        },
        { status: 403 }
      );
    }

    // Validate status transitions
    const currentStatus = currentRequest.status;
    const validTransitions: Record<string, string[]> = {
      PENDING: ['ACCEPTED', 'CANCELLED'],
      ACCEPTED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: []
    };

    if (!validTransitions[currentStatus].includes(status)) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: `Cannot change status from ${currentStatus} to ${status}` 
        },
        { status: 400 }
      );
    }

    // Prepare update data based on status
    let mechanicToAssign: number | undefined;
    
    if (status === 'ACCEPTED') {
      if (decoded.userType === 'MECHANIC') {
        // Auto-assign the mechanic who accepts the request
        mechanicToAssign = decoded.id;
      } else if (mechanicId) {
        // Verify the mechanic exists and belongs to the garage
        const mechanic = await prisma.mechanic.findUnique({
          where: {
            userId: mechanicId,
            garageId: currentRequest.garageId,
            approved: true,
            removed: false
          }
        });

        if (!mechanic) {
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: 'Invalid mechanic assignment'
            },
            { status: 400 }
          );
        }

        mechanicToAssign = mechanicId;
      } else {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Mechanic assignment required for accepting request'
          },
          { status: 400 }
        );
      }
    }

    // Update the service request
    const updatedRequest = await prisma.serviceRequest.update({
      where: { id: requestId },
      data: mechanicToAssign ? { status, mechanicId: mechanicToAssign } : { status },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          }
        },
        garage: {
          select: {
            id: true,
            garageName: true,
            latitude: true,
            longitude: true,
          }
        },
        mechanic: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          }
        },
        vehicle: {
          select: {
            id: true,
            vehicleType: true,
            plateNumber: true,
            plateCode: true,
            countryCode: true,
            color: true,
          }
        }
      }
    });

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: `Service request status updated to ${status}`,
        data: { 
          request: {
            ...updatedRequest,
            createdAt: updatedRequest.createdAt.toISOString()
          }
        }
      }
    );

  } catch (error) {
    console.error('Update service request error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}