import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView } from 'react-native';

import { useGetFarm } from '@/api/farms';
import { CartItem } from '@/components/cart';
import { CrossSell } from '@/components/cart/cross-sell';
import { Button, Text, View } from '@/components/ui';
import { useCart, useCartIsEmpty, useClearFarmItems } from '@/lib/cart';
import type { CartItem as CartItemModel } from '@/lib/cart';
import { formatPrice } from '@/lib/cart/utils';

// Một nhóm sản phẩm theo farm: header tên farm + nút "Thanh toán [farm]",
// mỗi sản phẩm có checkbox chọn.
const FarmCartGroup = ({
  farmId,
  items,
  isSelected,
  onToggle,
  onCheckoutFarm,
}: {
  farmId: string;
  items: CartItemModel[];
  isSelected: (id: string) => boolean;
  onToggle: (id: string) => void;
  onCheckoutFarm: (items: CartItemModel[]) => void;
}) => {
  const { data } = useGetFarm({
    variables: { id: farmId },
    enabled: !!farmId,
  });
  const clearFarmItems = useClearFarmItems();

  useEffect(() => {
    // Nếu farm bị rejected hoặc không còn hoạt động, xoá khỏi giỏ hàng
    if (
      data?.success &&
      (data.data.verificationStatus !== 'verified' || !data.data.isActive)
    ) {
      clearFarmItems(farmId);
      Alert.alert(
        'Thông báo',
        `Nông trại "${data.data.name}" hiện không còn hoạt động. Các sản phẩm của nông trại này đã được xóa khỏi giỏ hàng của bạn.`
      );
    }
  }, [data, farmId, clearFarmItems]);

  const farmName = data?.data?.name ?? 'Nông trại';

  return (
    <View className="mb-4 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
      <View className="flex-row items-center justify-between border-b border-gray-100 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800">
        <Text
          className="flex-1 text-sm font-bold text-gray-900 dark:text-white"
          numberOfLines={1}
        >
          🏡 {farmName}
        </Text>
        <Pressable
          onPress={() => onCheckoutFarm(items)}
          className="rounded-lg bg-primary-600 px-3 py-1.5"
        >
          <Text className="text-xs font-semibold text-white">Thanh toán</Text>
        </Pressable>
      </View>

      {items.map((item) => {
        const selected = isSelected(item.id);
        return (
          <View
            key={item.id}
            className="flex-row items-center gap-2 px-2 py-1"
          >
            <Pressable onPress={() => onToggle(item.id)} hitSlop={8}>
              <View
                className={`size-6 items-center justify-center rounded-md border-2 ${
                  selected
                    ? 'border-primary-600 bg-primary-600'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                {selected && <Check size={14} color="#fff" />}
              </View>
            </Pressable>
            <View className="flex-1">
              <CartItem item={item} variant="default" />
            </View>
          </View>
        );
      })}
    </View>
  );
};

export default function CartScreen() {
  const router = useRouter();
  const cart = useCart();
  const isEmpty = useCartIsEmpty();

  const crossSellProductIds = useMemo(
    () => cart.items.map((i) => i.productId),
    [cart.items],
  );

  // Chọn sản phẩm để thanh toán (theo dõi item BỊ BỎ chọn → mặc định chọn hết).
  const [deselected, setDeselected] = useState<Set<string>>(new Set());
  const isSelected = (id: string) => !deselected.has(id);
  const toggleItem = (id: string) =>
    setDeselected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Nhóm sản phẩm theo farm.
  const farmGroups = useMemo(() => {
    const map = new Map<string, CartItemModel[]>();
    for (const it of cart.items) {
      const arr = map.get(it.farmId) ?? [];
      arr.push(it);
      map.set(it.farmId, arr);
    }
    return Array.from(map, ([fid, items]) => ({ farmId: fid, items }));
  }, [cart.items]);

  const selectedItems = useMemo(
    () => cart.items.filter((i) => !deselected.has(i.id)),
    [cart.items, deselected],
  );
  const selectedSubtotal = useMemo(
    () =>
      selectedItems.reduce(
        (s, i) =>
          s + (i.product.dynamicPrice ?? i.product.pricePerUnit) * i.quantity,
        0,
      ),
    [selectedItems],
  );

  const goCheckout = (its: CartItemModel[]) =>
    router.push(`/checkout?productIds=${its.map((i) => i.productId).join(',')}`);

  // Thanh toán các sản phẩm ĐÃ CHỌN — chỉ cho phép nếu chúng cùng một nông trại.
  const handleCheckoutSelected = () => {
    if (selectedItems.length === 0) {
      Alert.alert(
        'Chưa chọn sản phẩm',
        'Vui lòng chọn ít nhất một sản phẩm để thanh toán.',
      );
      return;
    }
    const farms = new Set(selectedItems.map((i) => i.farmId));
    if (farms.size > 1) {
      Alert.alert(
        'Không thể thanh toán',
        'Các sản phẩm đã chọn thuộc nhiều nông trại khác nhau. Vui lòng chỉ chọn sản phẩm cùng một nông trại, hoặc dùng nút "Thanh toán" của từng nông trại.',
      );
      return;
    }
    goCheckout(selectedItems);
  };

  const handleViewProducts = () => {
    router.push('/products');
  };

  const handleViewFarms = () => {
    router.push('/farms');
  };

  if (isEmpty) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-6 dark:bg-gray-900">
        <Text className="mb-2 text-6xl">🛒</Text>
        <Text className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
          Your Cart is Empty
        </Text>
        <Text className="mb-6 text-center text-gray-600 dark:text-gray-400">
          Start adding fresh products from local farms to your cart
        </Text>
        <Button
          label="Browse Products"
          onPress={handleViewProducts}
          className="mb-3 w-full"
        />
        <Button
          label="Discover Farms"
          onPress={handleViewFarms}
          variant="outline"
          className="w-full"
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      <ScrollView className="flex-1">
        <View className="p-4">
          {/* Cart Header */}
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">
              Shopping Cart
            </Text>
            <Text className="text-gray-600 dark:text-gray-400">
              {cart.totalItems} {cart.totalItems === 1 ? 'item' : 'items'}
            </Text>
          </View>

          {/* Cart Items — nhóm theo nông trại, mỗi nhóm có nút thanh toán riêng */}
          <View className="mb-4">
            {farmGroups.map((g) => (
              <FarmCartGroup
                key={g.farmId}
                farmId={g.farmId}
                items={g.items}
                isSelected={isSelected}
                onToggle={toggleItem}
                onCheckoutFarm={goCheckout}
              />
            ))}
          </View>

          {/* Cross-sell recommendations */}
          <CrossSell productIds={crossSellProductIds} />

          {/* Continue Shopping Button */}
          <Button
            label="Continue Shopping"
            onPress={handleViewProducts}
            variant="outline"
            className="mb-4"
          />
        </View>
      </ScrollView>

      {/* Tổng đã chọn + thanh toán các sản phẩm đã chọn (phải cùng 1 nông trại) */}
      <View className="border-t border-gray-200 dark:border-gray-700">
        <View className="bg-white p-4 dark:bg-gray-900">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-gray-600 dark:text-gray-400">
              Đã chọn {selectedItems.length} sản phẩm
            </Text>
            <Text className="text-primary text-xl font-bold">
              {formatPrice(selectedSubtotal)}
            </Text>
          </View>

          <Button
            label={`Thanh toán đã chọn${selectedItems.length ? ` (${selectedItems.length})` : ''}`}
            onPress={handleCheckoutSelected}
            disabled={selectedItems.length === 0}
            className="w-full"
          />
        </View>
      </View>
    </View>
  );
}
