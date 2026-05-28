import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Calendar, RefreshCcw } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import type { TrackingResponse } from '@/api/delivery/types';
import { useGetTracking } from '@/api/delivery/use-get-tracking';
import { useGetOrder } from '@/api/orders';
import { FocusAwareStatusBar } from '@/components/ui';

export default function TrackingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const mapRef = useRef<MapView>(null);

  // Fetch order details for destination address
  const { data: orderData } = useGetOrder({
    variables: { id: id || '' },
  });

  // Fetch live tracking data
  const {
    data: trackingData,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useGetTracking({
    variables: { orderId: id || '' },
  });

  // Extract data from response envelopes
  const order = orderData?.data;
  const tracking = trackingData as TrackingResponse;

  // Polling every 5 seconds while in shipping status for dynamic movement
  useEffect(() => {
    if (order?.status !== 'shipped') return;
    const interval = setInterval(() => {
      void refetch();
    }, 5000);
    return () => clearInterval(interval);
  }, [order?.status, refetch]);

  const destination = {
    latitude: 10.7626,
    longitude: 106.6602,
  };

  // Driver location
  const driverLoc = tracking?.driverLocation;

  // Auto-center the map once data is loaded
  const hasCentered = useRef(false);
  useEffect(() => {
    if (tracking && !hasCentered.current && mapRef.current) {
      const coords = [destination];
      if (driverLoc) {
        coords.push({
          latitude: driverLoc.latitude,
          longitude: driverLoc.longitude,
        });
      }

      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
        animated: true,
      });
      hasCentered.current = true;
    }
  }, [tracking, destination, driverLoc]);


  // Loading state
  if (isLoading && !tracking) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator size="large" className="text-blue-600" />
        <Text className="mt-4 text-gray-500">Loading tracking data...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <FocusAwareStatusBar />

      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-gray-200 bg-white px-4 pb-4 pt-12 dark:border-gray-700 dark:bg-gray-800">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <ArrowLeft size={24} className="text-gray-900 dark:text-white" />
          </TouchableOpacity>
          <View>
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              Track Order
            </Text>
            <Text className="text-xs text-gray-500">{order?.orderNumber}</Text>
          </View>
        </View>

        {isRefetching && (
          <RefreshCcw size={16} className="animate-spin text-blue-600" />
        )}
      </View>

      {/* Map View */}
      <View className="flex-1 bg-gray-200">
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        >
          {/* Destination Marker */}
          <Marker
            coordinate={destination}
            title="Delivery Address"
            description={
              (order?.shippingAddress?.addressLine1 as string) || 'Destination'
            }
            pinColor="green"
          />

          {/* Driver Marker */}
          {driverLoc && (
            <Marker
              coordinate={{
                latitude: driverLoc.latitude,
                longitude: driverLoc.longitude,
              }}
              title="Driver"
              pinColor="blue"
            />
          )}

          {/* Polyline: use realistic route if available, otherwise straight line */}
          {driverLoc && (
            <Polyline
              coordinates={
                tracking?.routePolyline && tracking.routePolyline.length > 0
                  ? tracking.routePolyline.map(
                      (p: { latitude: number; longitude: number }) => ({
                        latitude: p.latitude,
                        longitude: p.longitude,
                      })
                    )
                  : [
                      {
                        latitude: driverLoc.latitude,
                        longitude: driverLoc.longitude,
                      },
                      destination,
                    ]
              }
              strokeColor="#3b82f6"
              strokeWidth={3}
              lineDashPattern={[1]} // Makes it look a bit more like a path
            />
          )}
        </MapView>

        {/* Recenter Button */}
        <TouchableOpacity
          onPress={() => {
            if (mapRef.current) {
              const coords = [destination];
              if (driverLoc) {
                coords.push({
                  latitude: driverLoc.latitude,
                  longitude: driverLoc.longitude,
                });
              }
              mapRef.current.fitToCoordinates(coords, {
                edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
                animated: true,
              });
            }
          }}
          className="absolute bottom-10 right-4 rounded-full bg-white p-3 shadow-lg dark:bg-gray-800"
        >
          <RefreshCcw size={20} className="text-blue-600" />
        </TouchableOpacity>
      </View>

      {/* Tracking Info Card */}
      <View className="-mt-6 rounded-t-3xl bg-white p-6 shadow-lg dark:bg-gray-800">
        <View className="mb-6 flex-row items-center justify-between">
          <View>
            <Text className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
              Estimated Delivery
            </Text>
            <View className="flex-row items-center">
              <Calendar size={16} className="mr-2 text-blue-600" />
              <Text className="text-lg font-bold text-gray-900 dark:text-white">
                {tracking?.estimatedDeliveryDate
                  ? new Date(tracking.estimatedDeliveryDate).toLocaleDateString(
                      'en-US',
                      {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }
                    )
                  : 'Calculating...'}
              </Text>
            </View>
          </View>
          <View className="rounded-full bg-blue-100 px-3 py-1 dark:bg-blue-900/30">
            <Text className="text-xs font-bold capitalize text-blue-600 dark:text-blue-400">
              {tracking?.status || order?.status}
            </Text>
          </View>
        </View>

        <Text className="mb-4 font-semibold text-gray-900 dark:text-white">
          Tracking History
        </Text>

        <ScrollView className="max-h-60">
          {tracking?.steps && tracking.steps.length > 0 ? (
            tracking.steps.map(
              (
                step: {
                  status: string;
                  description: string;
                  timestamp: string | Date;
                  location?: string;
                },
                index: number
              ) => {
                const stepDate = step.timestamp
                  ? new Date(step.timestamp)
                  : new Date();
                const isValidDate = !isNaN(stepDate.getTime());

                return (
                  <View key={index} className="mb-4 flex-row">
                    <View className="mr-4 items-center">
                      <View
                        className={`size-3 rounded-full ${index === 0 ? 'bg-blue-600' : 'bg-gray-300'}`}
                      />
                      {index < tracking.steps.length - 1 && (
                        <View className="my-1 w-0.5 flex-1 bg-gray-200" />
                      )}
                    </View>
                    <View className="flex-1 pb-2">
                      <Text
                        className={`text-sm font-bold ${index === 0 ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}
                      >
                        {step.status
                          ? step.status.replace(/_/g, ' ').toUpperCase()
                          : 'UNKNOWN'}
                      </Text>
                      <Text className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                        {step.description || 'No description provided'}
                      </Text>
                      <Text className="mt-1 text-[10px] text-gray-400">
                        {isValidDate
                          ? stepDate.toLocaleString()
                          : 'Date unavailable'}{' '}
                        {step.location ? `• ${step.location}` : ''}
                      </Text>
                    </View>
                  </View>
                );
              }
            )
          ) : (
            <View className="items-center py-8">
              <Text className="italic text-gray-500">
                No tracking history available yet.
              </Text>
              <Text className="mt-1 text-[10px] text-gray-400">
                Order Status: {tracking?.status || order?.status || 'Unknown'}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}
