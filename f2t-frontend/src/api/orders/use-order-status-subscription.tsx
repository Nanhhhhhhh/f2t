import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import type { Order, OrderStatus } from './types';

type OrderStatusSubscriptionOptions = {
  orderId: string;
  onStatusChange?: (newStatus: OrderStatus, order: Order) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
};

/**
 * Hook to subscribe to real-time order status changes
 * This is a polling-based implementation. In production, you would use WebSockets or Server-Sent Events.
 */
export function useOrderStatusSubscription({
  orderId,
  onStatusChange,
  onError,
  enabled = true,
}: OrderStatusSubscriptionOptions) {
  const queryClient = useQueryClient();
  const previousStatusRef = useRef<OrderStatus | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkOrderStatus = useCallback(async () => {
    try {
      // In a real implementation, this would be a WebSocket connection or SSE
      // For now, we'll use the query client to get the latest order data
      const orderData = queryClient.getQueryData<{ data: Order }>([
        'order',
        { id: orderId },
      ]);

      if (orderData?.data) {
        const currentStatus = orderData.data.status;

        // Check if status has changed
        if (
          previousStatusRef.current &&
          previousStatusRef.current !== currentStatus
        ) {
          onStatusChange?.(currentStatus, orderData.data);
        }

        previousStatusRef.current = currentStatus;
      }
    } catch (error) {
      onError?.(error as Error);
    }
  }, [orderId, onStatusChange, onError, queryClient]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Initial check
    checkOrderStatus();

    // Set up polling interval (every 30 seconds)
    intervalRef.current = setInterval(checkOrderStatus, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, checkOrderStatus]);

  // Manual refresh function
  const refresh = useCallback(() => {
    checkOrderStatus();
  }, [checkOrderStatus]);

  return { refresh };
}

/**
 * Hook to subscribe to multiple orders status changes
 */
export function useMultipleOrdersStatusSubscription({
  orderIds,
  onStatusChange,
  onError,
  enabled = true,
}: {
  orderIds: string[];
  onStatusChange?: (
    orderId: string,
    newStatus: OrderStatus,
    order: Order
  ) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const previousStatusesRef = useRef<Map<string, OrderStatus>>(new Map());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkOrdersStatus = useCallback(async () => {
    try {
      for (const orderId of orderIds) {
        const orderData = queryClient.getQueryData<{ data: Order }>([
          'order',
          { id: orderId },
        ]);

        if (orderData?.data) {
          const currentStatus = orderData.data.status;
          const previousStatus = previousStatusesRef.current.get(orderId);

          // Check if status has changed
          if (previousStatus && previousStatus !== currentStatus) {
            onStatusChange?.(orderId, currentStatus, orderData.data);
          }

          previousStatusesRef.current.set(orderId, currentStatus);
        }
      }
    } catch (error) {
      onError?.(error as Error);
    }
  }, [orderIds, onStatusChange, onError, queryClient]);

  useEffect(() => {
    if (!enabled || orderIds.length === 0) {
      return;
    }

    // Initial check
    checkOrdersStatus();

    // Set up polling interval (every 30 seconds)
    intervalRef.current = setInterval(checkOrdersStatus, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, checkOrdersStatus, orderIds.length]);

  // Manual refresh function
  const refresh = useCallback(() => {
    checkOrdersStatus();
  }, [checkOrdersStatus]);

  return { refresh };
}
