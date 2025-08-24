import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import type { ApiResponse, Notification } from '@/types/auth';

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

// GET - Get user's notifications
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
    const unreadOnly = searchParams.get('unread_only') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const whereClause: Record<string, unknown> = {
      receiverId: decoded.id
    };

    if (unreadOnly) {
      whereClause.read = false;
    }

    // Get total count for pagination
    const totalCount = await prisma.notification.count({
      where: whereClause
    });

    // Get notifications
    const notifications = await prisma.notification.findMany({
      where: whereClause,
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    });

    const processedNotifications = notifications.map(notification => ({
      ...notification,
      createdAt: notification.createdAt.toISOString()
    }));

    return NextResponse.json<ApiResponse<{ notifications: Notification[], total: number, unread: number }>>(
      {
        success: true,
        data: { 
          notifications: processedNotifications,
          total: totalCount,
          unread: await prisma.notification.count({
            where: {
              receiverId: decoded.id,
              read: false
            }
          })
        }
      }
    );

  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// PATCH - Mark notifications as read
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
    } catch {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Invalid token' 
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { notificationIds, markAllAsRead } = body;

    if (markAllAsRead) {
      // Mark all notifications as read for this user
      await prisma.notification.updateMany({
        where: {
          receiverId: decoded.id,
          read: false
        },
        data: {
          read: true
        }
      });

      return NextResponse.json<ApiResponse>(
        {
          success: true,
          message: 'All notifications marked as read'
        }
      );
    }

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Notification IDs array is required' 
        },
        { status: 400 }
      );
    }

    // Validate that all notification IDs are numbers
    const validIds = notificationIds.filter(id => typeof id === 'number' && !isNaN(id));
    if (validIds.length !== notificationIds.length) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'All notification IDs must be valid numbers' 
        },
        { status: 400 }
      );
    }

    // Mark specific notifications as read (only user's own notifications)
    const updateResult = await prisma.notification.updateMany({
      where: {
        id: { in: validIds },
        receiverId: decoded.id // Ensure user can only update their own notifications
      },
      data: {
        read: true
      }
    });

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: `${updateResult.count} notifications marked as read`
      }
    );

  } catch (error) {
    console.error('Update notifications error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete notifications
export async function DELETE(request: NextRequest) {
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

    const body = await request.json();
    const { notificationIds, deleteAll } = body;

    if (deleteAll) {
      // Delete all notifications for this user
      await prisma.notification.deleteMany({
        where: {
          receiverId: decoded.id
        }
      });

      return NextResponse.json<ApiResponse>(
        {
          success: true,
          message: 'All notifications deleted'
        }
      );
    }

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'Notification IDs array is required' 
        },
        { status: 400 }
      );
    }

    // Validate that all notification IDs are numbers
    const validIds = notificationIds.filter(id => typeof id === 'number' && !isNaN(id));
    if (validIds.length !== notificationIds.length) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false,
          error: 'All notification IDs must be valid numbers' 
        },
        { status: 400 }
      );
    }

    // Delete specific notifications (only user's own notifications)
    const deleteResult = await prisma.notification.deleteMany({
      where: {
        id: { in: validIds },
        receiverId: decoded.id // Ensure user can only delete their own notifications
      }
    });

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: `${deleteResult.count} notifications deleted`
      }
    );

  } catch (error) {
    console.error('Delete notifications error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}