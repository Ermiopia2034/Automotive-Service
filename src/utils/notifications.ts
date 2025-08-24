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

  // Payment Types
  PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',
  PAYMENT_STATUS_UPDATE: 'PAYMENT_STATUS_UPDATE',
  INVOICE_GENERATED: 'INVOICE_GENERATED',
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

  [NOTIFICATION_TYPES.PAYMENT_COMPLETED]: {
    toCustomer: (amount: number, garageName: string) => ({
      title: 'Payment Completed',
      message: `Your payment of $${amount.toFixed(2)} to ${garageName} has been successfully processed.`
    }),
    toGarage: (amount: number, customerName: string) => ({
      title: 'Payment Received',
      message: `You have received a payment of $${amount.toFixed(2)} from ${customerName}.`
    }),
  },

  [NOTIFICATION_TYPES.PAYMENT_FAILED]: {
    toCustomer: (amount: number, garageName: string) => ({
      title: 'Payment Failed',
      message: `Your payment of $${amount.toFixed(2)} to ${garageName} could not be processed. Please try again or contact support.`
    }),
  },

  [NOTIFICATION_TYPES.PAYMENT_REFUNDED]: {
    toCustomer: (amount: number, garageName: string) => ({
      title: 'Payment Refunded',
      message: `Your payment of $${amount.toFixed(2)} to ${garageName} has been refunded.`
    }),
    toGarage: (amount: number, customerName: string) => ({
      title: 'Payment Refunded',
      message: `A payment of $${amount.toFixed(2)} from ${customerName} has been refunded.`
    }),
  },

  [NOTIFICATION_TYPES.PAYMENT_STATUS_UPDATE]: {
    toCustomer: (amount: number, garageName: string, status: string) => ({
      title: 'Payment Status Updated',
      message: `Your payment of $${amount.toFixed(2)} to ${garageName} has been ${status.toLowerCase()}.`
    }),
  },

  [NOTIFICATION_TYPES.INVOICE_GENERATED]: {
    toCustomer: (invoiceNumber: string, totalAmount: number, garageName: string) => ({
      title: 'Invoice Generated',
      message: `Invoice ${invoiceNumber} for $${totalAmount.toFixed(2)} has been generated by ${garageName}.`
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

// Utility function to notify about payment completion
export async function notifyPaymentCompleted(
  paymentId: number
) {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        customer: true,
        garage: true
      }
    });

    if (!payment) return;

    // Notify customer
    const customerTemplate = NOTIFICATION_TEMPLATES[NOTIFICATION_TYPES.PAYMENT_COMPLETED].toCustomer(
      payment.amount,
      payment.garage.garageName
    );

    await createNotification(
      payment.garage.adminId, // System/garage admin as sender
      payment.customerId,
      NOTIFICATION_TYPES.PAYMENT_COMPLETED,
      customerTemplate.title,
      customerTemplate.message
    );

    // Notify garage admin
    const garageTemplate = NOTIFICATION_TEMPLATES[NOTIFICATION_TYPES.PAYMENT_COMPLETED].toGarage(
      payment.amount,
      `${payment.customer.firstName} ${payment.customer.lastName}`
    );

    await createNotification(
      payment.customerId,
      payment.garage.adminId,
      NOTIFICATION_TYPES.PAYMENT_COMPLETED,
      garageTemplate.title,
      garageTemplate.message
    );

  } catch (error) {
    console.error('Error notifying about payment completion:', error);
  }
}

// Utility function to notify about payment failure
export async function notifyPaymentFailed(
  paymentId: number
) {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        customer: true,
        garage: true
      }
    });

    if (!payment) return;

    const template = NOTIFICATION_TEMPLATES[NOTIFICATION_TYPES.PAYMENT_FAILED].toCustomer(
      payment.amount,
      payment.garage.garageName
    );

    await createNotification(
      payment.garage.adminId,
      payment.customerId,
      NOTIFICATION_TYPES.PAYMENT_FAILED,
      template.title,
      template.message
    );

  } catch (error) {
    console.error('Error notifying about payment failure:', error);
  }
}

// Utility function to notify about invoice generation
export async function notifyInvoiceGenerated(
  invoiceId: number
) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        garage: true
      }
    });

    if (!invoice) return;

    const template = NOTIFICATION_TEMPLATES[NOTIFICATION_TYPES.INVOICE_GENERATED].toCustomer(
      invoice.invoiceNumber,
      invoice.totalAmount,
      invoice.garage.garageName
    );

    await createNotification(
      invoice.garage.adminId,
      invoice.customerId,
      NOTIFICATION_TYPES.INVOICE_GENERATED,
      template.title,
      template.message
    );

  } catch (error) {
    console.error('Error notifying about invoice generation:', error);
  }
}