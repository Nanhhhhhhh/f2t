import { Check, Loader, MapPin, Navigation, X } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView } from 'react-native';

import { Button, Text, View } from '@/components/ui';
import { useLocation } from '@/lib/hooks/use-location';

export type FarmLocationFilterOptions = {
  maxDistance: number;
  useCurrentLocation: boolean;
  customLocation?: { latitude: number; longitude: number };
};

type FarmLocationFilterProps = {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FarmLocationFilterOptions) => void;
  initialFilters?: Partial<FarmLocationFilterOptions>;
};

const DEFAULT_FILTERS: FarmLocationFilterOptions = {
  maxDistance: 100,
  useCurrentLocation: true,
};

const DISTANCE_PRESETS = [
  { label: '5 km', desc: 'Đi bộ', icon: '🚶', value: 5 },
  { label: '10 km', desc: 'Gần', icon: '🚴', value: 10 },
  { label: '25 km', desc: 'Lái xe ngắn', icon: '🚗', value: 25 },
  { label: '50 km', desc: 'Vừa phải', icon: '🚙', value: 50 },
  { label: '100 km', desc: 'Xa hơn', icon: '🚚', value: 100 },
  { label: '200 km', desc: 'Toàn vùng', icon: '✈️', value: 200 },
];

export function FarmLocationFilter({
  visible,
  onClose,
  onApply,
  initialFilters,
}: FarmLocationFilterProps) {
  const [filters, setFilters] = useState<FarmLocationFilterOptions>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  const {
    coordinates: location,
    isLoading: isLocationLoading,
    requestPermission,
  } = useLocation();

  const setMaxDistance = useCallback((distance: number) => {
    setFilters((prev) => ({ ...prev, maxDistance: distance }));
  }, []);

  const toggleCurrentLocation = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      useCurrentLocation: !prev.useCurrentLocation,
    }));
  }, []);

  const handleReset = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const handleApply = useCallback(() => {
    onApply(filters);
    onClose();
  }, [filters, onApply, onClose]);

  const handleRequestLocation = useCallback(async () => {
    const granted = await requestPermission();
    if (granted) setFilters((prev) => ({ ...prev, useCurrentLocation: true }));
  }, [requestPermission]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onClose} />

        <View className="rounded-t-3xl bg-white dark:bg-gray-900">
          {/* Drag handle */}
          <View className="items-center pt-3 pb-1">
            <View className="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-3">
            <View className="flex-row items-center gap-2">
              <MapPin size={18} color="#FF6C00" />
              <Text className="text-lg font-bold text-gray-900 dark:text-white">
                Lọc theo khoảng cách
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="rounded-full bg-gray-100 p-2 dark:bg-gray-800"
            >
              <X size={18} color="#6B7280" />
            </Pressable>
          </View>

          <View className="h-px bg-gray-100 dark:bg-gray-800" />

          <ScrollView
            className="max-h-[70vh] px-5"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 20, gap: 24 }}
          >
            {/* Location status card */}
            <View>
              {isLocationLoading && (
                <View className="flex-row items-center gap-3 rounded-2xl bg-blue-50 p-4 dark:bg-blue-900/20">
                  <Loader size={16} color="#2563eb" />
                  <Text className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Đang lấy vị trí của bạn...
                  </Text>
                </View>
              )}

              {!isLocationLoading && location && (
                <View className="flex-row items-center gap-3 rounded-2xl bg-green-50 p-4 dark:bg-green-900/20">
                  <View className="size-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-800">
                    <Navigation size={15} color="#16a34a" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-green-800 dark:text-green-200">
                      GPS đã bật
                    </Text>
                    <Text className="text-xs text-green-600 dark:text-green-400">
                      {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                    </Text>
                  </View>
                  <View className="size-5 items-center justify-center rounded-full bg-green-500">
                    <Check size={11} color="#fff" />
                  </View>
                </View>
              )}

              {!isLocationLoading && !location && (
                <View className="rounded-2xl bg-amber-50 p-4 dark:bg-amber-900/20">
                  <Text className="mb-1 text-sm font-semibold text-amber-800 dark:text-amber-200">
                    ⚠️ Chưa có vị trí
                  </Text>
                  <Text className="mb-3 text-xs text-amber-700 dark:text-amber-300">
                    Bật GPS để tìm trang trại gần bạn
                  </Text>
                  <Button
                    label="Bật GPS"
                    onPress={handleRequestLocation}
                    variant="outline"
                    size="sm"
                  />
                </View>
              )}
            </View>

            {/* Use current location toggle */}
            <Pressable
              onPress={toggleCurrentLocation}
              disabled={!location}
              className={`flex-row items-center justify-between rounded-2xl border p-4 ${
                !location ? 'opacity-40' : ''
              } ${
                filters.useCurrentLocation
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
              }`}
            >
              <View className="flex-row items-center gap-3">
                <View
                  className={`size-9 items-center justify-center rounded-xl ${
                    filters.useCurrentLocation
                      ? 'bg-primary-100 dark:bg-primary-800'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <Navigation
                    size={16}
                    color={filters.useCurrentLocation ? '#FF6C00' : '#6B7280'}
                  />
                </View>
                <View>
                  <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                    Dùng vị trí hiện tại
                  </Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400">
                    Tìm trang trại gần nơi bạn đang đứng
                  </Text>
                </View>
              </View>
              <View
                className={`size-6 items-center justify-center rounded-full border-2 ${
                  filters.useCurrentLocation
                    ? 'border-primary-600 bg-primary-600'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                {filters.useCurrentLocation && <Check size={12} color="#fff" />}
              </View>
            </Pressable>

            {/* Distance presets */}
            <View>
              <Text className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                Khoảng cách tối đa
              </Text>
              <View className="gap-0 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
                {DISTANCE_PRESETS.map((preset, i, arr) => {
                  const active = filters.maxDistance === preset.value;
                  return (
                    <Pressable
                      key={preset.value}
                      onPress={() => setMaxDistance(preset.value)}
                      className={`flex-row items-center justify-between px-4 py-3.5 ${
                        i < arr.length - 1
                          ? 'border-b border-gray-100 dark:border-gray-800'
                          : ''
                      } ${
                        active
                          ? 'bg-primary-50 dark:bg-primary-900/20'
                          : 'bg-white dark:bg-gray-800/60'
                      }`}
                    >
                      <View className="flex-row items-center gap-3">
                        <Text className="text-xl">{preset.icon}</Text>
                        <View>
                          <Text
                            className={`text-sm font-semibold ${
                              active
                                ? 'text-primary-700 dark:text-primary-400'
                                : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            {preset.label}
                          </Text>
                          <Text className="text-xs text-gray-400">
                            {preset.desc}
                          </Text>
                        </View>
                      </View>
                      <View
                        className={`size-5 items-center justify-center rounded-full border-2 ${
                          active
                            ? 'border-primary-600 bg-primary-600'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {active && <Check size={10} color="#fff" />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View className="flex-row gap-3 border-t border-gray-100 px-5 py-4 dark:border-gray-800">
            <Button
              label="Đặt lại"
              onPress={handleReset}
              variant="outline"
              className="flex-1"
            />
            <Button
              label="Áp dụng"
              onPress={handleApply}
              className="flex-1"
              disabled={filters.useCurrentLocation && !location}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
