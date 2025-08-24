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

interface ServiceUpdateData {
  serviceName?: string;
  estimatedPrice?: number;
  removed?: boolean;
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

// GET - Get specific service by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const serviceId = parseInt(id);

    if (isNaN(serviceId)) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Invalid service ID' 
        },
        { status: 400 }
      );
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        garageServices: {
          where: { available: true },
          include: {
            garage: {
              select: {
                id: true,
                garageName: true,
                available: true,
                approved: true,
              }
            }
          }
        }
      }
    });

    if (!service) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Service not found' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: { service }
      }
    );

  } catch (error) {
    console.error('Get service error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// PATCH - Update service (SYSTEM_ADMIN only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Only system admins can update services
    if (decoded.userType !== 'SYSTEM_ADMIN') {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Only system administrators can update services' 
        },
        { status: 403 }
      );
    }

    const serviceId = parseInt(id);

    if (isNaN(serviceId)) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Invalid service ID' 
        },
        { status: 400 }
      );
    }

    // Check if service exists
    const existingService = await prisma.service.findUnique({
      where: { id: serviceId }
    });

    if (!existingService) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Service not found' 
        },
        { status: 404 }
      );
    }

    const body: ServiceUpdateData = await request.json();
    const { serviceName, estimatedPrice, removed } = body;

    // Validate data if provided
    if (serviceName && serviceName.trim() === '') {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Service name cannot be empty' 
        },
        { status: 400 }
      );
    }

    if (estimatedPrice !== undefined && estimatedPrice < 0) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Estimated price cannot be negative' 
        },
        { status: 400 }
      );
    }

    // If updating service name, check for duplicates (excluding current service)
    if (serviceName && serviceName !== existingService.serviceName) {
      const duplicateService = await prisma.service.findFirst({
        where: {
          serviceName: serviceName,
          removed: false,
          id: { not: serviceId }
        }
      });

      if (duplicateService) {
        return NextResponse.json<ApiResponse>(
          { 
            success: false,
            error: 'Service with this name already exists' 
          },
          { status: 409 }
        );
      }
    }

    // Update service
    const updateData: Record<string, unknown> = {};
    if (serviceName !== undefined) updateData.serviceName = serviceName;
    if (estimatedPrice !== undefined) updateData.estimatedPrice = estimatedPrice;
    if (removed !== undefined) updateData.removed = removed;

    const updatedService = await prisma.service.update({
      where: { id: serviceId },
      data: updateData,
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
        message: 'Service updated successfully',
        data: { service: updatedService }
      }
    );

  } catch (error) {
    console.error('Service update error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// DELETE - Remove service (SYSTEM_ADMIN only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Only system admins can delete services
    if (decoded.userType !== 'SYSTEM_ADMIN') {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Only system administrators can delete services' 
        },
        { status: 403 }
      );
    }

    const serviceId = parseInt(id);

    if (isNaN(serviceId)) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Invalid service ID' 
        },
        { status: 400 }
      );
    }

    // Check if service exists
    const existingService = await prisma.service.findUnique({
      where: { id: serviceId }
    });

    if (!existingService) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Service not found' 
        },
        { status: 404 }
      );
    }

    // Soft delete by marking as removed
    await prisma.service.update({
      where: { id: serviceId },
      data: { removed: true }
    });

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'Service removed successfully'
      }
    );

  } catch (error) {
    console.error('Service deletion error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}