import { prisma } from '@/lib/prisma';

// Notification types
export const NOTIFICATION_TYPES = {
  // Service Request Types
  REQUEST_CREATED: 'REQUEST_CREATED',
  REQUEST_ACCEPTED: 'REQUEST_ACCEPTED',
  REQUEST_IN_PROGRESS: 'REQUEST_IN_PROGRESS',
  REQUEST_COMPLETED: 'REQUEST_COMPLETED',
  REQUEST_CANCELLED: 'REQUEST_CANCELLED',
  
  // Status Update Types
  STATUS_UPDATE: 'STATUS_UPDATE',
  STATUS_APPROVED: 'STATUS_APPROVED',
  STATUS_DECLINED: 'STATUS_DECLINED',
  
  // Service Types
  SERVICE_STARTED: 'SERVICE_STARTED',
  SERVICE_FINISHED: 'SERVICE_FINISHED',
  SERVICE_COMPLETION: 'SERVICE_COMPLETION',
  
  // Additional Service Types
  ADDITIONAL_SERVICE_REQUESTED: 'ADDITIONAL_SERVICE_REQUESTED',
  ADDITIONAL_SERVICE_APPROVED: 'ADDITIONAL_SERVICE_APPROVED',
  ADDITIONAL_SERVICE_DECLINED: 'ADDITIONAL_SERVICE_DECLINED',
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

// Notification templates
export const NOTIFICATION_TEMPLATES = {
  [NOTIFICATION_TYPES.REQUEST_CREATED]: {
    toGarage: (customerName: string, vehicleInfo: string) => ({
      title: 'New Service Request',
      message: `${customerName} has requested assistance for their ${vehicleInfo}. Please review and assign a mechanic.`
    }),
  },
  
  [NOTIFICATION_TYPES.REQUEST_ACCEPTED]: {
    toCustomer: (garageName: string, mechanicName: string) => ({
      title: 'Service Request Accepted',
      message: `${garageName} has accepted your service request. Mechanic ${mechanicName} has been assigned to help you.`
    }),
  },
  
  [NOTIFICATION_TYPES.REQUEST_IN_PROGRESS]: {
    toCustomer: (mechanicName: string) => ({
      title: 'Service In Progress',
      message: `${mechanicName} has started working on your vehicle. You'll receive updates as the service progresses.`
    }),
  },
  
  [NOTIFICATION_TYPES.REQUEST_COMPLETED]: {
    toCustomer: (mechanicName: string, totalAmount: number) => ({
      title: 'Service Completed',
      message: `${mechanicName} has completed the service on your vehicle. Total amount: $${totalAmount.toFixed(2)}.`
    }),
  },
  
  [NOTIFICATION_TYPES.REQUEST_CANCELLED]: {
    toCustomer: (reason: string = 'No reason provided') => ({
      title: 'Service Request Cancelled',
      message: `Your service request has been cancelled. Reason: ${reason}`
    }),
    toMechanic: (customerName: string) => ({
      title: 'Service Request Cancelled',
      message: `The service request from ${customerName} has been cancelled.`
    }),
  },
  
  [NOTIFICATION_TYPES.STATUS_UPDATE]: {
    toCustomer: (mechanicName: string, description: string) => ({
      title: 'Service Status Update',
      message: `${mechanicName} provided an update: "${description}". Please review and approve if necessary.`
    }),
  },
  
  [NOTIFICATION_TYPES.STATUS_APPROVED]: {
    toMechanic: (customerName: string) => ({
      title: 'Status Update Approved',
      message: `${customerName} has approved your status update. You can proceed with the service.`
    }),
  },
  
  [NOTIFICATION_TYPES.STATUS_DECLINED]: {
    toMechanic: (customerName: string) => ({
      title: 'Status Update Declined',
      message: `${customerName} has declined your status update. Please contact them for clarification.`
    }),
  },
  
  [NOTIFICATION_TYPES.SERVICE_STARTED]: {
    toCustomer: (serviceName: string) => ({
      title: 'Service Started',
      message: `Work on "${serviceName}" has begun on your vehicle.`
    }),
  },
  
  [NOTIFICATION_TYPES.SERVICE_FINISHED]: {
    toCustomer: (serviceName: string) => ({
      title: 'Service Completed',
      message: `"${serviceName}" has been completed on your vehicle.`
    }),
  },
  
  [NOTIFICATION_TYPES.SERVICE_COMPLETION]: {
    toCustomer: (totalAmount: number, servicesCount: number) => ({
      title: 'All Services Completed',
      message: `All ${servicesCount} services have been completed. Total amount: $${totalAmount.toFixed(2)}.`
    }),
  },
  
  [NOTIFICATION_TYPES.ADDITIONAL_SERVICE_REQUESTED]: {
    toCustomer: (serviceName: string, price: number, mechanicName: string) => ({
      title: 'Additional Service Required',
      message: `${mechanicName} has identified that your vehicle needs "${serviceName}" (Est. $${price.toFixed(2)}). Please approve or decline.`
    }),
  },
  
  [NOTIFICATION_TYPES.ADDITIONAL_SERVICE_APPROVED]: {
    toMechanic: (serviceName: string, customerName: string) => ({
      title: 'Additional Service Approved',
      message: `${customerName} has approved the additional "${serviceName}" service. You can proceed with the work.`
    }),
  },
  
  [NOTIFICATION_TYPES.ADDITIONAL_SERVICE_DECLINED]: {
    toMechanic: (serviceName: string, customerName: string) => ({
      title: 'Additional Service Declined',
      message: `${customerName} has declined the additional "${serviceName}" service.`
    }),
  },
} as const;

// Utility function to create a notification
export async function createNotification(
  senderId: number,
  receiverId: number,
  type: NotificationType,
  title: string,
  message: string
) {
  try {
    return await prisma.notification.create({
      data: {
        senderId,
        receiverId,
        type,
        title,
        message,
      },
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

// Utility function to notify garage admin and mechanics about new request
export async function notifyGarageAboutNewRequest(
  customerId: number,
  garageId: number,
  customerName: string,
  vehicleInfo: string
) {
  try {
    // Get garage admin
    const garage = await prisma.garage.findUnique({
      where: { id: garageId },
      select: { adminId: true }
    });

    if (!garage) return;

    // Get approved mechanics for this garage
    const mechanics = await prisma.mechanic.findMany({
      where: {
        garageId,
        approved: true,
        removed: false
      },
      select: { userId: true }
    });

    const template = NOTIFICATION_TEMPLATES[NOTIFICATION_TYPES.REQUEST_CREATED].toGarage(customerName, vehicleInfo);

    // Notify garage admin
    await createNotification(
      customerId,
      garage.adminId,
      NOTIFICATION_TYPES.REQUEST_CREATED,
      template.title,
      template.message
    );

    // Notify all approved mechanics
    for (const mechanic of mechanics) {
      await createNotification(
        customerId,
        mechanic.userId,
        NOTIFICATION_TYPES.REQUEST_CREATED,
        template.title,
        template.message
      );
    }
  } catch (error) {
    console.error('Error notifying garage about new request:', error);
  }
}