import type { AuthUserData } from '@/lib/auth/utils';
import type {
  AuthResponse,
  ChangePasswordRequest,
  CreateFarmRequest,
  ForgotPasswordRequest,
  LoginRequest,
  RefreshTokenRequest,
  RegisterRequest,
  ResetPasswordRequest,
  VerifyOtpRequest,
} from '@/types/api';

export type {
  AuthResponse,
  AuthUserData,
  ChangePasswordRequest,
  CreateFarmRequest,
  ForgotPasswordRequest,
  LoginRequest,
  RefreshTokenRequest,
  RegisterRequest,
  ResetPasswordRequest,
  VerifyOtpRequest,
};

// Farm registration combines user registration with farm creation
export type FarmRegisterRequest = RegisterRequest & {
  farmInfo: CreateFarmRequest;
  acceptTerms: boolean;
  businessLicense?: string;
};

// Phone verification
export type VerifyPhoneRequest = {
  phoneNumber: string;
  verificationCode: string;
};

export type SendPhoneVerificationRequest = {
  phoneNumber: string;
};

// Email verification
export type VerifyEmailRequest = {
  email: string;
  verificationCode: string;
};

export type SendEmailVerificationRequest = {
  email: string;
};

// Success responses
export type VerificationResponse = {
  success: boolean;
  message: string;
  verified: boolean;
};

export type LogoutResponse = {
  success: boolean;
  message: string;
};
