import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import type { ApiResponse, ServiceRequestData, ServiceRequest } from '@/types/auth';
import { calculateDistance } from '@/utils/common';
import { notifyGarageAboutNewRequest } from '@/utils/notifications';

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

// GET - Get user's service requests
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const garageId = searchParams.get('garage_id');
    const userLat = searchParams.get('lat');
    const userLng = searchParams.get('lng');

    const whereClause: Record<string, unknown> = {};

    // Filter based on user type
    if (decoded.userType === 'CUSTOMER') {
      whereClause.customerId = decoded.id;
    } else if (decoded.userType === 'MECHANIC') {
      // Get mechanic's garage
      const mechanic = await prisma.mechanic.findUnique({
        where: { userId: decoded.id },
        select: { garageId: true, approved: true }
      });

      if (!mechanic || !mechanic.approved) {
        return NextResponse.json<ApiResponse>(
          { 
            success: false,
            error: 'Mechanic not found or not approved' 
          },
          { status: 403 }
        );
      }

      whereClause.garageId = mechanic.garageId;
    } else if (decoded.userType === 'GARAGE_ADMIN') {
      // Get admin's garages
      const adminGarages = await prisma.garage.findMany({
        where: { 
          adminId: decoded.id,
          approved: true 
        },
        select: { id: true }
      });

      const garageIds = adminGarages.map(g => g.id);
      if (garageIds.length === 0) {
        return NextResponse.json<ApiResponse<{ requests: ServiceRequest[] }>>(
          {
            success: true,
            data: { requests: [] }
          }
        );
      }

      whereClause.garageId = {
        in: garageIds
      };
    } else if (decoded.userType === 'SYSTEM_ADMIN') {
      // System admin can see all requests, no additional filter needed
    } else {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Unauthorized' 
        },
        { status: 403 }
      );
    }

    // Add status filter if provided
    if (status) {
      whereClause.status = status;
    }

    // Add garage filter if provided
    if (garageId) {
      whereClause.garageId = parseInt(garageId);
    }

    const requests = await prisma.serviceRequest.findMany({
      where: whereClause,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          }
        },
        garage: {
          select: {
            id: true,
            garageName: true,
            latitude: true,
            longitude: true,
          }
        },
        mechanic: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          }
        },
        vehicle: {
          select: {
            id: true,
            vehicleType: true,
            plateNumber: true,
            plateCode: true,
            countryCode: true,
            color: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Process requests and add distance if user location provided
    const processedRequests = requests.map(request => {
      let distance: number | undefined;
      
      if (userLat && userLng) {
        const lat = parseFloat(userLat);
        const lng = parseFloat(userLng);
        if (!isNaN(lat) && !isNaN(lng)) {
          distance = calculateDistance(lat, lng, request.latitude, request.longitude);
        }
      }

      return {
        ...request,
        createdAt: request.createdAt.toISOString(),
        distance
      };
    });

    return NextResponse.json<ApiResponse<{ requests: ServiceRequest[] }>>(
      {
        success: true,
        data: { requests: processedRequests }
      }
    );

  } catch (error) {
    console.error('Get service requests error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// POST - Create a new service request (CUSTOMER only)
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

    // Only customers can create service requests
    if (decoded.userType !== 'CUSTOMER') {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Only customers can create service requests' 
        },
        { status: 403 }
      );
    }

    const body: ServiceRequestData = await request.json();
    const { garageId, vehicleId, latitude, longitude } = body;

    // Validate required fields
    if (!garageId || !vehicleId || latitude === undefined || longitude === undefined) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Garage ID, vehicle ID, latitude, and longitude are required' 
        },
        { status: 400 }
      );
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Invalid coordinates' 
        },
        { status: 400 }
      );
    }

    // Verify the garage exists and is approved
    const garage = await prisma.garage.findUnique({
      where: { id: garageId },
      select: { 
        id: true, 
        approved: true, 
        available: true, 
        removed: true 
      }
    });

    if (!garage) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Garage not found' 
        },
        { status: 404 }
      );
    }

    if (!garage.approved || !garage.available || garage.removed) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Garage is not available for service requests' 
        },
        { status: 400 }
      );
    }

    // Verify the vehicle belongs to the customer
    const vehicle = await prisma.vehicle.findUnique({
      where: { 
        id: vehicleId,
        customerId: decoded.id 
      }
    });

    if (!vehicle) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Vehicle not found or does not belong to you' 
        },
        { status: 404 }
      );
    }

    // Check if customer has pending requests for the same vehicle
    const existingRequest = await prisma.serviceRequest.findFirst({
      where: {
        customerId: decoded.id,
        vehicleId: vehicleId,
        status: {
          in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS']
        }
      }
    });

    if (existingRequest) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'You already have a pending request for this vehicle' 
        },
        { status: 409 }
      );
    }

    // Create the service request
    const serviceRequest = await prisma.serviceRequest.create({
      data: {
        customerId: decoded.id,
        garageId,
        vehicleId,
        latitude,
        longitude,
        status: 'PENDING'
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          }
        },
        garage: {
          select: {
            id: true,
            garageName: true,
            latitude: true,
            longitude: true,
          }
        },
        vehicle: {
          select: {
            id: true,
            vehicleType: true,
            plateNumber: true,
            plateCode: true,
            countryCode: true,
            color: true,
          }
        }
      }
    });

    // Notify garage admin and mechanics about the new request
    const customerName = `${serviceRequest.customer.firstName} ${serviceRequest.customer.lastName}`;
    const vehicleInfo = `${serviceRequest.vehicle.color} ${serviceRequest.vehicle.vehicleType} (${serviceRequest.vehicle.plateCode}-${serviceRequest.vehicle.plateNumber})`;
    
    await notifyGarageAboutNewRequest(
      decoded.id,
      garageId,
      customerName,
      vehicleInfo
    );

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'Service request created successfully',
        data: { 
          request: {
            ...serviceRequest,
            createdAt: serviceRequest.createdAt.toISOString()
          }
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Service request creation error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}