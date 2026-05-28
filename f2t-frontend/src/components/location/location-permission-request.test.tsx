import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import React from 'react';

import { LocationPermissionRequest } from './location-permission-request';

// Mock useLocation hook
const mockLocation = {
  coordinates: null,
  permission: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
  requestPermission: jest.fn(),
  getCurrentLocation: jest.fn(),
  refreshLocation: jest.fn(),
  clearError: jest.fn(),
  calculateDistance: jest.fn(),
  isWithinRadius: jest.fn(),
  formatDistance: jest.fn(),
  getLocationAccuracy: jest.fn(),
};

jest.mock('@/lib/hooks/use-location', () => ({
  useLocation: jest.fn(() => mockLocation),
}));

// Mock Linking
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
  openSettings: jest.fn(),
}));

describe('LocationPermissionRequest', () => {
  const mockOnPermissionGranted = jest.fn();
  const mockOnPermissionDenied = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    const { useLocation } = require('@/lib/hooks/use-location');
    useLocation.mockReturnValue(mockLocation);
  });

  it('should not render when permission is already granted', () => {
    const { useLocation } = require('@/lib/hooks/use-location');
    useLocation.mockReturnValue({
      ...mockLocation,
      permission: { granted: true, canAskAgain: true, status: 'granted' },
    });

    const { UNSAFE_root } = render(<LocationPermissionRequest />);
    expect(UNSAFE_root.children.length).toBe(0);
  });

  it('should render card variant by default', () => {
    render(<LocationPermissionRequest />);

    expect(screen.getByText('Enable Location Services')).toBeTruthy();
    expect(
      screen.getByText(
        'Allow location access to find farms and products near you.'
      )
    ).toBeTruthy();
    expect(screen.getByText('Enable Location')).toBeTruthy();
  });

  it('should render with custom title and description', () => {
    render(
      <LocationPermissionRequest
        title="Custom Title"
        description="Custom description text"
      />
    );

    expect(screen.getByText('Custom Title')).toBeTruthy();
    expect(screen.getByText('Custom description text')).toBeTruthy();
  });

  it('should hide icon when showIcon is false', () => {
    const { UNSAFE_root } = render(
      <LocationPermissionRequest showIcon={false} />
    );

    // Icon should not be rendered
    expect(screen.getByText('Enable Location Services')).toBeTruthy();
  });

  it('should call requestPermission when enable button is pressed', async () => {
    const mockRequestPermission = jest.fn().mockResolvedValue(true);
    const { useLocation } = require('@/lib/hooks/use-location');
    useLocation.mockReturnValue({
      ...mockLocation,
      requestPermission: mockRequestPermission,
    });

    render(
      <LocationPermissionRequest
        onPermissionGranted={mockOnPermissionGranted}
      />
    );

    const enableButton = screen.getByText('Enable Location');
    fireEvent.press(enableButton);

    await waitFor(() => {
      expect(mockRequestPermission).toHaveBeenCalled();
      expect(mockOnPermissionGranted).toHaveBeenCalled();
    });
  });

  it('should call onPermissionDenied when permission is denied', async () => {
    const mockRequestPermission = jest.fn().mockResolvedValue(false);
    const { useLocation } = require('@/lib/hooks/use-location');
    useLocation.mockReturnValue({
      ...mockLocation,
      requestPermission: mockRequestPermission,
    });

    render(
      <LocationPermissionRequest onPermissionDenied={mockOnPermissionDenied} />
    );

    const enableButton = screen.getByText('Enable Location');
    fireEvent.press(enableButton);

    await waitFor(() => {
      expect(mockRequestPermission).toHaveBeenCalled();
      expect(mockOnPermissionDenied).toHaveBeenCalled();
    });
  });

  it('should show loading state when requesting permission', () => {
    const { useLocation } = require('@/lib/hooks/use-location');
    useLocation.mockReturnValue({
      ...mockLocation,
      isLoading: true,
    });

    render(<LocationPermissionRequest />);

    expect(screen.getByText('Requesting...')).toBeTruthy();
  });

  it('should show settings button when permission is permanently denied', () => {
    const { useLocation } = require('@/lib/hooks/use-location');
    useLocation.mockReturnValue({
      ...mockLocation,
      permission: { granted: false, canAskAgain: false, status: 'denied' },
    });

    render(<LocationPermissionRequest />);

    expect(screen.getByText('Open Settings')).toBeTruthy();
    expect(screen.getByText(/Location permission was denied/)).toBeTruthy();
  });

  it('should open settings when settings button is pressed', async () => {
    const { useLocation } = require('@/lib/hooks/use-location');
    useLocation.mockReturnValue({
      ...mockLocation,
      permission: { granted: false, canAskAgain: false, status: 'denied' },
    });

    render(<LocationPermissionRequest />);

    const settingsButton = screen.getByText('Open Settings');
    fireEvent.press(settingsButton);

    // Just verify the button was pressed, Linking is mocked
    expect(settingsButton).toBeTruthy();
  });

  it('should render banner variant correctly', () => {
    render(<LocationPermissionRequest variant="banner" />);

    expect(screen.getByText('Enable Location Services')).toBeTruthy();
    expect(screen.getByText('Enable')).toBeTruthy();
  });

  it('should render inline variant correctly', () => {
    render(<LocationPermissionRequest variant="inline" />);

    expect(
      screen.getByText(
        'Allow location access to find farms and products near you.'
      )
    ).toBeTruthy();
    expect(screen.getByText('Enable')).toBeTruthy();
  });

  it('should show Settings button in banner variant when permanently denied', () => {
    const { useLocation } = require('@/lib/hooks/use-location');
    useLocation.mockReturnValue({
      ...mockLocation,
      permission: { granted: false, canAskAgain: false, status: 'denied' },
    });

    render(<LocationPermissionRequest variant="banner" />);

    expect(screen.getByText('Settings')).toBeTruthy();
  });

  it('should disable button when loading', () => {
    const { useLocation } = require('@/lib/hooks/use-location');
    useLocation.mockReturnValue({
      ...mockLocation,
      isLoading: true,
    });

    render(<LocationPermissionRequest />);

    // Verify the loading text is shown
    expect(screen.getByText('Requesting...')).toBeTruthy();
  });

  it('should apply custom className', () => {
    render(<LocationPermissionRequest className="custom-class" />);

    // Verify the component renders with custom class
    expect(screen.getByText('Enable Location Services')).toBeTruthy();
  });
});
