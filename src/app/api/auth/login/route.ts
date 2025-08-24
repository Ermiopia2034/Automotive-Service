import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/utils/password';
import { UserType } from '@/generated/prisma';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const { username, password, userType } = await request.json();

    if (!username || !password || !userType) {
      return NextResponse.json(
        { error: 'Username, password, and user type are required' },
        { status: 400 }
      );
    }

    // Validate user type
    if (!Object.values(UserType).includes(userType)) {
      return NextResponse.json(
        { error: 'Invalid user type' },
        { status: 400 }
      );
    }

    // Find user by username and type
    const user = await prisma.user.findFirst({
      where: {
        username,
        userType: userType as UserType,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        userType: user.userType,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: '24h' }
    );

    // Return user data without password
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      userType: user.userType,
    };

    const response = NextResponse.json({
      success: true,
      user: userData,
      token,
    });

    // Set HTTP-only cookie with the token
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}