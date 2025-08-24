import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, hashPassword } from '@/utils/password';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    // Get token from cookie or Authorization header
    const token = request.cookies.get('auth-token')?.value || 
                 request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify and decode token
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as { id: number };
    const userId = decoded.id;

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password);
    
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Validate new password
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password in database
    await prisma.user.update({
      where: { id: userId },
      data: { 
        password: hashedNewPassword,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}