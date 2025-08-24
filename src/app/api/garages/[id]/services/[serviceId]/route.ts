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

interface GarageServiceUpdateData {
  available?: boolean;
}

function getTokenFromRequest(request: NextRequest): string | null {
  // Try to get token from cookie first
  const tokenFromCookie = request.cookies.get('auth-token')?.value;
  if (tokenFromCookie) return tokenFromCookie;

  // Fallback to Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

// GET - Get specific garage service
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; serviceId: string }> }
) {
  try {
    const { id, serviceId: serviceIdStr } = await params;
    const garageId = parseInt(id);
    const serviceId = parseInt(serviceIdStr);

    if (isNaN(garageId) || isNaN(serviceId)) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Invalid garage ID or service ID' 
        },
        { status: 400 }
      );
    }

    const garageService = await prisma.garageService.findUnique({
      where: {
        garageId_serviceId: {
          garageId: garageId,
          serviceId: serviceId
        }
      },
      include: {
        garage: {
          select: {
            id: true,
            garageName: true,
            adminId: true,
          }
        },
        service: {
          include: {
            creator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              }
            }
          }
        }
      }
    });

    if (!garageService) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Garage service assignment not found' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: { garageService }
      }
    );

  } catch (error) {
    console.error('Get garage service error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// PATCH - Update garage service availability (GARAGE_ADMIN or SYSTEM_ADMIN)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; serviceId: string }> }
) {
  try {
    const { id, serviceId: serviceIdStr } = await params;
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

    const garageId = parseInt(id);
    const serviceId = parseInt(serviceIdStr);

    if (isNaN(garageId) || isNaN(serviceId)) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Invalid garage ID or service ID' 
        },
        { status: 400 }
      );
    }

    // Check if garage service assignment exists
    const existingAssignment = await prisma.garageService.findUnique({
      where: {
        garageId_serviceId: {
          garageId: garageId,
          serviceId: serviceId
        }
      },
      include: {
        garage: {
          select: {
            id: true,
            adminId: true,
            removed: true
          }
        }
      }
    });

    if (!existingAssignment || existingAssignment.garage.removed) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Garage service assignment not found' 
        },
        { status: 404 }
      );
    }

    // Only garage admin or system admin can update service availability
    if (decoded.userType !== 'SYSTEM_ADMIN' && 
        (decoded.userType !== 'GARAGE_ADMIN' || decoded.id !== existingAssignment.garage.adminId)) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Only garage administrators can update service availability' 
        },
        { status: 403 }
      );
    }

    const body: GarageServiceUpdateData = await request.json();
    const { available } = body;

    if (available === undefined) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Availability status is required' 
        },
        { status: 400 }
      );
    }

    // Update garage service availability
    const updatedGarageService = await prisma.garageService.update({
      where: {
        garageId_serviceId: {
          garageId: garageId,
          serviceId: serviceId
        }
      },
      data: { available },
      include: {
        garage: {
          select: {
            id: true,
            garageName: true,
          }
        },
        service: {
          include: {
            creator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              }
            }
          }
        }
      }
    });

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: `Service ${available ? 'enabled' : 'disabled'} for garage successfully`,
        data: { garageService: updatedGarageService }
      }
    );

  } catch (error) {
    console.error('Update garage service error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// DELETE - Remove service from garage (GARAGE_ADMIN or SYSTEM_ADMIN)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; serviceId: string }> }
) {
  try {
    const { id, serviceId: serviceIdStr } = await params;
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

    const garageId = parseInt(id);
    const serviceId = parseInt(serviceIdStr);

    if (isNaN(garageId) || isNaN(serviceId)) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Invalid garage ID or service ID' 
        },
        { status: 400 }
      );
    }

    // Check if garage service assignment exists
    const existingAssignment = await prisma.garageService.findUnique({
      where: {
        garageId_serviceId: {
          garageId: garageId,
          serviceId: serviceId
        }
      },
      include: {
        garage: {
          select: {
            id: true,
            adminId: true,
            removed: true
          }
        }
      }
    });

    if (!existingAssignment || existingAssignment.garage.removed) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Garage service assignment not found' 
        },
        { status: 404 }
      );
    }

    // Only garage admin or system admin can remove services
    if (decoded.userType !== 'SYSTEM_ADMIN' && 
        (decoded.userType !== 'GARAGE_ADMIN' || decoded.id !== existingAssignment.garage.adminId)) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Only garage administrators can remove services' 
        },
        { status: 403 }
      );
    }

    // Remove service from garage
    await prisma.garageService.delete({
      where: {
        garageId_serviceId: {
          garageId: garageId,
          serviceId: serviceId
        }
      }
    });

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'Service removed from garage successfully'
      }
    );

  } catch (error) {
    console.error('Remove garage service error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}