import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateDistance } from '@/utils/common';
import type { ApiResponse } from '@/types/auth';

interface ProcessedGarageData {
  id: number;
  garageName: string;
  adminId: number;
  latitude: number;
  longitude: number;
  rating: number;
  available: boolean;
  removed: boolean;
  approved: boolean;
  createdAt: string;
  admin: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  services: Array<{
    id: number;
    garageId: number;
    serviceId: number;
    available: boolean;
    service: {
      id: number;
      serviceName: string;
      estimatedPrice: number;
    };
  }>;
  mechanicsCount: number;
  servicesCount: number;
  distance: number | undefined;
}


// GET - Get approved garages with optional location-based filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeUnapproved = searchParams.get('include_unapproved') === 'true';
    const userLatString = searchParams.get('lat');
    const userLngString = searchParams.get('lng');
    const maxDistanceString = searchParams.get('max_distance');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sort') || 'default'; // default, distance, rating, name

    const whereClause: Record<string, unknown> = {
      removed: false,
    };

    // By default, only show approved garages
    if (!includeUnapproved) {
      whereClause.approved = true;
    }

    // Filter by search term if provided
    if (search) {
      whereClause.garageName = {
        contains: search,
        mode: 'insensitive'
      };
    }

    const garages = await prisma.garage.findMany({
      where: whereClause,
      include: {
        admin: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        services: {
          where: {
            available: true,
            service: {
              removed: false
            }
          },
          include: {
            service: {
              select: {
                id: true,
                serviceName: true,
                estimatedPrice: true,
              }
            }
          }
        },
        _count: {
          select: {
            mechanics: {
              where: {
                approved: true,
                removed: false
              }
            }
          }
        }
      }
    });

    let processedGarages = garages.map(garage => ({
      ...garage,
      createdAt: garage.createdAt.toISOString(),
      mechanicsCount: garage._count.mechanics,
      servicesCount: garage.services.length,
      distance: undefined as number | undefined
    }));

    // Calculate distances if user location is provided
    const userLat = userLatString ? parseFloat(userLatString) : null;
    const userLng = userLngString ? parseFloat(userLngString) : null;
    const maxDistance = maxDistanceString ? parseFloat(maxDistanceString) : null;

    if (userLat !== null && userLng !== null && !isNaN(userLat) && !isNaN(userLng)) {
      processedGarages = processedGarages.map(garage => ({
        ...garage,
        distance: calculateDistance(userLat, userLng, garage.latitude, garage.longitude)
      }));

      // Filter by maximum distance if specified
      if (maxDistance && maxDistance > 0) {
        processedGarages = processedGarages.filter(garage =>
          garage.distance !== undefined && garage.distance <= maxDistance
        );
      }

      // Sort by distance if requested or if it's the default with location
      if (sortBy === 'distance' || (sortBy === 'default' && userLat && userLng)) {
        processedGarages.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      }
    }

    // Apply other sorting options
    if (sortBy === 'rating') {
      processedGarages.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'name') {
      processedGarages.sort((a, b) => a.garageName.localeCompare(b.garageName));
    } else if (sortBy === 'default' && (!userLat || !userLng)) {
      // Default sorting without location
      processedGarages.sort((a, b) => {
        // Approved first
        if (a.approved !== b.approved) {
          return b.approved ? 1 : -1;
        }
        // Then by rating
        if (a.rating !== b.rating) {
          return b.rating - a.rating;
        }
        // Then by creation date
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    return NextResponse.json<ApiResponse<{ garages: ProcessedGarageData[] }>>(
      {
        success: true,
        data: { garages: processedGarages }
      }
    );

  } catch (error) {
    console.error('Get garages error:', error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}