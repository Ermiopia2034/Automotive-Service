import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { ApiResponse } from '@/types/auth';

// Type for Prisma where clauses with flexible structure
type PrismaWhereInput = {
  [key: string]: unknown;
  OR?: Array<{ [key: string]: unknown }>;
};

interface ExtendedSession {
  user: {
    id: string;
    userType: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
  };
}

interface MechanicPerformance {
  id: number;
  userId: number;
  garageId: number;
  approved: boolean;
  removed: boolean;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    phoneNumber: string | null;
  };
  garage: {
    id: number;
    garageName: string;
  };
  performance: {
    totalRequests: number;
    completedRequests: number;
    completionRate: number;
    averageRating: number;
    totalRatings: number;
    activeServices: number;
    avgCompletionTime: number; // in hours
    customerSatisfaction: number;
  };
  recentActivity: {
    lastActiveDate: string | null;
    recentRequests: number; // requests in last 30 days
    recentCompletions: number; // completions in last 30 days
  };
}

interface MechanicsPerformanceResponse {
  mechanics: MechanicPerformance[];
  totalCount: number;
  stats: {
    totalMechanics: number;
    activeMechanics: number;
    topPerformer: {
      name: string;
      completionRate: number;
    } | null;
    averageCompletionRate: number;
    averageRating: number;
  };
}

// GET /api/admin/mechanic-performance - Get mechanic performance data
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<MechanicsPerformanceResponse>>> {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession | null;
    
    if (!session?.user || !['SYSTEM_ADMIN', 'GARAGE_ADMIN'].includes(session.user.userType)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized access' 
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const garageId = searchParams.get('garageId');
    const status = searchParams.get('status'); // active, inactive, all
    const sortBy = searchParams.get('sortBy') || 'completionRate'; // completionRate, rating, requests
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build where clause for mechanics
    const where: PrismaWhereInput = {};
    
    // For garage admin, only show their garage's mechanics
    if (session.user.userType === 'GARAGE_ADMIN') {
      // Get the garage admin's garage
      const garageAdmin = await prisma.user.findUnique({
        where: { id: parseInt(session.user.id) },
        include: { garagesOwned: true }
      });
      
      if (!garageAdmin || garageAdmin.garagesOwned.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Garage not found for admin'
        }, { status: 404 });
      }
      
      where.garageId = garageAdmin.garagesOwned[0].id;
    } else if (garageId) {
      where.garageId = parseInt(garageId);
    }

    if (status === 'active') {
      where.approved = true;
      where.removed = false;
    } else if (status === 'inactive') {
      where.OR = [
        { approved: false },
        { removed: true }
      ];
    }

    // Get mechanics with basic info
    const mechanics = await prisma.mechanic.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            email: true,
            phoneNumber: true
          }
        },
        garage: {
          select: {
            id: true,
            garageName: true
          }
        }
      },
      take: limit,
      skip: (page - 1) * limit
    });

    const totalCount = await prisma.mechanic.count({ where });

    // Calculate performance metrics for each mechanic
    const mechanicsWithPerformance: MechanicPerformance[] = await Promise.all(
      mechanics.map(async (mechanic) => {
        // Get service requests data
        const [
          totalRequests,
          completedRequests,
          ratings,
          activeServices,
          recentActivity
        ] = await Promise.all([
          // Total requests assigned to this mechanic
          prisma.serviceRequest.count({
            where: { mechanicId: mechanic.userId }
          }),
          
          // Completed requests
          prisma.serviceRequest.count({
            where: { 
              mechanicId: mechanic.userId,
              status: 'COMPLETED'
            }
          }),
          
          // Ratings for this mechanic
          prisma.rating.findMany({
            where: { mechanicId: mechanic.userId },
            select: { rating: true }
          }),
          
          // Active services (ongoing)
          prisma.serviceRequest.count({
            where: {
              mechanicId: mechanic.userId,
              status: { in: ['ACCEPTED', 'IN_PROGRESS'] }
            }
          }),
          
          // Recent activity (last 30 days)
          Promise.all([
            prisma.serviceRequest.findFirst({
              where: { mechanicId: mechanic.userId },
              orderBy: { createdAt: 'desc' },
              select: { createdAt: true }
            }),
            prisma.serviceRequest.count({
              where: {
                mechanicId: mechanic.userId,
                createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
              }
            }),
            prisma.serviceRequest.count({
              where: {
                mechanicId: mechanic.userId,
                status: 'COMPLETED',
                createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
              }
            })
          ])
        ]);

        // Calculate metrics
        const completionRate = totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0;
        const averageRating = ratings.length > 0 
          ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
          : 0;
        
        // Calculate average completion time (simplified)
        const avgCompletionTime = 24; // placeholder - in real system would calculate from timestamps
        
        // Customer satisfaction based on ratings > 7
        const customerSatisfaction = ratings.length > 0
          ? (ratings.filter(r => r.rating >= 7).length / ratings.length) * 100
          : 0;

        const [lastActivity, recentRequests, recentCompletions] = recentActivity;

        return {
          ...mechanic,
          performance: {
            totalRequests,
            completedRequests,
            completionRate: Math.round(completionRate * 100) / 100,
            averageRating: Math.round(averageRating * 100) / 100,
            totalRatings: ratings.length,
            activeServices,
            avgCompletionTime,
            customerSatisfaction: Math.round(customerSatisfaction * 100) / 100
          },
          recentActivity: {
            lastActiveDate: lastActivity?.createdAt.toISOString() || null,
            recentRequests,
            recentCompletions
          }
        };
      })
    );

    // Sort mechanics based on the requested criteria
    mechanicsWithPerformance.sort((a, b) => {
      let aValue: number, bValue: number;
      
      switch (sortBy) {
        case 'rating':
          aValue = a.performance.averageRating;
          bValue = b.performance.averageRating;
          break;
        case 'requests':
          aValue = a.performance.totalRequests;
          bValue = b.performance.totalRequests;
          break;
        case 'completionRate':
        default:
          aValue = a.performance.completionRate;
          bValue = b.performance.completionRate;
          break;
      }
      
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });

    // Calculate overall stats
    const activeMechanics = mechanicsWithPerformance.filter(m => m.approved && !m.removed).length;
    const averageCompletionRate = mechanicsWithPerformance.length > 0
      ? mechanicsWithPerformance.reduce((sum, m) => sum + m.performance.completionRate, 0) / mechanicsWithPerformance.length
      : 0;
    const averageRating = mechanicsWithPerformance.length > 0
      ? mechanicsWithPerformance.reduce((sum, m) => sum + m.performance.averageRating, 0) / mechanicsWithPerformance.length
      : 0;
    
    const topPerformer = mechanicsWithPerformance.length > 0 
      ? {
          name: `${mechanicsWithPerformance[0].user.firstName} ${mechanicsWithPerformance[0].user.lastName}`,
          completionRate: mechanicsWithPerformance[0].performance.completionRate
        }
      : null;

    const responseData: MechanicsPerformanceResponse = {
      mechanics: mechanicsWithPerformance,
      totalCount,
      stats: {
        totalMechanics: mechanicsWithPerformance.length,
        activeMechanics,
        topPerformer,
        averageCompletionRate: Math.round(averageCompletionRate * 100) / 100,
        averageRating: Math.round(averageRating * 100) / 100
      }
    };

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Mechanic performance fetch error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch mechanic performance data'
    }, { status: 500 });
  }
}

// PATCH /api/admin/mechanic-performance - Update mechanic status or add performance notes
export async function PATCH(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession | null;
    
    if (!session?.user || !['SYSTEM_ADMIN', 'GARAGE_ADMIN'].includes(session.user.userType)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized access' 
      }, { status: 401 });
    }

    const body = await request.json();
    const { mechanicIds, action, approved, removed } = body;

    if (!mechanicIds || !Array.isArray(mechanicIds) || mechanicIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Mechanic IDs are required'
      }, { status: 400 });
    }

    // For garage admin, verify they own the mechanics
    if (session.user.userType === 'GARAGE_ADMIN') {
      const garageAdmin = await prisma.user.findUnique({
        where: { id: parseInt(session.user.id) },
        include: { garagesOwned: true }
      });
      
      if (!garageAdmin || garageAdmin.garagesOwned.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Garage not found for admin'
        }, { status: 404 });
      }

      const mechanicsInGarage = await prisma.mechanic.count({
        where: {
          id: { in: mechanicIds },
          garageId: garageAdmin.garagesOwned[0].id
        }
      });

      if (mechanicsInGarage !== mechanicIds.length) {
        return NextResponse.json({
          success: false,
          error: 'Can only manage mechanics in your garage'
        }, { status: 403 });
      }
    }

    let updateData: Record<string, boolean> = {};
    let message = '';

    switch (action) {
      case 'approve':
        updateData = { approved: true, removed: false };
        message = `Approved ${mechanicIds.length} mechanic(s)`;
        break;
      case 'suspend':
        updateData = { approved: false };
        message = `Suspended ${mechanicIds.length} mechanic(s)`;
        break;
      case 'remove':
        updateData = { removed: true, approved: false };
        message = `Removed ${mechanicIds.length} mechanic(s)`;
        break;
      case 'restore':
        updateData = { removed: false };
        message = `Restored ${mechanicIds.length} mechanic(s)`;
        break;
      case 'updateStatus':
        if (typeof approved === 'boolean') updateData.approved = approved;
        if (typeof removed === 'boolean') updateData.removed = removed;
        message = `Updated status for ${mechanicIds.length} mechanic(s)`;
        break;
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action specified'
        }, { status: 400 });
    }

    await prisma.mechanic.updateMany({
      where: { id: { in: mechanicIds } },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      message
    });

  } catch (error) {
    console.error('Mechanic performance update error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update mechanic performance'
    }, { status: 500 });
  }
}