import React from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';

import { useCrossSell } from '@/api/recommendations/use-cross-sell';
import { Text, View } from '@/components/ui';
import { useCart } from '@/lib/cart';
import { formatPrice } from '@/lib/cart/utils';
import type { Product } from '@/types';

type Props = { productIds: string[] };

export const CrossSell = ({ productIds }: Props) => {
  const { addItem } = useCart();
  const { data, isLoading } = useCrossSell({ variables: { productIds } });
  const items: Product[] = data?.data ?? [];

  if (isLoading || items.length === 0) return null;

  return (
    <View className="mt-4 px-4">
      <Text className="mb-2 text-base font-semibold">Thường mua kèm</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {items.map((p) => (
          <View key={p.id} className="mr-3 w-32 rounded-xl border border-neutral-200 p-2">
            <Text numberOfLines={1} className="text-sm font-medium">
              {p.name}
            </Text>
            <Text className="mt-1 text-xs text-neutral-500">
              {formatPrice(p.pricePerUnit ?? 0)}
            </Text>
            <TouchableOpacity
              testID={`cross-sell-add-${p.id}`}
              className="mt-2 rounded-lg bg-primary-600 py-1"
              onPress={() => addItem(p, 1)}
            >
              <Text className="text-center text-xs text-white">Thêm</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};
