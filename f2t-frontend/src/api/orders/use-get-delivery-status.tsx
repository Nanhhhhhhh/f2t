import { createQuery } from 'react-query-kit';

import type { ApiResponse } from '@/types';

import { client } from '../common';

type GetDeliveryStatusVariables = {
  orderId: string;
};

export type DeliveryStatus = {
  orderId: string;
  status:
    | 'pending'
    | 'confirmed'
    | 'preparing'
    | 'ready_for_pickup'
    | 'in_transit'
    | 'delivered'
    | 'cancelled';
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  deliveryMethod: 'pickup' | 'farm_delivery' | 'courier';
  trackingNumber?: string;
  courierName?: string;
  courierPhone?: string;
  deliveryAddress?: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    postalCode: string;
    country: string;
  };
  currentLocation?: {
    latitude: number;
    longitude: number;
    address: string;
    timestamp: string;
  };
  deliveryNotes?: string;
  deliveryProof?: {
    signature?: string;
    photo?: string;
    receivedBy?: string;
    timestamp: string;
  };
  statusHistory: {
    status: string;
    timestamp: string;
    location?: string;
    notes?: string;
  }[];
};

type DeliveryStatusResponse = ApiResponse<DeliveryStatus>;

export const useGetDeliveryStatus = createQuery<
  DeliveryStatusResponse,
  GetDeliveryStatusVariables,
  Error
>({
  queryKey: ['delivery-status'],
  fetcher: async (variables) => {
    const { orderId } = variables;
    const response = await client.get<DeliveryStatusResponse>(
      `/orders/${orderId}/delivery-status`
    );
    return response.data;
  },
  refetchInterval: 30000, // Auto-refresh every 30 seconds
});
