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

function getTokenFromRequest(request: NextRequest): string | null {
  const tokenFromCookie = request.cookies.get('auth-token')?.value;
  if (tokenFromCookie) return tokenFromCookie;

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

// GET /api/invoices - Get invoices for a specific user or garage
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
    const invoiceId = searchParams.get('invoiceId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // If specific invoice ID is requested
    if (invoiceId) {
      const invoice = await prisma.invoice.findFirst({
        where: {
          id: parseInt(invoiceId),
          OR: [
            { customerId: decoded.id },
            {
              garage: {
                adminId: decoded.id
              }
            }
          ]
        },
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
              longitude: true
            }
          },
          serviceRequest: {
            select: {
              id: true,
              status: true,
              createdAt: true
            }
          },
          payment: {
            select: {
              id: true,
              amount: true,
              paymentMethod: true,
              status: true,
              transactionId: true,
              paymentDate: true
            }
          },
          invoiceItems: {
            include: {
              service: {
                select: {
                  serviceName: true
                }
              }
            }
          }
        }
      });

      if (!invoice) {
        return NextResponse.json({
          success: false,
          error: 'Invoice not found or access denied'
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: { invoice }
      });
    }

    const whereClause: Record<string, unknown> = {};

    if (garageId) {
      // Garage admin can view invoices for their garage
      const garage = await prisma.garage.findFirst({
        where: {
          id: parseInt(garageId),
          adminId: decoded.id
        }
      });

      if (!garage) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized to view invoices for this garage'
        }, { status: 403 });
      }

      whereClause.garageId = parseInt(garageId);
    } else if (customerId) {
      // Users can only view their own invoices
      if (parseInt(customerId) !== decoded.id) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized to view other customers\' invoices'
        }, { status: 403 });
      }
      whereClause.customerId = parseInt(customerId);
    } else {
      // Default to current user's invoices
      whereClause.customerId = decoded.id;
    }

    const [invoices, totalCount] = await Promise.all([
      prisma.invoice.findMany({
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
          payment: {
            select: {
              id: true,
              amount: true,
              paymentMethod: true,
              status: true,
              transactionId: true
            }
          },
          invoiceItems: {
            include: {
              service: {
                select: {
                  serviceName: true
                }
              }
            }
          }
        },
        orderBy: { issuedDate: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.invoice.count({ where: whereClause })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        invoices,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page
      }
    });

  } catch (error) {
    console.error('Invoices fetch error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch invoices'
    }, { status: 500 });
  }
}

// POST /api/invoices - Generate invoice for a service request
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

    const body = await request.json();
    const { serviceRequestId, items } = body;

    if (!serviceRequestId) {
      return NextResponse.json({
        success: false,
        error: 'Service request ID is required'
      }, { status: 400 });
    }

    // Validate service request exists and user has access
    const serviceRequest = await prisma.serviceRequest.findFirst({
      where: {
        id: serviceRequestId,
        OR: [
          { customerId: decoded.id },
          {
            garage: {
              adminId: decoded.id
            }
          }
        ]
      },
      include: {
        customer: true,
        garage: true,
        vehicle: true
      }
    });

    if (!serviceRequest) {
      return NextResponse.json({
        success: false,
        error: 'Service request not found or access denied'
      }, { status: 404 });
    }

    // Check if invoice already exists
    const existingInvoice = await prisma.invoice.findFirst({
      where: { serviceRequestId: serviceRequestId }
    });

    if (existingInvoice) {
      return NextResponse.json({
        success: false,
        error: 'Invoice already exists for this service request'
      }, { status: 400 });
    }

    // Calculate totals
    let subtotal = 0;
    const invoiceItems = [];

    if (items && Array.isArray(items)) {
      // Use provided items
      for (const item of items) {
        const itemTotal = item.quantity * item.unitPrice;
        subtotal += itemTotal;

        invoiceItems.push({
          serviceId: item.serviceId || null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: itemTotal
        });
      }
    } else {
      // Generate items from service request (if completed)
      if (serviceRequest.status === 'COMPLETED') {
        // Get completed services for this request
        const ongoingServices = await prisma.ongoingService.findMany({
          where: {
            statusId: {
              in: await prisma.vehicleStatus.findMany({
                where: { serviceRequestId: serviceRequestId },
                select: { id: true }
              }).then(statuses => statuses.map(s => s.id))
            },
            serviceFinished: true
          },
          include: {
            service: true
          }
        });

        for (const ongoingService of ongoingServices) {
          const itemTotal = ongoingService.totalPrice;
          subtotal += itemTotal;

          invoiceItems.push({
            serviceId: ongoingService.serviceId,
            description: ongoingService.service.serviceName,
            quantity: 1,
            unitPrice: ongoingService.service.estimatedPrice,
            totalPrice: itemTotal
          });
        }
      } else {
        return NextResponse.json({
          success: false,
          error: 'Service request must be completed to generate invoice'
        }, { status: 400 });
      }
    }

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: invoiceNumber,
        customerId: serviceRequest.customerId,
        garageId: serviceRequest.garageId,
        serviceRequestId: serviceRequestId,
        subtotal: subtotal,
        totalAmount: subtotal, // Add tax/discount logic here if needed
        status: 'unpaid',
        notes: body.notes || null,
        invoiceItems: {
          create: invoiceItems
        }
      },
      include: {
        invoiceItems: {
          include: {
            service: {
              select: {
                serviceName: true
              }
            }
          }
        },
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
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Invoice generated successfully',
      data: { invoice }
    });

  } catch (error) {
    console.error('Invoice generation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate invoice'
    }, { status: 500 });
  }
}