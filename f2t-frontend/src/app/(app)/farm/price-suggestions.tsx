import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, RefreshControl, ScrollView, TouchableOpacity } from 'react-native';

import {
  useGetPriceSuggestions,
  useReviewSuggestion,
  useScanFreshness,
  useSubmitFreshness,
} from '@/api/dynamic-pricing';
import type { FreshnessTag, PriceSuggestion } from '@/api/dynamic-pricing';
import { useGetProducts } from '@/api/products';
import { RouteGuard } from '@/components/auth/route-guard';
import { Button, FocusAwareStatusBar, Text, View } from '@/components/ui';
import { useAuth } from '@/lib';

const freshnessTagConfig: Record<FreshnessTag, { label: string; className: string }> = {
  fresh: {
    label: 'Tươi',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  },
  aging: {
    label: 'Đang già',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
  },
  critical: {
    label: 'Khẩn cấp',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  },
};

const FRESHNESS_PRESETS: { label: string; score: number; tag: FreshnessTag; className: string }[] = [
  { label: 'Tươi (90%)', score: 0.9, tag: 'fresh', className: 'border-green-400 bg-green-50 dark:bg-green-900/20' },
  { label: 'Già (60%)', score: 0.6, tag: 'aging', className: 'border-amber-400 bg-amber-50 dark:bg-amber-900/20' },
  { label: 'Khẩn (20%)', score: 0.2, tag: 'critical', className: 'border-red-400 bg-red-50 dark:bg-red-900/20' },
];

function formatVND(n: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

function SuggestionCard({
  item,
  onAccept,
  onReject,
  loading,
}: {
  item: PriceSuggestion;
  onAccept: () => void;
  onReject: () => void;
  loading: boolean;
}) {
  const tag = freshnessTagConfig[item.freshnessTag];
  const isDiscount = item.deltaPct < 0;

  return (
    <View className="mb-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <View className="mb-3 flex-row items-start justify-between">
        <View className="mr-2 flex-1">
          <Text
            className="font-semibold text-gray-900 dark:text-white"
            numberOfLines={1}
          >
            {item.productName}
          </Text>
          <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            ID: {item.productId.slice(-8)}
          </Text>
        </View>
        <View className={`rounded-full px-2 py-1 ${tag.className}`}>
          <Text className="text-xs font-medium">{tag.label}</Text>
        </View>
      </View>

      <View className="mb-3 flex-row items-center gap-3">
        <View className="flex-1 rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
          <Text className="text-xs text-gray-500 dark:text-gray-400">Giá hiện tại</Text>
          <Text className="text-base font-bold text-gray-900 dark:text-white">
            {formatVND(item.basePrice)}
          </Text>
        </View>
        <View className="items-center">
          {isDiscount ? (
            <TrendingDown size={20} color="#ef4444" />
          ) : (
            <TrendingUp size={20} color="#22c55e" />
          )}
          <Text
            className={`text-sm font-bold ${isDiscount ? 'text-red-500' : 'text-green-500'}`}
          >
            {item.deltaPct > 0 ? '+' : ''}
            {item.deltaPct.toFixed(1)}%
          </Text>
        </View>
        <View className="flex-1 rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
          <Text className="text-xs text-gray-500 dark:text-gray-400">Giá đề xuất</Text>
          <Text
            className={`text-base font-bold ${isDiscount ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}
          >
            {formatVND(item.targetPrice)}
          </Text>
        </View>
      </View>

      <View className="mb-3 flex-row items-center gap-2">
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          Độ tươi: {(item.freshnessScore * 100).toFixed(0)}%
        </Text>
        {item.safetyClipped && (
          <View className="flex-row items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 dark:bg-yellow-900/20">
            <AlertTriangle size={10} color="#d97706" />
            <Text className="text-xs text-yellow-700 dark:text-yellow-400">Safety clip</Text>
          </View>
        )}
      </View>

      <View className="flex-row gap-2">
        <Button
          label="Từ chối"
          variant="outline"
          className="flex-1"
          onPress={onReject}
          disabled={loading}
        />
        <Button
          label="Áp dụng"
          variant="default"
          className="flex-1 bg-green-600"
          onPress={onAccept}
          disabled={loading}
        />
      </View>
    </View>
  );
}

function FreshnessScanner({ 
  farmId, 
  onReview, 
  reviewingId 
}: { 
  farmId: string;
  onReview: (id: string, decision: 'accept' | 'reject') => void;
  reviewingId: string | null;
}) {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('vegetables');
  const [selectedPreset, setSelectedPreset] = useState<number>(0);
  const [lastResult, setLastResult] = useState<{
    score: number;
    tag: FreshnessTag;
    medianScore: number;
    freshnessTag: FreshnessTag;
    suggestion?: PriceSuggestion | null;
  } | null>(null);

  const { data: productsRes } = useGetProducts({
    variables: { farmId, limit: 50 },
    enabled: !!farmId,
  });

  const products = productsRes?.success ? (productsRes.data?.items ?? []) : [];

  const { mutate: submitFreshness, isPending } = useSubmitFreshness({
    onSuccess: (resp) => {
      const result = resp?.data ?? resp;
      if (result && 'medianScore' in result) {
        // For manual submission, the current score is what we sent
        const preset = FRESHNESS_PRESETS[selectedPreset];
        setLastResult({
          score: preset.score,
          tag: preset.tag,
          medianScore: result.medianScore,
          freshnessTag: result.freshnessTag,
          suggestion: result.suggestion,
        });
      }
    },
    onError: () => {
      Alert.alert('Lỗi', 'Không thể gửi thông tin độ tươi. Thử lại sau.');
    },
  });

  const { mutate: scanFreshness, isPending: isScanning } = useScanFreshness({
    onSuccess: (resp) => {
      const result = resp?.data ?? resp;
      if (result && 'medianScore' in result) {
        setLastResult({
          score: result.score,
          tag: result.tag,
          medianScore: result.medianScore,
          freshnessTag: result.freshnessTag,
          suggestion: result.suggestion,
        });
      }
    },
    onError: () => {
      Alert.alert('Lỗi', 'Không thể phân tích ảnh. Thử lại sau.');
    },
  });

  const handleCameraScan = async () => {
    if (!selectedProductId) {
      Alert.alert('Chọn sản phẩm', 'Vui lòng chọn một sản phẩm trước khi chụp ảnh.');
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Cần quyền truy cập camera để quét độ tươi.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets?.[0]?.base64) return;
    scanFreshness({
      productId: selectedProductId,
      image_b64: result.assets[0].base64,
      category: selectedCategory,
    });
  };

  const handleGalleryPick = async () => {
    if (!selectedProductId) {
      Alert.alert('Chọn sản phẩm', 'Vui lòng chọn một sản phẩm trước khi chọn ảnh.');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh để quét độ tươi.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets?.[0]?.base64) return;
    scanFreshness({
      productId: selectedProductId,
      image_b64: result.assets[0].base64,
      category: selectedCategory,
    });
  };

  const handleSubmit = () => {
    if (!selectedProductId) {
      Alert.alert('Chọn sản phẩm', 'Vui lòng chọn một sản phẩm để quét độ tươi.');
      return;
    }
    const preset = FRESHNESS_PRESETS[selectedPreset];
    submitFreshness({
      productId: selectedProductId,
      score: preset.score,
      category: selectedCategory,
    });
  };

  return (
    <View className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/10">
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Zap size={16} color="#3b82f6" />
          <Text className="font-semibold text-blue-800 dark:text-blue-300">Quét độ tươi</Text>
        </View>
        {lastResult && (
          <TouchableOpacity onPress={() => setLastResult(null)}>
            <Text className="text-xs text-blue-600 dark:text-blue-400">Xóa kết quả</Text>
          </TouchableOpacity>
        )}
      </View>

      {products.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-3"
        >
          <View className="flex-row gap-2">
            {products.slice(0, 10).map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => {
                  setSelectedProductId(p.id);
                  setSelectedCategory(p.category || 'other');
                }}
                className={`rounded-lg border px-3 py-2 ${
                  selectedProductId === p.id
                    ? 'border-blue-500 bg-blue-100 dark:bg-blue-800'
                    : 'border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-700'
                }`}
              >
                <Text
                  className={`text-sm ${
                    selectedProductId === p.id
                      ? 'font-semibold text-blue-700 dark:text-blue-200'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                  numberOfLines={1}
                >
                  {p.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        <Text className="mb-3 text-sm text-gray-500 dark:text-gray-400">
          Không tìm thấy sản phẩm
        </Text>
      )}

      <View className="mb-3 flex-row gap-2">
        {FRESHNESS_PRESETS.map((preset, idx) => (
          <TouchableOpacity
            key={preset.tag}
            onPress={() => setSelectedPreset(idx)}
            className={`flex-1 rounded-lg border-2 p-2 ${
              selectedPreset === idx ? preset.className : 'border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-700'
            }`}
          >
            <Text
              className={`text-center text-xs font-medium ${
                selectedPreset === idx ? '' : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              {preset.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {lastResult && (
        <View className="mb-3">
          <View className="mb-3 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <View className="flex-row border-b border-gray-100 p-3 dark:border-gray-700">
              <View className="flex-1">
                <Text className="text-xs text-gray-500 dark:text-gray-400">Kết quả quét</Text>
                <Text className={`text-base font-bold ${lastResult.tag === 'fresh' ? 'text-green-600' : lastResult.tag === 'aging' ? 'text-amber-600' : 'text-red-600'}`}>
                  {freshnessTagConfig[lastResult.tag].label} ({(lastResult.score * 100).toFixed(0)}%)
                </Text>
              </View>
            </View>
            <View className="bg-gray-50 p-2 dark:bg-gray-700/50">
              <Text className="text-center text-[10px] text-gray-500 dark:text-gray-400">
                Giá đề xuất dựa trên kết quả quét mới nhất.
              </Text>
            </View>
          </View>
          
          {lastResult.suggestion && (
            <View className="mt-2">
              <Text className="mb-2 text-xs font-bold uppercase text-gray-500">Gợi ý tức thì:</Text>
              <SuggestionCard
                item={lastResult.suggestion}
                loading={reviewingId === lastResult.suggestion.id}
                onAccept={() => {
                  onReview(lastResult.suggestion!.id, 'accept');
                  setLastResult(null); // Clear after action
                }}
                onReject={() => {
                  onReview(lastResult.suggestion!.id, 'reject');
                  setLastResult(null); // Clear after action
                }}
              />
            </View>
          )}
        </View>
      )}

      {!lastResult && (
        <View className="gap-2">
          <View className="flex-row gap-2">
            <Button
              label={isScanning ? 'Đang phân tích...' : 'Chụp ảnh AI'}
              onPress={handleCameraScan}
              disabled={isScanning || isPending || !selectedProductId}
              variant="outline"
              className="flex-1 border-blue-500"
            />
            <Button
              label="Chọn từ thư viện"
              onPress={handleGalleryPick}
              disabled={isScanning || isPending || !selectedProductId}
              variant="outline"
              className="flex-1 border-blue-400"
            />
          </View>
          <Button
            label={isPending ? 'Đang gửi...' : 'Nhập thủ công'}
            onPress={handleSubmit}
            disabled={isPending || isScanning || !selectedProductId}
            variant="default"
            className="w-full bg-blue-600"
          />
        </View>
      )}
    </View>
  );
}

function PriceSuggestionsContent() {
  const router = useRouter();
  const farm = useAuth.use.farm();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const {
    data: suggestionsRes,
    isLoading,
    refetch,
  } = useGetPriceSuggestions({ enabled: true });

  const { mutate: reviewSuggestion } = useReviewSuggestion({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-suggestions'] });
      setReviewingId(null);
    },
    onError: () => {
      Alert.alert('Lỗi', 'Không thể cập nhật gợi ý giá. Thử lại sau.');
      setReviewingId(null);
    },
  });

  const suggestionsData = suggestionsRes?.data;
  const suggestions: PriceSuggestion[] = suggestionsData?.items ?? [];
  const total = suggestionsData?.total ?? 0;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleReview = (id: string, decision: 'accept' | 'reject') => {
    setReviewingId(id);
    reviewSuggestion({ id, decision });
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <FocusAwareStatusBar />

      <View className="border-b border-gray-200 bg-white px-4 pb-4 pt-12 dark:border-gray-700 dark:bg-gray-800">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              Gợi ý giá AI
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {total} gợi ý đang chờ xét duyệt
            </Text>
          </View>
          <TouchableOpacity onPress={handleRefresh}>
            <RefreshCw size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {farm?.id && (
          <FreshnessScanner 
            farmId={farm.id} 
            onReview={handleReview}
            reviewingId={reviewingId}
          />
        )}

        {isLoading && !refreshing ? (
          <View className="items-center py-8">
            <Text className="text-gray-500 dark:text-gray-400">Đang tải gợi ý giá...</Text>
          </View>
        ) : suggestions.length === 0 ? (
          <View className="items-center rounded-xl bg-white py-12 dark:bg-gray-800">
            <CheckCircle size={48} color="#22c55e" />
            <Text className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
              Không có gợi ý nào
            </Text>
            <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Hệ thống AI sẽ tạo gợi ý khi phát hiện cơ hội tối ưu giá
            </Text>
          </View>
        ) : (
          suggestions.map((item) => (
            <SuggestionCard
              key={item.id}
              item={item}
              loading={reviewingId === item.id}
              onAccept={() => handleReview(item.id, 'accept')}
              onReject={() => handleReview(item.id, 'reject')}
            />
          ))
        )}

        <View className="h-8" />
      </ScrollView>
    </View>
  );
}

export default function PriceSuggestionsScreen() {
  return (
    <RouteGuard allowedRoles={['farm']}>
      <PriceSuggestionsContent />
    </RouteGuard>
  );
}
