import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail, generatePasswordResetEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    // Always return success for security (don't reveal if email exists)
    const successResponse = NextResponse.json({
      success: true,
      message: 'If an account with that email exists, you will receive a password reset link shortly.'
    });

    if (!user) {
      return successResponse;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Save reset token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpires,
        updatedAt: new Date()
      }
    });

    // Generate email content
    const emailContent = generatePasswordResetEmail(resetToken, user.firstName);
    emailContent.to = user.email;

    // Send reset email
    try {
      await sendEmail(emailContent);
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      // In development, we're just logging, so this won't fail
      // In production, you might want to handle this differently
    }

    return successResponse;

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}