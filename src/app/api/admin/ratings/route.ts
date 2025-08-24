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

interface RatingWithDetails {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: Date;
  customer: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
    email: string;
  };
  garage: {
    id: number;
    garageName: string;
    latitude: number;
    longitude: number;
  };
  mechanic?: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
  } | null;
}

interface RatingsResponse {
  ratings: RatingWithDetails[];
  totalCount: number;
  stats: {
    totalRatings: number;
    averageRating: number;
    ratingDistribution: {
      [key: number]: number;
    };
    ratingsWithComments: number;
  };
}

// GET /api/admin/ratings - List all ratings with filtering and pagination
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<RatingsResponse>>> {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession | null;
    
    if (!session?.user || session.user.userType !== 'SYSTEM_ADMIN') {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized access' 
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const garageId = searchParams.get('garageId');
    const mechanicId = searchParams.get('mechanicId');
    const customerId = searchParams.get('customerId');
    const minRating = searchParams.get('minRating');
    const maxRating = searchParams.get('maxRating');
    const hasComment = searchParams.get('hasComment');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build where clause
    const where: PrismaWhereInput = {};
    
    if (garageId) {
      where.garageId = parseInt(garageId);
    }
    
    if (mechanicId) {
      where.mechanicId = parseInt(mechanicId);
    }
    
    if (customerId) {
      where.customerId = parseInt(customerId);
    }
    
    if (minRating) {
      where.rating = { gte: parseInt(minRating) };
    }
    
    if (maxRating) {
      where.rating = {
        ...(where.rating as object || {}),
        lte: parseInt(maxRating)
      };
    }
    
    if (hasComment === 'true') {
      where.comment = { not: null };
    } else if (hasComment === 'false') {
      where.comment = null;
    }
    
    if (search) {
      where.OR = [
        { comment: { contains: search, mode: 'insensitive' } },
        { customer: {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { username: { contains: search, mode: 'insensitive' } }
          ]
        }},
        { garage: { 
          garageName: { contains: search, mode: 'insensitive' } 
        }},
        { mechanic: {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { username: { contains: search, mode: 'insensitive' } }
          ]
        }}
      ];
    }

    // Fetch ratings with details
    const [ratings, totalCount, allRatings] = await Promise.all([
      prisma.rating.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
              email: true
            }
          },
          garage: {
            select: {
              id: true,
              garageName: true,
              latitude: true,
              longitude: true
            }
          },
          mechanic: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.rating.count({ where }),
      prisma.rating.findMany({
        select: {
          rating: true,
          comment: true
        }
      })
    ]);

    // Calculate stats
    const totalRatings = allRatings.length;
    const averageRating = totalRatings > 0 
      ? allRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings 
      : 0;
    
    const ratingDistribution = allRatings.reduce((acc, r) => {
      acc[r.rating] = (acc[r.rating] || 0) + 1;
      return acc;
    }, {} as { [key: number]: number });
    
    const ratingsWithComments = allRatings.filter(r => r.comment !== null).length;

    const responseData: RatingsResponse = {
      ratings,
      totalCount,
      stats: {
        totalRatings,
        averageRating: Math.round(averageRating * 100) / 100,
        ratingDistribution,
        ratingsWithComments
      }
    };

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Admin ratings fetch error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch ratings'
    }, { status: 500 });
  }
}

// DELETE /api/admin/ratings - Delete inappropriate ratings
export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession | null;
    
    if (!session?.user || session.user.userType !== 'SYSTEM_ADMIN') {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized access' 
      }, { status: 401 });
    }

    const body = await request.json();
    const { ratingIds, reason } = body;

    if (!ratingIds || !Array.isArray(ratingIds) || ratingIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Rating IDs are required'
      }, { status: 400 });
    }

    if (!reason) {
      return NextResponse.json({
        success: false,
        error: 'Reason for deletion is required'
      }, { status: 400 });
    }

    // Get the ratings to be deleted for logging
    const ratingsToDelete = await prisma.rating.findMany({
      where: { id: { in: ratingIds } },
      include: {
        customer: { select: { username: true } },
        garage: { select: { garageName: true } }
      }
    });

    // Delete the ratings
    await prisma.rating.deleteMany({
      where: { id: { in: ratingIds } }
    });

    // Log the deletion (in a real system, you might want to keep an audit log)
    console.log(`System admin ${session.user.id} deleted ${ratingIds.length} ratings. Reason: ${reason}`, {
      deletedRatings: ratingsToDelete.map(r => ({
        id: r.id,
        customer: r.customer.username,
        garage: r.garage.garageName,
        rating: r.rating,
        comment: r.comment
      }))
    });

    return NextResponse.json({
      success: true,
      message: `Deleted ${ratingIds.length} rating(s)`
    });

  } catch (error) {
    console.error('Admin ratings delete error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete ratings'
    }, { status: 500 });
  }
}

// PATCH /api/admin/ratings - Update rating status or flag inappropriate content
export async function PATCH(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession | null;
    
    if (!session?.user || session.user.userType !== 'SYSTEM_ADMIN') {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized access' 
      }, { status: 401 });
    }

    const body = await request.json();
    const { ratingIds, action } = body;

    if (!ratingIds || !Array.isArray(ratingIds) || ratingIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Rating IDs are required'
      }, { status: 400 });
    }

    // For this implementation, we'll focus on content moderation
    // In a production system, you might add fields like 'flagged' or 'hidden'
    if (action === 'hideComment') {
      // Hide inappropriate comments by setting them to null
      await prisma.rating.updateMany({
        where: { id: { in: ratingIds } },
        data: { comment: null }
      });

      return NextResponse.json({
        success: true,
        message: `Hidden comments for ${ratingIds.length} rating(s)`
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action specified'
    }, { status: 400 });

  } catch (error) {
    console.error('Admin ratings update error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update ratings'
    }, { status: 500 });
  }
}