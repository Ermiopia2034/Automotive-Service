import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { ApplicationType } from '@/generated/prisma';
import type { ApiResponse } from '@/types/auth';
import { sendEmail, generateApplicationApprovalEmail } from '@/lib/email';

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

// PATCH - Approve or reject application
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

    const applicationId = parseInt(id);
    if (isNaN(applicationId)) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Invalid application ID' 
        },
        { status: 400 }
      );
    }

    const { approved } = await request.json();
    
    if (typeof approved !== 'boolean') {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Approved status must be a boolean' 
        },
        { status: 400 }
      );
    }

    // Get the application
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
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

    if (!application) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Application not found' 
        },
        { status: 404 }
      );
    }

    // Check permissions
    let canApprove = false;

    if (decoded.userType === 'SYSTEM_ADMIN') {
      canApprove = true;
    } else if (decoded.userType === 'GARAGE_ADMIN' && application.applicationType === ApplicationType.MECHANIC) {
      // Garage admins can approve mechanic applications for their garages
      const garageAdmin = await prisma.garage.findFirst({
        where: {
          adminId: decoded.id,
          id: application.garageId || 0,
          approved: true,
          removed: false,
        }
      });
      canApprove = !!garageAdmin;
    }

    if (!canApprove) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Insufficient permissions to approve this application' 
        },
        { status: 403 }
      );
    }

    // Update application status
    const updatedApplication = await prisma.application.update({
      where: { id: applicationId },
      data: { approved },
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

    // If approved, create corresponding records
    if (approved) {
      if (application.applicationType === ApplicationType.GARAGE && application.garageId) {
        // Approve the garage
        await prisma.garage.update({
          where: { id: application.garageId },
          data: { approved: true }
        });
      } else if (application.applicationType === ApplicationType.MECHANIC && application.garageId) {
        // Create mechanic record
        await prisma.mechanic.create({
          data: {
            userId: application.applicantId,
            garageId: application.garageId,
            approved: true,
          }
        });

        // Update user type to MECHANIC
        await prisma.user.update({
          where: { id: application.applicantId },
          data: { userType: 'MECHANIC' }
        });
      }
    }

    // Send email notification
    try {
      const applicantName = `${application.applicant.firstName} ${application.applicant.lastName}`;
      const garageName = application.garage?.garageName || 'Unknown Garage';
      
      const emailTemplate = generateApplicationApprovalEmail(
        applicantName,
        application.applicationType,
        garageName,
        approved
      );
      
      await sendEmail({
        ...emailTemplate,
        to: application.applicant.email,
      });
      
      console.log(`Application ${approved ? 'approval' : 'rejection'} email sent to:`, application.applicant.email);
    } catch (emailError) {
      console.error('Failed to send application notification email:', emailError);
      // Don't fail the request if email fails - the application status has already been updated
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: `Application ${approved ? 'approved' : 'rejected'} successfully`,
        data: { application: updatedApplication }
      }
    );

  } catch (error) {
    console.error('Application approval error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}