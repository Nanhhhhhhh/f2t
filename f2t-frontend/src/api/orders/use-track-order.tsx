import { createQuery } from 'react-query-kit';

import { client } from '../common';
import type { OrderResponse } from './types';

type TrackOrderVariables = {
  orderId: string;
  trackingCode?: string;
};

type TrackOrderResponse = OrderResponse & {
  estimatedDeliveryTime?: string;
  currentLocation?: {
    latitude: number;
    longitude: number;
    address: string;
    timestamp: string;
  };
  deliveryProgress?: {
    status: 'pending' | 'in_transit' | 'delivered';
    percentage: number;
    lastUpdate: string;
  };
};

export const useTrackOrder = createQuery<
  TrackOrderResponse,
  TrackOrderVariables,
  Error
>({
  queryKey: ['track-order'],
  fetcher: async (variables) => {
    const { orderId, trackingCode } = variables;

    const params = new URLSearchParams();
    if (trackingCode) {
      params.append('trackingCode', trackingCode);
    }

    const queryString = params.toString();
    const url = `/orders/${orderId}/track${queryString ? `?${queryString}` : ''}`;

    const response = await client.get<TrackOrderResponse>(url);
    return response.data;
  },
  refetchInterval: 30000, // Auto-refresh every 30 seconds
});
