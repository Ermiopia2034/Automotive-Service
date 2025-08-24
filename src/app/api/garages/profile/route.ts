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

interface GarageProfileUpdateData {
  garageName?: string;
  latitude?: number;
  longitude?: number;
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

// GET - Get garage profile
export async function GET(request: NextRequest) {
  try {
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

    // Only garage admins can access this endpoint
    if (decoded.userType !== 'GARAGE_ADMIN') {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Only garage administrators can access garage profiles' 
        },
        { status: 403 }
      );
    }

    // Get garage for this admin
    const garage = await prisma.garage.findFirst({
      where: {
        adminId: decoded.id,
        approved: true,
        removed: false,
      },
      include: {
        admin: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        mechanics: {
          where: {
            approved: true,
            removed: false,
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                email: true,
              }
            }
          }
        },
        _count: {
          select: {
            serviceRequests: true,
            ratings: true,
          }
        }
      }
    });

    if (!garage) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Garage not found or not approved' 
        },
        { status: 404 }
      );
    }

    const formattedGarage = {
      ...garage,
      createdAt: garage.createdAt.toISOString(),
    };

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: { garage: formattedGarage }
      }
    );

  } catch (error) {
    console.error('Get garage profile error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// PATCH - Update garage profile
export async function PATCH(request: NextRequest) {
  try {
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

    // Only garage admins can access this endpoint
    if (decoded.userType !== 'GARAGE_ADMIN') {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Only garage administrators can update garage profiles' 
        },
        { status: 403 }
      );
    }

    const body: GarageProfileUpdateData = await request.json();
    const { garageName, latitude, longitude, available } = body;

    // Validate at least one field is provided
    if (!garageName && latitude === undefined && longitude === undefined && available === undefined) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'At least one field must be provided for update' 
        },
        { status: 400 }
      );
    }

    // Find garage for this admin
    const existingGarage = await prisma.garage.findFirst({
      where: {
        adminId: decoded.id,
        approved: true,
        removed: false,
      }
    });

    if (!existingGarage) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Garage not found or not approved' 
        },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: {
      garageName?: string;
      latitude?: number;
      longitude?: number;
      available?: boolean;
    } = {};
    if (garageName !== undefined) updateData.garageName = garageName;
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;
    if (available !== undefined) updateData.available = available;

    // Update garage
    const updatedGarage = await prisma.garage.update({
      where: {
        id: existingGarage.id,
      },
      data: updateData,
      include: {
        admin: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        mechanics: {
          where: {
            approved: true,
            removed: false,
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                email: true,
              }
            }
          }
        },
        _count: {
          select: {
            serviceRequests: true,
            ratings: true,
          }
        }
      }
    });

    const formattedGarage = {
      ...updatedGarage,
      createdAt: updatedGarage.createdAt.toISOString(),
    };

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'Garage profile updated successfully',
        data: { garage: formattedGarage }
      }
    );

  } catch (error) {
    console.error('Update garage profile error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}