import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import type { ApiResponse } from '@/types/auth';

interface ServiceData {
  id: number;
  serviceName: string;
  estimatedPrice: number;
  removed: boolean;
  createdBy: number;
}

interface JwtPayload {
  id: number;
  username: string;
  email: string;
  userType: string;
}

interface ServiceData {
  serviceName: string;
  estimatedPrice: number;
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

// GET - Get all available services
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeRemoved = searchParams.get('include_removed') === 'true';
    const garageId = searchParams.get('garage_id');
    const search = searchParams.get('search');

    const whereClause: Record<string, unknown> = {};

    // By default, exclude removed services
    if (!includeRemoved) {
      whereClause.removed = false;
    }

    // Filter by search term if provided
    if (search) {
      whereClause.serviceName = {
        contains: search,
        mode: 'insensitive'
      };
    }

    // If garage_id is provided, get services available at that garage
    if (garageId) {
      const garageServices = await prisma.garageService.findMany({
        where: {
          garageId: parseInt(garageId),
          available: true,
          service: whereClause
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
        },
        orderBy: {
          service: {
            serviceName: 'asc'
          }
        }
      });

      const services = garageServices.map(gs => gs.service);

      return NextResponse.json<ApiResponse<{ services: ServiceData[] }>>(
        {
          success: true,
          data: { services }
        }
      );
    }

    // Get all services
    const services = await prisma.service.findMany({
      where: whereClause,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      },
      orderBy: {
        serviceName: 'asc'
      }
    });

    return NextResponse.json<ApiResponse<{ services: ServiceData[] }>>(
      {
        success: true,
        data: { services }
      }
    );

  } catch (error) {
    console.error('Get services error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// POST - Create a new service (SYSTEM_ADMIN only)
export async function POST(request: NextRequest) {
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

    // Only system admins can create services
    if (decoded.userType !== 'SYSTEM_ADMIN') {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Only system administrators can create services' 
        },
        { status: 403 }
      );
    }

    const body: ServiceData = await request.json();
    const { serviceName, estimatedPrice } = body;

    // Validate required fields
    if (!serviceName || estimatedPrice === undefined || estimatedPrice < 0) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Service name and valid estimated price are required' 
        },
        { status: 400 }
      );
    }

    // Check if service with same name already exists
    const existingService = await prisma.service.findFirst({
      where: {
        serviceName: serviceName,
        removed: false
      }
    });

    if (existingService) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Service with this name already exists' 
        },
        { status: 409 }
      );
    }

    // Create service
    const service = await prisma.service.create({
      data: {
        serviceName,
        estimatedPrice,
        createdBy: decoded.id,
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'Service created successfully',
        data: { service }
      },
      { status: 201 }
    );

  } catch {
    console.error('Service creation error');
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}