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

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}