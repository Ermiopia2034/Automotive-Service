import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import type { VehicleData, ApiResponse } from '@/types/auth';

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

// POST - Register a new vehicle
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
    } catch (error) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Invalid token' 
        },
        { status: 401 }
      );
    }

    // Only customers can register vehicles
    if (decoded.userType !== 'CUSTOMER') {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Only customers can register vehicles' 
        },
        { status: 403 }
      );
    }

    const body: VehicleData = await request.json();
    const { vehicleType, plateNumber, plateCode, countryCode, color } = body;

    // Validate required fields
    if (!vehicleType || !plateNumber || !plateCode || !countryCode || !color) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'All vehicle fields are required' 
        },
        { status: 400 }
      );
    }

    // Check if vehicle with same plate number already exists for this user
    const existingVehicle = await prisma.vehicle.findFirst({
      where: {
        customerId: decoded.id,
        plateNumber: plateNumber,
        plateCode: plateCode,
        countryCode: countryCode,
      }
    });

    if (existingVehicle) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Vehicle with this plate number already exists' 
        },
        { status: 409 }
      );
    }

    // Create vehicle
    const vehicle = await prisma.vehicle.create({
      data: {
        customerId: decoded.id,
        vehicleType,
        plateNumber,
        plateCode,
        countryCode,
        color,
      },
    });

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'Vehicle registered successfully',
        data: { vehicle }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Vehicle registration error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// GET - Get user's vehicles
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
    } catch (error) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Invalid token' 
        },
        { status: 401 }
      );
    }

    // Only customers can view their vehicles
    if (decoded.userType !== 'CUSTOMER') {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Only customers can view vehicles' 
        },
        { status: 403 }
      );
    }

    // Get user's vehicles
    const vehicles = await prisma.vehicle.findMany({
      where: {
        customerId: decoded.id,
      },
      orderBy: {
        id: 'desc',
      },
    });

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: { vehicles }
      }
    );

  } catch (error) {
    console.error('Get vehicles error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}