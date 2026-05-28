import type { AxiosError } from 'axios';
import { createQuery } from 'react-query-kit';

import { client } from '../common/client';
import { simulateNetworkDelay, USE_MOCK_DATA } from '../common/config';
import type { GetTrackingRequest, TrackingResponse } from './types';

// Get tracking info query
export const useGetTracking = createQuery<
  TrackingResponse,
  GetTrackingRequest,
  AxiosError
>({
  queryKey: ['tracking'],
  fetcher: async ({ orderId }) => {
    // Return mock data if enabled
    if (USE_MOCK_DATA) {
      await simulateNetworkDelay(500);

      const now = new Date();
      const routePolyline = [
        { latitude: 10.9833, longitude: 106.4833 },
        { latitude: 10.95, longitude: 106.52 },
        { latitude: 10.8672, longitude: 106.6412 },
        { latitude: 10.8262, longitude: 106.6762 },
        { latitude: 10.7769, longitude: 106.7009 },
        { latitude: 10.7626, longitude: 106.6602 },
      ];

      // Dynamic driver location based on current seconds
      const pointIndex = Math.floor(
        (now.getTime() / 5000) % routePolyline.length
      );
      const driverLoc = routePolyline[pointIndex];

      return {
        status: 'shipped',
        trackingCode: 'DEMO-GHN-778899',
        estimatedDeliveryDate: new Date(now.getTime() + 7200000).toISOString(),
        driverLocation: {
          latitude: driverLoc.latitude,
          longitude: driverLoc.longitude,
          updatedAt: now.toISOString(),
        },
        routePolyline,
        steps: [
          {
            status: 'in_transit',
            description: 'Đơn hàng đã nhập kho trung chuyển',
            timestamp: new Date(now.getTime() - 7200000).toISOString(),
            location: 'GHN District 12 Hub',
          },
          {
            status: 'picked_up',
            description: 'Tài xế đã lấy hàng thành công tại nông trại',
            timestamp: new Date(now.getTime() - 10800000).toISOString(),
            location: 'Củ Chi Farm',
          },
        ],
      };
    }

    // Real API call
    return client({
      url: `delivery/orders/${orderId}/tracking`,
      method: 'GET',
    }).then((response) => response.data.data);
  },
});
