import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { ApiResponse } from '@/types/auth';

interface ExtendedSession {
  user: {
    id: string;
    userType: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
  };
}

// PATCH /api/payments/[id] - Update payment status (Admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession | null;

    if (!session?.user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.userType !== 'SYSTEM_ADMIN') {
      return NextResponse.json({
        success: false,
        error: 'Admin access required'
      }, { status: 403 });
    }

    const { id } = await params;
    const paymentId = parseInt(id);
    if (isNaN(paymentId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid payment ID'
      }, { status: 400 });
    }

    const body = await request.json();
    const { status, notes } = body;

    // Validate status
    const validStatuses = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid payment status'
      }, { status: 400 });
    }

    // Check if payment exists
    const existingPayment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        customer: true,
        garage: true,
        serviceRequest: true
      }
    });

    if (!existingPayment) {
      return NextResponse.json({
        success: false,
        error: 'Payment not found'
      }, { status: 404 });
    }

    // Update payment
    const updateData: {
      status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
      updatedAt: Date;
      paymentDate?: Date;
      notes?: string;
    } = {
      status: status as 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED',
      updatedAt: new Date()
    };

    // Set payment date if completing payment
    if (status === 'COMPLETED' && !existingPayment.paymentDate) {
      updateData.paymentDate = new Date();
    }

    // Add notes if provided
    if (notes) {
      updateData.notes = notes;
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: updateData,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true
          }
        },
        garage: {
          select: {
            id: true,
            garageName: true
          }
        },
        serviceRequest: {
          select: {
            id: true,
            status: true
          }
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            status: true
          }
        }
      }
    });

    // Create notification for customer about payment status change
    if (existingPayment.customerId !== parseInt(session.user.id)) {
      await prisma.notification.create({
        data: {
          senderId: parseInt(session.user.id),
          receiverId: existingPayment.customerId,
          type: 'PAYMENT_STATUS_UPDATE',
          title: `Payment Status Updated`,
          message: `Your payment of $${existingPayment.amount.toFixed(2)} for ${existingPayment.garage.garageName} has been ${status.toLowerCase()}.`
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        payment: updatedPayment
      },
      message: `Payment status updated to ${status}`
    });

  } catch (error) {
    console.error('Payment update error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update payment status'
    }, { status: 500 });
  }
}

// GET /api/payments/[id] - Get specific payment details (Admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession | null;

    if (!session?.user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.userType !== 'SYSTEM_ADMIN') {
      return NextResponse.json({
        success: false,
        error: 'Admin access required'
      }, { status: 403 });
    }

    const { id } = await params;
    const paymentId = parseInt(id);
    if (isNaN(paymentId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid payment ID'
      }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            email: true,
            phoneNumber: true
          }
        },
        garage: {
          select: {
            id: true,
            garageName: true,
            latitude: true,
            longitude: true,
            rating: true
          }
        },
        serviceRequest: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            vehicle: {
              select: {
                id: true,
                vehicleType: true,
                plateNumber: true,
                plateCode: true
              }
            }
          }
        },
        invoice: {
          include: {
            invoiceItems: {
              include: {
                service: true
              }
            }
          }
        }
      }
    });

    if (!payment) {
      return NextResponse.json({
        success: false,
        error: 'Payment not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        payment
      }
    });

  } catch (error) {
    console.error('Payment fetch error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch payment details'
    }, { status: 500 });
  }
}