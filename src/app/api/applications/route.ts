import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { ApplicationType } from '@/generated/prisma';
import type { MechanicApplicationData, GarageApplicationData, ApiResponse, Application } from '@/types/auth';
import { hashPassword } from '@/utils/password';

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

// POST - Submit an application (mechanic or garage)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;

    if (!type || !Object.values(ApplicationType).includes(type)) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Valid application type is required (GARAGE or MECHANIC)'
        },
        { status: 400 }
      );
    }

    // Garage applications don't require authentication (new business owners)
    // Mechanic applications require authentication (existing users applying to garages)
    if (type === ApplicationType.MECHANIC) {
      const token = getTokenFromRequest(request);
      
      if (!token) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Authentication required for mechanic applications'
          },
          { status: 401 }
        );
      }

      // Verify and decode JWT token for mechanic applications
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

      return handleMechanicApplication(body, decoded);
    } else if (type === ApplicationType.GARAGE) {
      return handleGarageApplication(body);
    }

    // This should never be reached due to the type validation above
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: 'Invalid application type'
      },
      { status: 400 }
    );

  } catch (error) {
    console.error('Application submission error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// GET - Get applications (for admins and applicants)
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
    const type = searchParams.get('type');
    const status = searchParams.get('status'); // pending, approved, rejected

    let whereClause: Record<string, unknown> = {};

    // System admins can see all applications
    // Garage admins can see mechanic applications for their garages
    // Regular users can see their own applications
    if (decoded.userType === 'SYSTEM_ADMIN') {
      if (type) {
        whereClause.applicationType = type;
      }
      if (status === 'pending') {
        whereClause.approved = null;
      } else if (status === 'approved') {
        whereClause.approved = true;
      } else if (status === 'rejected') {
        whereClause.approved = false;
      }
    } else if (decoded.userType === 'GARAGE_ADMIN') {
      // Get garage admin's garage
      const garageAdmin = await prisma.garage.findFirst({
        where: {
          adminId: decoded.id,
          approved: true,
          removed: false,
        }
      });

      if (!garageAdmin) {
        return NextResponse.json<ApiResponse>(
          { 
            success: false,
            error: 'Garage not found or not approved' 
          },
          { status: 404 }
        );
      }

      // Only show mechanic applications for their garage
      whereClause = {
        applicationType: ApplicationType.MECHANIC,
        garageId: garageAdmin.id,
      };

      if (status === 'pending') {
        whereClause.approved = null;
      } else if (status === 'approved') {
        whereClause.approved = true;
      } else if (status === 'rejected') {
        whereClause.approved = false;
      }
    } else {
      // Regular users can only see their own applications
      whereClause.applicantId = decoded.id;
    }

    const applications = await prisma.application.findMany({
      where: whereClause,
      include: {
        applicant: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        garage: {
          select: {
            id: true,
            garageName: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      }
    });

    const formattedApplications = applications.map(app => ({
      ...app,
      createdAt: app.createdAt.toISOString(),
      garageId: app.garageId || undefined,
      approved: app.approved
    }));

    return NextResponse.json<ApiResponse<{ applications: Application[] }>>(
      {
        success: true,
        data: { applications: formattedApplications }
      }
    );

  } catch (error) {
    console.error('Get applications error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
// Helper function to handle mechanic applications
async function handleMechanicApplication(body: MechanicApplicationData, decoded: JwtPayload) {
  const { garageId }: MechanicApplicationData = body;
  
  if (!garageId) {
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Garage ID is required for mechanic applications' 
      },
      { status: 400 }
    );
  }

  // Check if user already has a pending mechanic application
  const existingApplication = await prisma.application.findFirst({
    where: {
      applicantId: decoded.id,
      applicationType: ApplicationType.MECHANIC,
      approved: null, // pending applications
    }
  });

  if (existingApplication) {
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'You already have a pending mechanic application' 
      },
      { status: 409 }
    );
  }

  // Verify garage exists and is approved
  const garage = await prisma.garage.findFirst({
    where: {
      id: garageId,
      approved: true,
      removed: false,
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

  // Create mechanic application
  const application = await prisma.application.create({
    data: {
      applicantId: decoded.id,
      applicationType: ApplicationType.MECHANIC,
      garageId: garageId,
    },
    include: {
      applicant: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          email: true,
        }
      },
      garage: {
        select: {
          id: true,
          garageName: true,
        }
      }
    }
  });

  return NextResponse.json<ApiResponse>(
    {
      success: true,
      message: 'Mechanic application submitted successfully',
      data: { application }
    },
    { status: 201 }
  );
}

// Helper function to handle garage applications (no authentication required)
async function handleGarageApplication(body: GarageApplicationData) {
  const { garageName, latitude, longitude, adminEmail, adminUsername, adminPassword, adminFirstName, adminLastName }: GarageApplicationData = body;
  
  if (!garageName || latitude === undefined || longitude === undefined || !adminEmail || !adminUsername || !adminPassword || !adminFirstName || !adminLastName) {
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'All fields are required for garage applications (garageName, latitude, longitude, adminEmail, adminUsername, adminPassword, adminFirstName, adminLastName)' 
      },
      { status: 400 }
    );
  }

  // Check if username or email already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { username: adminUsername },
        { email: adminEmail }
      ]
    }
  });

  if (existingUser) {
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: existingUser.username === adminUsername 
          ? 'Username already exists' 
          : 'Email already exists' 
      },
      { status: 409 }
    );
  }

  // Create the garage admin user first
  const hashedPassword = await hashPassword(adminPassword);
  
  const adminUser = await prisma.user.create({
    data: {
      username: adminUsername,
      email: adminEmail,
      firstName: adminFirstName,
      lastName: adminLastName,
      password: hashedPassword,
      userType: 'GARAGE_ADMIN',
    }
  });

  // Create the garage (unapproved)
  const garage = await prisma.garage.create({
    data: {
      garageName,
      adminId: adminUser.id,
      latitude,
      longitude,
      approved: false,
    }
  });

  // Create the garage application
  const application = await prisma.application.create({
    data: {
      applicantId: adminUser.id,
      applicationType: ApplicationType.GARAGE,
      garageId: garage.id,
    },
    include: {
      applicant: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          email: true,
        }
      },
      garage: {
        select: {
          id: true,
          garageName: true,
        }
      }
    }
  });

  return NextResponse.json<ApiResponse>(
    {
      success: true,
      message: 'Garage application submitted successfully',
      data: { application }
    },
    { status: 201 }
  );
}