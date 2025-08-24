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

interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
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

// GET - Get user profile
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

    // Get user profile
    const user = await prisma.user.findUnique({
      where: {
        id: decoded.id,
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        userType: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'User not found' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: { user }
      }
    );

  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// PATCH - Update user profile
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
    } catch (error) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Invalid token' 
        },
        { status: 401 }
      );
    }

    const body: ProfileUpdateData = await request.json();
    const { firstName, lastName, phoneNumber } = body;

    // Validate at least one field is provided
    if (!firstName && !lastName && phoneNumber === undefined) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'At least one field must be provided for update' 
        },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber || null;

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: {
        id: decoded.id,
      },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        userType: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'Profile updated successfully',
        data: { user: updatedUser }
      }
    );

  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}