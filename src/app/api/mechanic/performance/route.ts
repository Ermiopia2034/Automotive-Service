import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { UserType } from '@/generated/prisma';

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

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify and decode JWT token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as JwtPayload;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    if (decoded.userType !== UserType.MECHANIC) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '30'; // days

    const mechanicId = decoded.id;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeframe));

    // Get basic stats
    const totalRequests = await prisma.serviceRequest.count({
      where: {
        mechanicId: mechanicId,
        createdAt: {
          gte: startDate
        }
      }
    });

    const completedRequests = await prisma.serviceRequest.count({
      where: {
        mechanicId: mechanicId,
        status: 'COMPLETED',
        createdAt: {
          gte: startDate
        }
      }
    });

    const inProgressRequests = await prisma.serviceRequest.count({
      where: {
        mechanicId: mechanicId,
        status: 'IN_PROGRESS'
      }
    });

    const pendingRequests = await prisma.serviceRequest.count({
      where: {
        mechanicId: mechanicId,
        status: 'ACCEPTED'
      }
    });

    // Calculate completion rate
    const completionRate = totalRequests > 0 ? Math.round((completedRequests / totalRequests) * 100) : 0;

    // Use a simple estimated average completion time since we don't track actual completion time
    const averageCompletionTime = 24; // Assuming 24 hours average

    // Get ratings for this mechanic
    const ratingsData = await prisma.rating.findMany({
      where: {
        mechanicId: mechanicId
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10 // Get last 10 ratings
    });

    const ratings = ratingsData.map((rating) => ({
      rating: rating.rating,
      comment: rating.comment,
      customerName: `${rating.customer.firstName} ${rating.customer.lastName}`,
      date: rating.createdAt
    }));

    // Calculate average rating
    const averageRating = ratingsData.length > 0
      ? Math.round((ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length) * 10) / 10
      : 0;

    // Get daily performance for the last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const dailyPerformance = await Promise.all(
      last7Days.map(async (date) => {
        const startOfDay = new Date(date + 'T00:00:00.000Z');
        const endOfDay = new Date(date + 'T23:59:59.999Z');

        const completed = await prisma.serviceRequest.count({
          where: {
            mechanicId: mechanicId,
            status: 'COMPLETED',
            createdAt: {
              gte: startOfDay,
              lte: endOfDay
            }
          }
        });

        const accepted = await prisma.serviceRequest.count({
          where: {
            mechanicId: mechanicId,
            createdAt: {
              gte: startOfDay,
              lte: endOfDay
            },
            NOT: {
              status: 'PENDING'
            }
          }
        });

        return {
          date,
          completed,
          accepted
        };
      })
    );

    // Get mechanic info with garage relationship
    const user = await prisma.user.findUnique({
      where: { id: mechanicId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        mechanic: {
          select: {
            garageId: true,
            garage: {
              select: {
                id: true,
                garageName: true
              }
            }
          }
        }
      }
    });

    // Get recent service requests for activity
    const recentRequests = await prisma.serviceRequest.findMany({
      where: {
        mechanicId: mechanicId
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        vehicle: {
          select: {
            vehicleType: true,
            plateCode: true,
            plateNumber: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    const performanceData = {
      overview: {
        totalRequests,
        completedRequests,
        inProgressRequests,
        pendingRequests,
        completionRate,
        averageRating,
        averageCompletionTime
      },
      garage: user?.mechanic?.garage ? {
        id: user.mechanic.garage.id,
        name: user.mechanic.garage.garageName
      } : null,
      ratings,
      dailyPerformance,
      recentActivity: recentRequests.map((req) => ({
        id: req.id,
        status: req.status,
        customer: `${req.customer.firstName} ${req.customer.lastName}`,
        vehicle: `${req.vehicle.vehicleType} - ${req.vehicle.plateCode} ${req.vehicle.plateNumber}`,
        createdAt: req.createdAt
      }))
    };

    return NextResponse.json({
      success: true,
      data: performanceData
    });

  } catch (error) {
    console.error('Mechanic performance API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch performance data' },
      { status: 500 }
    );
  }
}