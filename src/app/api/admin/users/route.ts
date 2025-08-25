import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { UserType } from '@/generated/prisma';
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

interface UserWithCounts {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  userType: UserType;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    garagesOwned: number;
    vehicles: number;
    customerRequests: number;
  };
  mechanic: {
    id: number;
  } | null;
}

interface UsersResponse {
  users: UserWithCounts[];
  totalCount: number;
  stats: {
    totalUsers: number;
    customers: number;
    mechanics: number;
    garageAdmins: number;
    systemAdmins: number;
  };
}

// GET /api/admin/users - List all users with filtering and pagination
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<UsersResponse>>> {
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
    const userType = searchParams.get('userType');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build where clause
    const where: PrismaWhereInput = {};
    
    if (userType && userType !== 'all') {
      where.userType = userType as UserType;
    }
    
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Fetch users with counts
    const [users, totalCount, stats] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          _count: {
            select: {
              garagesOwned: true,
              vehicles: true,
              customerRequests: true
            }
          },
          mechanic: {
            select: {
              id: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.user.count({ where }),
      prisma.user.groupBy({
        by: ['userType'],
        _count: { userType: true }
      })
    ]);

    // Calculate stats
    const roleStats = stats.reduce((acc, stat) => {
      const roleKey = stat.userType.toLowerCase() + 's';
      acc[roleKey] = stat._count.userType;
      return acc;
    }, {} as Record<string, number>);

    const responseData: UsersResponse = {
      users,
      totalCount,
      stats: {
        totalUsers: totalCount,
        customers: roleStats.customers || 0,
        mechanics: roleStats.mechanics || 0,
        garageAdmins: roleStats.garage_admins || 0,
        systemAdmins: roleStats.system_admins || 0
      }
    };

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Admin users fetch error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch users'
    }, { status: 500 });
  }
}

// PATCH /api/admin/users - Update user role or status
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
    const { userIds, action, newUserType } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'User IDs are required'
      }, { status: 400 });
    }

    // Prevent system admin from modifying their own account
    const currentUserId = decoded.id;
    if (userIds.includes(currentUserId)) {
      return NextResponse.json({
        success: false,
        error: 'Cannot modify your own account'
      }, { status: 400 });
    }

    if (action === 'changeUserType' && newUserType) {
      if (!['CUSTOMER', 'MECHANIC', 'GARAGE_ADMIN'].includes(newUserType)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid user type specified'
        }, { status: 400 });
      }

      await prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: { userType: newUserType as UserType }
      });

      return NextResponse.json({
        success: true,
        message: `Updated ${userIds.length} user(s) type to ${newUserType}`
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action specified'
    }, { status: 400 });

  } catch (error) {
    console.error('Admin users update error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update users'
    }, { status: 500 });
  }
}