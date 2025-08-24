import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { ApiResponse } from '@/types/auth';

interface Garage {
  id: number;
  garageName: string;
  adminId: number;
  latitude: number;
  longitude: number;
  rating: number;
  available: boolean;
  approved: boolean;
  createdAt: string;
  admin: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

// GET - Get approved garages
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeUnapproved = searchParams.get('include_unapproved') === 'true';

    let whereClause: any = {
      removed: false,
    };

    // By default, only show approved garages
    if (!includeUnapproved) {
      whereClause.approved = true;
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
        }
      },
      orderBy: [
        { approved: 'desc' }, // Approved first
        { rating: 'desc' },   // Then by rating
        { createdAt: 'desc' } // Then by creation date
      ]
    });

    const formattedGarages = garages.map(garage => ({
      ...garage,
      createdAt: garage.createdAt.toISOString()
    }));

    return NextResponse.json<ApiResponse<{ garages: Garage[] }>>(
      {
        success: true,
        data: { garages: formattedGarages }
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