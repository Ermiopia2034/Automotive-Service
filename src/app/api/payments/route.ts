import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { notifyPaymentCompleted, notifyInvoiceGenerated } from '@/utils/notifications';
import type { ApiResponse } from '@/types/auth';

interface JwtPayload {
  id: number;
  username: string;
  email: string;
  userType: string;
}

function getTokenFromRequest(request: NextRequest): string | null {
  const tokenFromCookie = request.cookies.get('auth-token')?.value;
  if (tokenFromCookie) return tokenFromCookie;

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

interface PaymentSubmission {
  serviceRequestId?: number;
  amount: number;
  paymentMethod: string;
  notes?: string;
}

// POST /api/payments - Create a new payment
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const token = getTokenFromRequest(request);
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Verify and decode JWT token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as JwtPayload;
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Invalid token'
      }, { status: 401 });
    }

    const body: PaymentSubmission = await request.json();
    const { serviceRequestId, amount, paymentMethod, notes } = body;

    // Validate required fields
    if (!amount || !paymentMethod) {
      return NextResponse.json({
        success: false,
        error: 'Amount and payment method are required'
      }, { status: 400 });
    }

    // Validate amount
    if (amount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Amount must be greater than 0'
      }, { status: 400 });
    }

    // Validate payment method
    const validMethods = ['CASH', 'CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'INSURANCE'];
    if (!validMethods.includes(paymentMethod)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid payment method'
      }, { status: 400 });
    }

    let garageId: number;
    const customerId: number = decoded.id;

    if (serviceRequestId) {
      // Validate service request exists and belongs to the customer
      const serviceRequest = await prisma.serviceRequest.findFirst({
        where: {
          id: serviceRequestId,
          customerId: customerId
        },
        include: {
          garage: true
        }
      });

      if (!serviceRequest) {
        return NextResponse.json({
          success: false,
          error: 'Service request not found or access denied'
        }, { status: 404 });
      }

      garageId = serviceRequest.garageId;
    } else {
      // For general payments, we need to get garage from query params or body
      const { searchParams } = new URL(request.url);
      const garageParam = searchParams.get('garageId');

      if (!garageParam) {
        return NextResponse.json({
          success: false,
          error: 'Garage ID is required for general payments'
        }, { status: 400 });
      }

      garageId = parseInt(garageParam);

      // Validate garage exists and is approved
      const garage = await prisma.garage.findFirst({
        where: {
          id: garageId,
          approved: true,
          removed: false
        }
      });

      if (!garage) {
        return NextResponse.json({
          success: false,
          error: 'Garage not found or not available'
        }, { status: 404 });
      }
    }

    // Generate transaction ID
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create the payment
    const payment = await prisma.payment.create({
      data: {
        customerId: customerId,
        garageId: garageId,
        serviceRequestId: serviceRequestId || null,
        amount: amount,
        paymentMethod: paymentMethod as 'CASH' | 'CARD' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'INSURANCE',
        status: 'COMPLETED', // For now, mark as completed immediately
        transactionId: transactionId,
        paymentDate: new Date(),
        notes: notes || null
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            username: true
          }
        },
        garage: {
          select: {
            garageName: true
          }
        },
        serviceRequest: serviceRequestId ? {
          select: {
            id: true,
            status: true
          }
        } : false
      }
    });

    // Create invoice for the payment
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const invoice = await prisma.invoice.create({
      data: {
        paymentId: payment.id,
        invoiceNumber: invoiceNumber,
        customerId: customerId,
        garageId: garageId,
        serviceRequestId: serviceRequestId || null,
        subtotal: amount,
        totalAmount: amount,
        status: 'paid',
        paidDate: new Date(),
        notes: notes || null
      }
    });

    // Update payment with invoice reference
    await prisma.payment.update({
      where: { id: payment.id },
      data: { invoice: { connect: { id: invoice.id } } }
    });

    // Send notifications
    try {
      await notifyPaymentCompleted(payment.id);
      await notifyInvoiceGenerated(invoice.id);
    } catch (notificationError) {
      console.error('Error sending payment notifications:', notificationError);
      // Don't fail the payment if notifications fail
    }

    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        payment: {
          id: payment.id,
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          status: payment.status,
          transactionId: payment.transactionId,
          paymentDate: payment.paymentDate,
          createdAt: payment.createdAt
        },
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: invoice.totalAmount,
          status: invoice.status
        }
      }
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process payment'
    }, { status: 500 });
  }
}

// GET /api/payments - Get payments for a specific user or garage
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const token = getTokenFromRequest(request);
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Verify and decode JWT token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as JwtPayload;
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Invalid token'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const garageId = searchParams.get('garageId');
    const customerId = searchParams.get('customerId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {};

    if (garageId) {
      // Garage admin can view payments for their garage
      const garage = await prisma.garage.findFirst({
        where: {
          id: parseInt(garageId),
          adminId: decoded.id
        }
      });

      if (!garage) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized to view payments for this garage'
        }, { status: 403 });
      }

      whereClause.garageId = parseInt(garageId);
    } else if (customerId) {
      // Users can only view their own payments
      if (parseInt(customerId) !== decoded.id) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized to view other customers\' payments'
        }, { status: 403 });
      }
      whereClause.customerId = parseInt(customerId);
    } else {
      // Default to current user's payments
      whereClause.customerId = decoded.id;
    }

    const [payments, totalCount] = await Promise.all([
      prisma.payment.findMany({
        where: whereClause,
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
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.payment.count({ where: whereClause })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        payments,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page
      }
    });

  } catch (error) {
    console.error('Payments fetch error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch payments'
    }, { status: 500 });
  }
}