import { UserType } from '@/generated/prisma';

export interface LoginCredentials {
  username: string;
  password: string;
  userType: UserType;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  userType: UserType;
}

export interface CustomerRegistrationData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export interface VehicleData {
  vehicleType: string;
  plateNumber: string;
  plateCode: string;
  countryCode: string;
  color: string;
}

export interface MechanicApplicationData {
  garageId: number;
}

export interface GarageApplicationData {
  garageName: string;
  latitude: number;
  longitude: number;
  adminEmail: string;
  adminUsername: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
}

export interface Application {
  id: number;
  applicantId: number;
  applicationType: 'GARAGE' | 'MECHANIC';
  garageId?: number | null;
  approved?: boolean | null;
  createdAt: string;
  applicant: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  garage?: {
    id: number;
    garageName: string;
  } | null;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: UserType;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordReset {
  token: string;
  newPassword: string;
}

export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
}

// Service Request Types
export interface ServiceRequestData {
  garageId: number;
  vehicleId: number;
  latitude: number;
  longitude: number;
  description?: string;
}

export interface ServiceRequest {
  id: number;
  customerId: number;
  garageId: number;
  mechanicId?: number | null;
  vehicleId: number;
  latitude: number;
  longitude: number;
  status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  customer: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string | null;
  };
  garage: {
    id: number;
    garageName: string;
    latitude: number;
    longitude: number;
  };
  mechanic?: {
    id: number;
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
  } | null;
  vehicle: {
    id: number;
    vehicleType: string;
    plateNumber: string;
    plateCode: string;
    countryCode: string;
    color: string;
  };
  distance?: number;
}

export interface ServiceRequestStatusUpdate {
  status: 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  mechanicId?: number;
}

// Vehicle Status Types (Milestone 5)
export interface VehicleStatusData {
  serviceRequestId: number;
  description: string;
}

export interface VehicleStatus {
  id: number;
  serviceRequestId: number;
  mechanicId: number;
  description: string;
  approved: boolean;
  createdAt: string;
  mechanic: {
    id: number;
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
  };
  ongoingServices: OngoingService[];
  additionalServices: AdditionalService[];
}

// Ongoing Service Types
export interface OngoingServiceData {
  statusId: number;
  serviceId: number;
  expectedDate: string;
  totalPrice: number;
}

export interface OngoingService {
  id: number;
  statusId: number;
  serviceId: number;
  expectedDate: string;
  serviceFinished: boolean;
  totalPrice: number;
  service: {
    id: number;
    serviceName: string;
    estimatedPrice: number;
  };
}

// Additional Service Types
export interface AdditionalServiceData {
  statusId: number;
  serviceId: number;
  totalPrice: number;
}

export interface AdditionalService {
  id: number;
  statusId: number;
  serviceId: number;
  approved: boolean;
  totalPrice: number;
  service: {
    id: number;
    serviceName: string;
    estimatedPrice: number;
  };
}

// Notification Types
export interface NotificationData {
  receiverId: number;
  type: string;
  title: string;
  message: string;
}

export interface Notification {
  id: number;
  senderId: number;
  receiverId: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  sender: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

// Service Tracking Updates
export interface ServiceStatusUpdate {
  serviceRequestId: number;
  statusDescription: string;
  ongoingServices?: OngoingServiceData[];
  additionalServices?: AdditionalServiceData[];
}

// Service Completion Types
export interface ServiceCompletionData {
  serviceRequestId: number;
  finalNotes?: string;
  additionalCharges?: number;
  discount?: number;
}

export interface ServiceSummary {
  serviceRequestId: number;
  totalOngoingServices: number;
  totalAdditionalServices: number;
  additionalCharges: number;
  discount: number;
  subtotal: number;
  finalTotal: number;
  completedServices: Array<{
    id: number;
    serviceName: string;
    price: number;
    type: 'ongoing' | 'additional';
  }>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}