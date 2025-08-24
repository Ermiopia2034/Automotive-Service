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

interface RatingSubmission {
  garageId: number;
  mechanicId?: number;
  rating: number;
  comment?: string;
}

// POST /api/ratings - Submit a new rating
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const token = getTokenFromRequest(request);
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Verify and decode JWT token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as JwtPayload;
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Invalid token'
      }, { status: 401 });
    }

    const body: RatingSubmission = await request.json();
    const { garageId, mechanicId, rating, comment } = body;

    // Validate required fields
    if (!garageId || !rating) {
      return NextResponse.json({
        success: false,
        error: 'Garage ID and rating are required'
      }, { status: 400 });
    }

    // Validate rating range (1-10)
    if (rating < 1 || rating > 10) {
      return NextResponse.json({
        success: false,
        error: 'Rating must be between 1 and 10'
      }, { status: 400 });
    }

    // Validate comment length if provided
    if (comment && comment.length > 500) {
      return NextResponse.json({
        success: false,
        error: 'Comment must be 500 characters or less'
      }, { status: 400 });
    }

    // Check if garage exists and is approved
    const garage = await prisma.garage.findFirst({
      where: {
        id: garageId,
        approved: true,
        removed: false
      }
    });

    if (!garage) {
      return NextResponse.json({
        success: false,
        error: 'Garage not found or not available'
      }, { status: 404 });
    }

    // Check if mechanic exists and is approved (if mechanicId is provided)
    if (mechanicId) {
      const mechanic = await prisma.mechanic.findFirst({
        where: {
          userId: mechanicId,
          garageId: garageId,
          approved: true,
          removed: false
        }
      });

      if (!mechanic) {
        return NextResponse.json({
          success: false,
          error: 'Mechanic not found or not associated with this garage'
        }, { status: 404 });
      }
    }

    // Check if user has already rated this garage recently (prevent spam)
    const existingRating = await prisma.rating.findFirst({
      where: {
        customerId: decoded.id,
        garageId: garageId,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    if (existingRating) {
      return NextResponse.json({
        success: false,
        error: 'You can only submit one rating per garage per day'
      }, { status: 429 });
    }

    // Create the rating
    const newRating = await prisma.rating.create({
      data: {
        customerId: decoded.id,
        garageId: garageId,
        mechanicId: mechanicId || null,
        rating: rating,
        comment: comment || null
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            username: true
          }
        },
        garage: {
          select: {
            garageName: true
          }
        },
        mechanic: mechanicId ? {
          select: {
            firstName: true,
            lastName: true,
            username: true
          }
        } : false
      }
    });

    // Update garage's average rating
    const allGarageRatings = await prisma.rating.findMany({
      where: { garageId: garageId },
      select: { rating: true }
    });

    const averageRating = allGarageRatings.length > 0
      ? allGarageRatings.reduce((sum, r) => sum + r.rating, 0) / allGarageRatings.length
      : 0;

    await prisma.garage.update({
      where: { id: garageId },
      data: { rating: Math.round(averageRating * 100) / 100 }
    });

    return NextResponse.json({
      success: true,
      message: 'Rating submitted successfully',
      data: {
        id: newRating.id,
        rating: newRating.rating,
        comment: newRating.comment,
        createdAt: newRating.createdAt
      }
    });

  } catch (error) {
    console.error('Rating submission error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to submit rating'
    }, { status: 500 });
  }
}

// GET /api/ratings - Get ratings for a specific garage or customer
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const token = getTokenFromRequest(request);
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Verify and decode JWT token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as JwtPayload;
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Invalid token'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const garageId = searchParams.get('garageId');
    const customerId = searchParams.get('customerId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {};

    if (garageId) {
      whereClause.garageId = parseInt(garageId);
    } else if (customerId) {
      // Handle "current" as referring to the authenticated user
      if (customerId === 'current') {
        whereClause.customerId = decoded.id;
      } else {
        // Users can only view their own ratings
        if (parseInt(customerId) !== decoded.id) {
          return NextResponse.json({
            success: false,
            error: 'Unauthorized to view other customers\' ratings'
          }, { status: 403 });
        }
        whereClause.customerId = parseInt(customerId);
      }
    } else {
      return NextResponse.json({
        success: false,
        error: 'Either garageId or customerId is required'
      }, { status: 400 });
    }

    const [ratings, totalCount] = await Promise.all([
      prisma.rating.findMany({
        where: whereClause,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true
            }
          },
          garage: {
            select: {
              id: true,
              garageName: true
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
      prisma.rating.count({ where: whereClause })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ratings,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page
      }
    });

  } catch (error) {
    console.error('Ratings fetch error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch ratings'
    }, { status: 500 });
  }
}