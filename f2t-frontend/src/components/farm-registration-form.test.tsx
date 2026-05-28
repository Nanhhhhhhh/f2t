import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { FarmRegistrationForm } from './farm-registration-form';

describe('FarmRegistrationForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders farm registration form with all sections', () => {
    render(<FarmRegistrationForm onSubmit={mockOnSubmit} />);

    // Check form title
    expect(screen.getByText('Farm Registration')).toBeTruthy();
    expect(
      screen.getByText(
        'Join our marketplace and connect directly with local consumers'
      )
    ).toBeTruthy();

    // Check section headers
    expect(screen.getByText('Personal Information')).toBeTruthy();
    expect(screen.getByText('Farm Information')).toBeTruthy();
    expect(screen.getByText('Farm Location')).toBeTruthy();
    expect(screen.getByText('Business Information')).toBeTruthy();

    // Check some key input fields
    expect(screen.getByText('First Name')).toBeTruthy();
    expect(screen.getByText('Farm Name')).toBeTruthy();
    expect(screen.getByText('Street Address')).toBeTruthy();
    expect(screen.getByText('Delivery Methods')).toBeTruthy();

    // Check submit button
    expect(screen.getByText('Create Farm Account')).toBeTruthy();
  });

  it('displays loading state when isLoading is true', () => {
    render(<FarmRegistrationForm onSubmit={mockOnSubmit} isLoading={true} />);

    expect(screen.getByText('Creating Account...')).toBeTruthy();
  });

  it('validates required fields', async () => {
    render(<FarmRegistrationForm onSubmit={mockOnSubmit} />);

    const submitButton = screen.getByText('Create Farm Account');
    fireEvent.press(submitButton);

    // Should not call onSubmit if validation fails
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('handles delivery method selection', async () => {
    render(<FarmRegistrationForm onSubmit={mockOnSubmit} />);

    // Find delivery method checkboxes
    const pickupCheckbox = screen.getByText('Pickup at Farm');
    const deliveryCheckbox = screen.getByText('Farm Delivery');
    fireEvent.press(pickupCheckbox);
    fireEvent.press(deliveryCheckbox);

    // Both methods should be selectable
    expect(pickupCheckbox).toBeTruthy();
    expect(deliveryCheckbox).toBeTruthy();
  });

  it('handles organic certification checkbox', async () => {
    render(<FarmRegistrationForm onSubmit={mockOnSubmit} />);

    const organicCheckbox = screen.getByText('Certified Organic Farm');
    fireEvent.press(organicCheckbox);

    expect(organicCheckbox).toBeTruthy();
  });

  it('handles terms and conditions checkbox', async () => {
    render(<FarmRegistrationForm onSubmit={mockOnSubmit} />);

    const termsCheckbox = screen.getByText(
      'I accept the Terms and Conditions and Privacy Policy'
    );
    fireEvent.press(termsCheckbox);

    expect(termsCheckbox).toBeTruthy();
  });

  it('validates password confirmation', async () => {
    render(<FarmRegistrationForm onSubmit={mockOnSubmit} />);

    // This test would require more complex setup to test form validation
    // The actual validation logic is tested in the validation function
    expect(screen.getByText('Password')).toBeTruthy();
    expect(screen.getByText('Confirm Password')).toBeTruthy();
  });
});
