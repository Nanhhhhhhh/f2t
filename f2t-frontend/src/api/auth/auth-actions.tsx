import { signIn, signOut, updateFarm, updateUser } from '@/lib/auth';
import type { AuthFarmData, AuthUserData } from '@/lib/auth/utils';
import { DEFAULT_PERMISSIONS } from '@/types/constants';

import type {
  AuthResponse,
  FarmRegisterRequest,
  LoginRequest,
  RegisterRequest,
} from './types';

/**
 * Helper function to process auth response and sign in user
 */
export const processAuthResponse = async (
  response: AuthResponse,
  farmData?: AuthFarmData
) => {
  if (response.success && response.data) {
    const { user: userData, accessToken, refreshToken } = response.data;

    // Create AuthUserData with default permissions based on role
    const authUser: AuthUserData = {
      ...userData,
      permissions: Array.from(DEFAULT_PERMISSIONS[userData.role] || []),
      emailVerified: userData.emailVerified || false,
      phoneVerified: userData.phoneVerified || false,
      lastLoginAt: new Date().toISOString(),
      farmId: farmData?.id, // Link user to farm if provided
    };

    // Sign in with token, user data, and optional farm data
    await signIn({
      token: {
        access: accessToken,
        refresh: refreshToken,
      },
      user: authUser,
      farm: farmData,
    });

    return authUser;
  }
  throw new Error(response.message || 'Authentication failed');
};

/**
 * Helper function to handle registration success
 */
export const handleRegistrationSuccess = async (
  response: AuthResponse,
  registrationData: RegisterRequest | FarmRegisterRequest
) => {
  // Extract farm data from response if it's a farm registration
  let farmData: AuthFarmData | undefined;

  if ('farmInfo' in registrationData && response.data?.farm) {
    farmData = response.data.farm;
  }

  const user = await processAuthResponse(response, farmData);

  // For farm registration, we might want to trigger additional setup
  if ('farmInfo' in registrationData) {
    if (farmData) {
    }
  }

  return user;
};

/**
 * Helper function to handle login success
 */
export const handleLoginSuccess = async (
  response: AuthResponse,
  _loginData: LoginRequest
) => {
  // Extract farm data from response if user is a farm owner
  let farmData: AuthFarmData | undefined;

  if (response.data?.user?.role === 'farm' && response.data?.farm) {
    farmData = response.data.farm;
  }

  const user = await processAuthResponse(response, farmData);

  if (farmData) {
  }

  return user;
};

/**
 * Helper function to handle logout
 */
export const handleLogout = async () => {
  await signOut();
};

/**
 * Helper function to update user verification status
 */
export const updateVerificationStatus = async (
  type: 'email' | 'phone',
  verified: boolean
) => {
  const updates: Partial<AuthUserData> = {};

  if (type === 'email') {
    updates.emailVerified = verified;
  } else if (type === 'phone') {
    updates.phoneVerified = verified;
  }

  await updateUser(updates);
};

/**
 * Helper function to update farm information
 */
export const updateFarmInfo = async (updates: Partial<AuthFarmData>) => {
  await updateFarm(updates);
};

/**
 * Helper function to check if user needs verification
 */
export const needsVerification = (
  user: AuthUserData | null
): {
  needsEmail: boolean;
  needsPhone: boolean;
  needsAny: boolean;
} => {
  void user;
  return { needsEmail: false, needsPhone: false, needsAny: false };
};

/**
 * Helper function to validate farm registration data
 */
export const validateFarmRegistration = (
  data: FarmRegisterRequest
): string[] => {
  const errors: string[] = [];

  // Basic user validation
  if (!data.email || !data.email.includes('@')) {
    errors.push('Valid email is required');
  }
  if (!data.password || data.password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!data.firstName?.trim()) {
    errors.push('First name is required');
  }
  if (!data.lastName?.trim()) {
    errors.push('Last name is required');
  }
  if (!data.phoneNumber?.trim()) {
    errors.push('Phone number is required');
  }

  // Farm-specific validation
  if (!data.farmInfo.name?.trim()) {
    errors.push('Farm name is required');
  }
  if (!data.farmInfo.description?.trim()) {
    errors.push('Farm description is required');
  }
  if (!data.farmInfo.location) {
    errors.push('Farm location is required');
  }
  if (!data.farmInfo.contactEmail?.includes('@')) {
    errors.push('Valid farm contact email is required');
  }
  if (!data.farmInfo.contactPhone?.trim()) {
    errors.push('Farm contact phone is required');
  }
  if (!data.farmInfo.deliveryMethods?.length) {
    errors.push('At least one delivery method is required');
  }
  if (!data.acceptTerms) {
    errors.push('You must accept the terms and conditions');
  }

  return errors;
};

/**
 * Helper function to validate consumer registration data
 */
export const validateConsumerRegistration = (
  data: RegisterRequest
): string[] => {
  const errors: string[] = [];

  if (!data.email || !data.email.includes('@')) {
    errors.push('Valid email is required');
  }
  if (!data.password || data.password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!data.firstName?.trim()) {
    errors.push('First name is required');
  }
  if (!data.lastName?.trim()) {
    errors.push('Last name is required');
  }
  if (!data.phoneNumber?.trim()) {
    errors.push('Phone number is required');
  }

  return errors;
};
