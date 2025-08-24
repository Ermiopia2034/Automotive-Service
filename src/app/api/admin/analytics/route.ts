import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { ApiResponse } from '@/types/auth';

interface ExtendedSession {
  user: {
    id: string;
    userType: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
  };
}

interface SystemAnalytics {
  overview: {
    totalUsers: number;
    totalGarages: number;
    totalServices: number;
    totalRequests: number;
    totalRatings: number;
    systemUptime: string;
  };
  userMetrics: {
    customers: number;
    mechanics: number;
    garageAdmins: number;
    systemAdmins: number;
    newUsersThisMonth: number;
    activeUsers: number;
  };
  garageMetrics: {
    approvedGarages: number;
    pendingGarages: number;
    removedGarages: number;
    averageRating: number;
    topRatedGarage: {
      name: string;
      rating: number;
    } | null;
  };
  serviceMetrics: {
    totalServiceRequests: number;
    pendingRequests: number;
    completedRequests: number;
    cancelledRequests: number;
    averageCompletionTime: number;
    requestsThisMonth: number;
  };
  performanceMetrics: {
    averageResponseTime: number;
    systemLoad: number;
    errorRate: number;
    customerSatisfaction: number;
  };
  revenueMetrics: {
    totalRevenue: number;
    monthlyRevenue: number;
    averageOrderValue: number;
    topServices: Array<{
      name: string;
      count: number;
      revenue: number;
    }>;
  };
  trends: {
    dailyRequests: Array<{
      date: string;
      requests: number;
      completions: number;
    }>;
    monthlyGrowth: {
      users: number;
      requests: number;
      garages: number;
    };
  };
}

interface GarageAnalytics {
  overview: {
    totalMechanics: number;
    totalServices: number;
    totalRequests: number;
    averageRating: number;
    garageRank: number;
  };
  mechanicPerformance: {
    totalMechanics: number;
    activeMechanics: number;
    averagePerformance: number;
    topPerformer: {
      name: string;
      completionRate: number;
    } | null;
  };
  serviceMetrics: {
    pendingRequests: number;
    activeRequests: number;
    completedRequests: number;
    requestsThisMonth: number;
    completionRate: number;
  };
  customerMetrics: {
    totalCustomers: number;
    repeatCustomers: number;
    customerSatisfaction: number;
    averageRating: number;
  };
  revenueMetrics: {
    monthlyRevenue: number;
    averageOrderValue: number;
    topServices: Array<{
      name: string;
      count: number;
      revenue: number;
    }>;
  };
}

// GET /api/admin/analytics - Get system or garage analytics
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<SystemAnalytics | GarageAnalytics>>> {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession | null;
    
    if (!session?.user || !['SYSTEM_ADMIN', 'GARAGE_ADMIN'].includes(session.user.userType)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized access' 
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'system'; // system or garage
    const timeframe = searchParams.get('timeframe') || '30'; // days

    if (session.user.userType === 'SYSTEM_ADMIN' && scope === 'system') {
      // System-wide analytics for System Admin
      const analytics = await getSystemAnalytics(parseInt(timeframe));
      return NextResponse.json({
        success: true,
        data: analytics
      });
    } else if (session.user.userType === 'GARAGE_ADMIN') {
      // Garage-specific analytics for Garage Admin
      const analytics = await getGarageAnalytics(parseInt(session.user.id), parseInt(timeframe));
      return NextResponse.json({
        success: true,
        data: analytics
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid scope for user type'
      }, { status: 403 });
    }

  } catch (error) {
    console.error('Analytics fetch error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch analytics data'
    }, { status: 500 });
  }
}

async function getSystemAnalytics(timeframeDays: number): Promise<SystemAnalytics> {
  const startDate = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000);
  
  // Get overview metrics
  const [
    totalUsers,
    totalGarages,
    totalServices,
    totalRequests,
    totalRatings,
    usersByType,
    garagesByStatus,
    requestsByStatus,
    ratings,
    recentUsers,
    recentRequests
  ] = await Promise.all([
    prisma.user.count(),
    prisma.garage.count(),
    prisma.service.count({ where: { removed: false } }),
    prisma.serviceRequest.count(),
    prisma.rating.count(),
    prisma.user.groupBy({
      by: ['userType'],
      _count: { userType: true }
    }),
    prisma.garage.groupBy({
      by: ['approved', 'removed'],
      _count: { approved: true }
    }),
    prisma.serviceRequest.groupBy({
      by: ['status'],
      _count: { status: true }
    }),
    prisma.rating.findMany({
      select: { rating: true }
    }),
    prisma.user.count({
      where: { createdAt: { gte: startDate } }
    }),
    prisma.serviceRequest.count({
      where: { createdAt: { gte: startDate } }
    })
  ]);

  // Calculate user metrics
  const userMetrics = usersByType.reduce((acc, item) => {
    switch (item.userType) {
      case 'CUSTOMER':
        acc.customers = item._count.userType;
        break;
      case 'MECHANIC':
        acc.mechanics = item._count.userType;
        break;
      case 'GARAGE_ADMIN':
        acc.garageAdmins = item._count.userType;
        break;
      case 'SYSTEM_ADMIN':
        acc.systemAdmins = item._count.userType;
        break;
    }
    return acc;
  }, { customers: 0, mechanics: 0, garageAdmins: 0, systemAdmins: 0, newUsersThisMonth: recentUsers, activeUsers: totalUsers });

  // Calculate garage metrics
  let approvedGarages = 0, pendingGarages = 0, removedGarages = 0;
  garagesByStatus.forEach(item => {
    if (item.removed) removedGarages += item._count.approved;
    else if (item.approved) approvedGarages += item._count.approved;
    else pendingGarages += item._count.approved;
  });

  const averageRating = ratings.length > 0 
    ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
    : 0;

  // Get top-rated garage
  const topRatedGarage = await prisma.garage.findFirst({
    where: { approved: true, removed: false },
    orderBy: { rating: 'desc' },
    select: { garageName: true, rating: true }
  });

  // Calculate service metrics
  const serviceMetrics = requestsByStatus.reduce((acc, item) => {
    switch (item.status) {
      case 'PENDING':
        acc.pendingRequests = item._count.status;
        break;
      case 'COMPLETED':
        acc.completedRequests = item._count.status;
        break;
      case 'CANCELLED':
        acc.cancelledRequests = item._count.status;
        break;
    }
    return acc;
  }, {
    totalServiceRequests: totalRequests,
    pendingRequests: 0,
    completedRequests: 0,
    cancelledRequests: 0,
    averageCompletionTime: 24, // placeholder - would calculate from actual timestamps
    requestsThisMonth: recentRequests
  });

  // Generate daily trend data (simplified)
  const dailyRequests = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    
    const [requests, completions] = await Promise.all([
      prisma.serviceRequest.count({
        where: {
          createdAt: { gte: dayStart, lt: dayEnd }
        }
      }),
      prisma.serviceRequest.count({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: dayStart, lt: dayEnd }
        }
      })
    ]);

    dailyRequests.push({
      date: date.toISOString().split('T')[0],
      requests,
      completions
    });
  }

  return {
    overview: {
      totalUsers,
      totalGarages,
      totalServices,
      totalRequests,
      totalRatings,
      systemUptime: '99.9%' // placeholder
    },
    userMetrics,
    garageMetrics: {
      approvedGarages,
      pendingGarages,
      removedGarages,
      averageRating: Math.round(averageRating * 100) / 100,
      topRatedGarage: topRatedGarage ? {
        name: topRatedGarage.garageName,
        rating: topRatedGarage.rating
      } : null
    },
    serviceMetrics,
    performanceMetrics: {
      averageResponseTime: 250, // ms - placeholder
      systemLoad: 65, // % - placeholder
      errorRate: 0.1, // % - placeholder
      customerSatisfaction: Math.round((averageRating / 10) * 100)
    },
    revenueMetrics: {
      totalRevenue: 0, // placeholder - would calculate from actual pricing
      monthlyRevenue: 0,
      averageOrderValue: 0,
      topServices: [] // placeholder
    },
    trends: {
      dailyRequests,
      monthlyGrowth: {
        users: Math.round((recentUsers / totalUsers) * 100),
        requests: Math.round((recentRequests / totalRequests) * 100),
        garages: 5 // placeholder
      }
    }
  };
}

async function getGarageAnalytics(adminUserId: number, timeframeDays: number): Promise<GarageAnalytics> {
  // Get the garage for this admin
  const garage = await prisma.garage.findFirst({
    where: { adminId: adminUserId },
    include: {
      mechanics: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      },
      serviceRequests: {
        include: {
          customer: true
        }
      },
      ratings: true
    }
  });

  if (!garage) {
    throw new Error('Garage not found for admin');
  }

  const startDate = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000);

  // Calculate metrics
  const totalMechanics = garage.mechanics.length;
  const activeMechanics = garage.mechanics.filter(m => m.approved && !m.removed).length;
  const totalRequests = garage.serviceRequests.length;
  const recentRequests = garage.serviceRequests.filter(r => new Date(r.createdAt) >= startDate).length;
  
  const completedRequests = garage.serviceRequests.filter(r => r.status === 'COMPLETED').length;
  const pendingRequests = garage.serviceRequests.filter(r => r.status === 'PENDING').length;
  const activeRequests = garage.serviceRequests.filter(r => ['ACCEPTED', 'IN_PROGRESS'].includes(r.status)).length;
  
  const completionRate = totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0;
  const averageRating = garage.ratings.length > 0 
    ? garage.ratings.reduce((sum, r) => sum + r.rating, 0) / garage.ratings.length 
    : 0;

  // Get unique customers
  const uniqueCustomers = new Set(garage.serviceRequests.map(r => r.customerId));
  const totalCustomers = uniqueCustomers.size;

  // Calculate repeat customers (simplified)
  const customerRequestCounts = garage.serviceRequests.reduce((acc, req) => {
    acc[req.customerId] = (acc[req.customerId] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  
  const repeatCustomers = Object.values(customerRequestCounts).filter(count => count > 1).length;

  // Get mechanic performance data (simplified)
  const mechanicPerformanceData = await Promise.all(
    garage.mechanics.map(async (mechanic) => {
      const mechanicRequests = await prisma.serviceRequest.count({
        where: { mechanicId: mechanic.userId }
      });
      const completedByMechanic = await prisma.serviceRequest.count({
        where: { mechanicId: mechanic.userId, status: 'COMPLETED' }
      });
      
      return {
        name: `${mechanic.user.firstName} ${mechanic.user.lastName}`,
        completionRate: mechanicRequests > 0 ? (completedByMechanic / mechanicRequests) * 100 : 0
      };
    })
  );

  const topPerformer = mechanicPerformanceData.length > 0
    ? mechanicPerformanceData.reduce((best, current) =>
        current.completionRate > best.completionRate ? current : best
      )
    : null;

  const averagePerformance = mechanicPerformanceData.length > 0
    ? mechanicPerformanceData.reduce((sum, m) => sum + m.completionRate, 0) / mechanicPerformanceData.length
    : 0;

  return {
    overview: {
      totalMechanics,
      totalServices: 0, // placeholder - would count garage services
      totalRequests,
      averageRating: Math.round(averageRating * 100) / 100,
      garageRank: 1 // placeholder
    },
    mechanicPerformance: {
      totalMechanics,
      activeMechanics,
      averagePerformance: Math.round(averagePerformance * 100) / 100,
      topPerformer: topPerformer && topPerformer.completionRate > 0 ? {
        name: topPerformer.name,
        completionRate: Math.round(topPerformer.completionRate * 100) / 100
      } : null
    },
    serviceMetrics: {
      pendingRequests,
      activeRequests,
      completedRequests,
      requestsThisMonth: recentRequests,
      completionRate: Math.round(completionRate * 100) / 100
    },
    customerMetrics: {
      totalCustomers,
      repeatCustomers,
      customerSatisfaction: Math.round((averageRating / 10) * 100),
      averageRating: Math.round(averageRating * 100) / 100
    },
    revenueMetrics: {
      monthlyRevenue: 0, // placeholder
      averageOrderValue: 0, // placeholder
      topServices: [] // placeholder
    }
  };
}