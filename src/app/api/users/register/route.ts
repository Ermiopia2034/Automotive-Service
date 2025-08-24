import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, validatePassword } from '@/utils/password';
import { UserType } from '@/generated/prisma';
import type { CustomerRegistrationData, ApiResponse } from '@/types/auth';

export async function POST(request: NextRequest) {
  try {
    const body: CustomerRegistrationData = await request.json();
    const { username, email, password, firstName, lastName, phoneNumber } = body;

    // Validate required fields
    if (!username || !email || !password || !firstName || !lastName) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Username, email, password, first name, and last name are required' 
        },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Password validation failed',
          data: { errors: passwordValidation.errors }
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Invalid email format' 
        },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUsername) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Username already exists' 
        },
        { status: 409 }
      );
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email }
    });

    if (existingEmail) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Email already exists' 
        },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user with CUSTOMER role
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phoneNumber: phoneNumber || null,
        userType: UserType.CUSTOMER,
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
      },
    });

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'Customer registered successfully',
        data: { user }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Customer registration error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}