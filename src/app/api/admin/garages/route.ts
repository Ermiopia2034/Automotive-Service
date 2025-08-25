import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import type { ApiResponse } from '@/types/auth';

// Type for Prisma where clauses with flexible structure
type PrismaWhereInput = {
  [key: string]: unknown;
  OR?: Array<{ [key: string]: unknown }>;
};

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

interface GarageWithDetails {
  id: number;
  garageName: string;
  latitude: number;
  longitude: number;
  rating: number;
  available: boolean;
  removed: boolean;
  approved: boolean;
  createdAt: Date;
  admin: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    phoneNumber: string | null;
  };
  _count: {
    mechanics: number;
    services: number;
    serviceRequests: number;
    ratings: number;
  };
}

interface GaragesResponse {
  garages: GarageWithDetails[];
  totalCount: number;
  stats: {
    totalGarages: number;
    approvedGarages: number;
    pendingGarages: number;
    removedGarages: number;
  };
}

// GET /api/admin/garages - List all garages with filtering and pagination
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<GaragesResponse>>> {
  try {
    const token = getTokenFromRequest(request);
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as JwtPayload;
    
    if (decoded.userType !== 'SYSTEM_ADMIN') {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized access - System Admin required'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // all, approved, pending, removed
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build where clause
    const where: PrismaWhereInput = {};
    
    if (status && status !== 'all') {
      switch (status) {
        case 'approved':
          where.approved = true;
          where.removed = false;
          break;
        case 'pending':
          where.approved = false;
          where.removed = false;
          break;
        case 'removed':
          where.removed = true;
          break;
      }
    }
    
    if (search) {
      where.OR = [
        { garageName: { contains: search, mode: 'insensitive' } },
        { admin: {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { username: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
          ]
        }}
      ];
    }

    // Fetch garages with admin details and counts
    const [garages, totalCount, allGarages] = await Promise.all([
      prisma.garage.findMany({
        where,
        include: {
          admin: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
              email: true,
              phoneNumber: true
            }
          },
          _count: {
            select: {
              mechanics: true,
              services: true,
              serviceRequests: true,
              ratings: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.garage.count({ where }),
      prisma.garage.findMany({
        select: {
          approved: true,
          removed: true
        }
      })
    ]);

    // Calculate stats
    const stats = {
      totalGarages: allGarages.length,
      approvedGarages: allGarages.filter(g => g.approved && !g.removed).length,
      pendingGarages: allGarages.filter(g => !g.approved && !g.removed).length,
      removedGarages: allGarages.filter(g => g.removed).length
    };

    const responseData: GaragesResponse = {
      garages,
      totalCount,
      stats
    };

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Admin garages fetch error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch garages'
    }, { status: 500 });
  }
}

// PATCH /api/admin/garages - Update garage status (approve/remove/restore)
export async function PATCH(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const token = getTokenFromRequest(request);
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as JwtPayload;
    
    if (decoded.userType !== 'SYSTEM_ADMIN') {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized access - System Admin required'
      }, { status: 403 });
    }

    const body = await request.json();
    const { garageIds, action } = body;

    if (!garageIds || !Array.isArray(garageIds) || garageIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Garage IDs are required'
      }, { status: 400 });
    }

    let updateData: Record<string, boolean> = {};
    let message = '';

    switch (action) {
      case 'approve':
        updateData = { approved: true, removed: false };
        message = `Approved ${garageIds.length} garage(s)`;
        break;
      case 'remove':
        updateData = { removed: true, available: false };
        message = `Removed ${garageIds.length} garage(s)`;
        break;
      case 'restore':
        updateData = { removed: false, available: true };
        message = `Restored ${garageIds.length} garage(s)`;
        break;
      case 'toggleAvailability':
        // For this action, we need to handle each garage individually
        const garages = await prisma.garage.findMany({
          where: { id: { in: garageIds } },
          select: { id: true, available: true }
        });

        await Promise.all(
          garages.map(garage =>
            prisma.garage.update({
              where: { id: garage.id },
              data: { available: !garage.available }
            })
          )
        );

        return NextResponse.json({
          success: true,
          message: `Toggled availability for ${garageIds.length} garage(s)`
        });
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action specified'
        }, { status: 400 });
    }

    await prisma.garage.updateMany({
      where: { id: { in: garageIds } },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      message
    });

  } catch (error) {
    console.error('Admin garages update error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update garages'
    }, { status: 500 });
  }
}

// DELETE /api/admin/garages - Permanently remove garages (hard delete)
export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const token = getTokenFromRequest(request);
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as JwtPayload;
    
    if (decoded.userType !== 'SYSTEM_ADMIN') {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized access - System Admin required'
      }, { status: 403 });
    }

    const body = await request.json();
    const { garageIds, confirm } = body;

    if (!garageIds || !Array.isArray(garageIds) || garageIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Garage IDs are required'
      }, { status: 400 });
    }

    if (!confirm) {
      return NextResponse.json({
        success: false,
        error: 'Confirmation required for permanent deletion'
      }, { status: 400 });
    }

    // Check if any garages have active service requests
    const activeRequests = await prisma.serviceRequest.count({
      where: {
        garageId: { in: garageIds },
        status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] }
      }
    });

    if (activeRequests > 0) {
      return NextResponse.json({
        success: false,
        error: `Cannot delete garages with ${activeRequests} active service request(s). Complete or cancel active requests first.`
      }, { status: 400 });
    }

    // Use transaction for safe deletion
    await prisma.$transaction(async (tx) => {
      // Delete related records first
      await tx.rating.deleteMany({
        where: { garageId: { in: garageIds } }
      });
      
      await tx.serviceRequest.deleteMany({
        where: { garageId: { in: garageIds } }
      });
      
      await tx.garageService.deleteMany({
        where: { garageId: { in: garageIds } }
      });
      
      await tx.mechanic.deleteMany({
        where: { garageId: { in: garageIds } }
      });
      
      await tx.application.deleteMany({
        where: { garageId: { in: garageIds } }
      });

      // Finally delete the garages
      await tx.garage.deleteMany({
        where: { id: { in: garageIds } }
      });
    });

    return NextResponse.json({
      success: true,
      message: `Permanently deleted ${garageIds.length} garage(s) and all related data`
    });

  } catch (error) {
    console.error('Admin garages delete error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete garages'
    }, { status: 500 });
  }
}