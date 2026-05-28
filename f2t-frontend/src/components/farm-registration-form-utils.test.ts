import { USER_ROLE } from '@/types/constants';

import type { FarmRegistrationFormType } from './farm-registration-form';
import {
  getDefaultFormValues,
  transformFormDataToApiRequest,
  validateFormData,
} from './farm-registration-form-utils';

describe('Farm Registration Form Utils', () => {
  const validFormData: FarmRegistrationFormType = {
    // Personal Information
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    password: 'securepassword123',
    confirmPassword: 'securepassword123',
    phoneNumber: '+1234567890',

    // Farm Information
    farmName: 'Green Valley Farm',
    farmDescription:
      'Organic vegetables and fruits grown with sustainable methods',
    farmContactEmail: 'contact@greenvalley.com',
    farmContactPhone: '+1234567891',

    // Location Information
    street: 'Main Street',
    streetNumber: '123',
    city: 'Springfield',
    state: 'CA',
    zipCode: '12345',
    country: 'United States',

    // Business Information
    deliveryMethods: ['pickup', 'farm_delivery'],
    deliveryRadius: 25,
    deliveryFee: 5,
    businessLicense: 'BL123456',
    farmingArea: 10,
    isOrganic: true,
    acceptTerms: true,
  };

  describe('transformFormDataToApiRequest', () => {
    it('should transform form data to API request format correctly', () => {
      const result = transformFormDataToApiRequest(validFormData);

      expect(result.email).toBe(validFormData.email);
      expect(result.firstName).toBe(validFormData.firstName);
      expect(result.lastName).toBe(validFormData.lastName);
      expect(result.role).toBe(USER_ROLE.FARM);
      expect(result.farmInfo.name).toBe(validFormData.farmName);
      expect(result.farmInfo.description).toBe(validFormData.farmDescription);
      expect(result.farmInfo.deliveryMethods).toEqual(
        validFormData.deliveryMethods
      );
      expect(result.acceptTerms).toBe(true);
    });

    it('should create formatted address correctly', () => {
      const result = transformFormDataToApiRequest(validFormData);
      const expectedAddress =
        '123 Main Street, Springfield, CA 12345, United States';

      expect(result.location?.address.formattedAddress).toBe(expectedAddress);
      expect(result.farmInfo.location.address.formattedAddress).toBe(
        expectedAddress
      );
    });

    it('should handle optional fields correctly', () => {
      const formDataWithoutOptionals = {
        ...validFormData,
        streetNumber: undefined,
        businessLicense: undefined,
        farmingArea: undefined,
      };

      const result = transformFormDataToApiRequest(formDataWithoutOptionals);

      expect(result.businessLicense).toBeUndefined();
      // farmingArea is no longer part of the API request
    });

    it('should include delivery radius and fee correctly', () => {
      const result = transformFormDataToApiRequest(validFormData);

      expect(result.farmInfo.deliveryRadius).toBe(validFormData.deliveryRadius);
      expect(result.farmInfo.deliveryFee).toBe(validFormData.deliveryFee);
    });
  });

  describe('validateFormData', () => {
    it('should return no errors for valid form data', () => {
      const errors = validateFormData(validFormData);
      expect(errors).toHaveLength(0);
    });

    it('should return errors for missing required personal fields', () => {
      const invalidData = {
        ...validFormData,
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phoneNumber: '',
      };

      const errors = validateFormData(invalidData);
      expect(errors).toContain('First name is required');
      expect(errors).toContain('Last name is required');
      expect(errors).toContain('Email is required');
      expect(errors).toContain('Password is required');
      expect(errors).toContain('Phone number is required');
    });

    it('should return errors for missing required farm fields', () => {
      const invalidData = {
        ...validFormData,
        farmName: '',
        farmDescription: '',
        farmContactEmail: '',
        farmContactPhone: '',
      };

      const errors = validateFormData(invalidData);
      expect(errors).toContain('Farm name is required');
      expect(errors).toContain('Farm description is required');
      expect(errors).toContain('Farm contact email is required');
      expect(errors).toContain('Farm contact phone is required');
    });

    it('should return errors for missing required location fields', () => {
      const invalidData = {
        ...validFormData,
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
      };

      const errors = validateFormData(invalidData);
      expect(errors).toContain('Street address is required');
      expect(errors).toContain('City is required');
      expect(errors).toContain('State is required');
      expect(errors).toContain('ZIP code is required');
      expect(errors).toContain('Country is required');
    });

    it('should return errors for missing business requirements', () => {
      const invalidData = {
        ...validFormData,
        deliveryMethods: [],
        deliveryRadius: 0,
        deliveryFee: -1,
        acceptTerms: false,
      };

      const errors = validateFormData(invalidData);
      expect(errors).toContain('At least one delivery method is required');
      expect(errors).toContain('Valid delivery radius is required');
      expect(errors).toContain('Valid delivery fee is required');
      expect(errors).toContain('You must accept the terms and conditions');
    });

    it('should return error for password mismatch', () => {
      const invalidData = {
        ...validFormData,
        confirmPassword: 'differentpassword',
      };

      const errors = validateFormData(invalidData);
      expect(errors).toContain('Passwords do not match');
    });
  });

  describe('getDefaultFormValues', () => {
    it('should return correct default values', () => {
      const defaults = getDefaultFormValues();

      expect(defaults.deliveryMethods).toEqual([]);
      expect(defaults.deliveryRadius).toBe(10);
      expect(defaults.deliveryFee).toBe(0);
      expect(defaults.isOrganic).toBe(false);
      expect(defaults.acceptTerms).toBe(false);
      expect(defaults.country).toBe('United States');
    });
  });
});
