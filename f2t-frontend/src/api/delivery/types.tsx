export interface TrackingStep {
  status: string;
  description: string;
  timestamp: string;
  location?: string;
}

export interface TrackingResponse {
  status: string;
  trackingCode: string | null;
  estimatedDeliveryDate: string | null;
  driverLocation: {
    latitude: number;
    longitude: number;
    updatedAt: string;
  } | null;
  routePolyline?: {
    latitude: number;
    longitude: number;
  }[];
  steps: TrackingStep[];
}

export interface GetTrackingRequest {
  orderId: string;
}
