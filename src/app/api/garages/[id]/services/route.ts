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

interface GarageServiceData {
  serviceId: number;
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

// GET - Get services offered by a specific garage
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const garageId = parseInt(id);

    if (isNaN(garageId)) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Invalid garage ID' 
        },
        { status: 400 }
      );
    }

    // Check if garage exists and is approved
    const garage = await prisma.garage.findUnique({
      where: { id: garageId },
      select: { id: true, approved: true, removed: true }
    });

    if (!garage || garage.removed) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Garage not found' 
        },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeUnavailable = searchParams.get('include_unavailable') === 'true';

    const whereClause: Record<string, unknown> = {
      garageId: garageId
    };

    // By default, only show available services
    if (!includeUnavailable) {
      whereClause.available = true;
    }

    const garageServices = await prisma.garageService.findMany({
      where: whereClause,
      include: {
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
      },
      orderBy: {
        service: {
          serviceName: 'asc'
        }
      }
    });

    return NextResponse.json<ApiResponse<{ garageServices: typeof garageServices }>>(
      {
        success: true,
        data: { garageServices }
      }
    );

  } catch {
    console.error('Get garage services error');
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// POST - Add service to garage (GARAGE_ADMIN or SYSTEM_ADMIN)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    if (isNaN(garageId)) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Invalid garage ID' 
        },
        { status: 400 }
      );
    }

    // Check if garage exists and user has permission
    const garage = await prisma.garage.findUnique({
      where: { id: garageId },
      select: { id: true, adminId: true, approved: true, removed: true }
    });

    if (!garage || garage.removed) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Garage not found' 
        },
        { status: 404 }
      );
    }

    // Only garage admin or system admin can add services
    if (decoded.userType !== 'SYSTEM_ADMIN' && 
        (decoded.userType !== 'GARAGE_ADMIN' || decoded.id !== garage.adminId)) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Only garage administrators can manage garage services' 
        },
        { status: 403 }
      );
    }

    const body: GarageServiceData = await request.json();
    const { serviceId, available = true } = body;

    // Validate required fields
    if (!serviceId) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Service ID is required' 
        },
        { status: 400 }
      );
    }

    // Check if service exists
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true, removed: true }
    });

    if (!service || service.removed) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Service not found' 
        },
        { status: 404 }
      );
    }

    // Check if service is already assigned to garage
    const existingAssignment = await prisma.garageService.findUnique({
      where: {
        garageId_serviceId: {
          garageId: garageId,
          serviceId: serviceId
        }
      }
    });

    if (existingAssignment) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Service is already assigned to this garage' 
        },
        { status: 409 }
      );
    }

    // Add service to garage
    const garageService = await prisma.garageService.create({
      data: {
        garageId,
        serviceId,
        available,
      },
      include: {
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
        message: 'Service added to garage successfully',
        data: { garageService }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Add garage service error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}