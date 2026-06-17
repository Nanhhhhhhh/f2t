import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useMemo } from 'react';
import { Alert } from 'react-native';

import { useGetFarm } from '@/api/farms';
import { useCreateOrder } from '@/api/orders';
import { useCreateCheckout } from '@/api/payments';
import { ConsumerRouteGuard } from '@/components/auth';
import type { CheckoutFormData } from '@/components/checkout';
import { CheckoutForm } from '@/components/checkout';
import { Button, Text, View } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useCart, useCartItems } from '@/lib/cart';
import { formatPrice, TAX_RATE } from '@/lib/cart/utils';

// Map giá trị country lưu trong DB về đúng value option của Select (VNM/USA).
// Mặc định Việt Nam cho mọi biến thể VN/Vietnam/Việt Nam/rỗng.
const normalizeCountry = (raw?: string): string => {
  const v = (raw ?? '').trim().toLowerCase();
  if (['usa', 'us', 'united states', 'hoa kỳ', 'hoa ky'].includes(v)) return 'USA';
  return 'VNM';
};

// Main checkout screen component
const CheckoutScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ productIds?: string }>();
  const allItems = useCartItems();

  // Chỉ thanh toán các sản phẩm được chọn (productIds truyền từ giỏ); mặc định cả giỏ.
  const items = useMemo(() => {
    if (!params.productIds) return allItems;
    const ids = new Set(params.productIds.split(','));
    return allItems.filter((i) => ids.has(i.productId));
  }, [allItems, params.productIds]);

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, i) =>
          sum + (i.product.dynamicPrice ?? i.product.pricePerUnit) * i.quantity,
        0
      ),
    [items]
  );
  // Thuế VAT tính server-side khi tạo đơn (OrdersService); hiển thị ở đây để khớp.
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  const isEmpty = items.length === 0;

  // Đơn hàng F2T theo 1 farm — lấy farm từ item đầu để biết phương thức giao farm hỗ trợ.
  const farmId = items[0]?.farmId;
  const { data: farmResponse } = useGetFarm({
    variables: { id: farmId ?? '' },
    enabled: !!farmId,
  });
  const supportedDeliveryMethods = farmResponse?.data?.deliveryMethods;
  const { removeItem } = useCart();
  const user = useAuth.use.user();

  const createOrderMutation = useCreateOrder();
  const createCheckoutMutation = useCreateCheckout();

  // Pre-populate form with user data if available
  const initialData = user
    ? {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phoneNumber || '',
        shippingAddress: user.location?.address ? {
          street: user.location.address.street || '',
          addressLine1: '',
          city: user.location.address.city || '',
          postalCode: user.location.address.zipCode || '',
          // Chuẩn hoá về đúng value của Select (VNM/USA); DB có thể lưu "Vietnam"/"VN"/…
          // không khớp 'VNM' → Select hiện placeholder và bắt chọn lại.
          country: normalizeCountry(user.location.address.country),
        } : undefined,
      }
    : undefined;

  // Redirect if cart is empty
  if (isEmpty) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <View className="items-center space-y-4">
          <Text className="text-6xl">🛒</Text>
          <Text className="text-xl font-semibold text-gray-900 dark:text-white">
            Your cart is empty
          </Text>
          <Text className="text-center text-gray-500 dark:text-gray-400">
            Add some products to your cart before checking out
          </Text>
          <Button
            label="Browse Products"
            onPress={() => router.push('/products')}
            variant="default"
          />
        </View>
      </View>
    );
  }

  const handleOrderSubmit = async (formData: CheckoutFormData) => {
    try {
      // Transform cart items to order items
      const orderItems = items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        notes: item.notes,
      }));

      // Create order request
      const orderRequest = {
        items: orderItems,
        paymentMethod: formData.paymentMethod,
        deliveryMethod: formData.deliveryMethod,
        shippingAddress: {
          type: 'shipped' as const,
          firstName: formData.firstName,
          lastName: formData.lastName,
          street: formData.shippingAddress.street,
          addressLine1: formData.shippingAddress.addressLine1,
          city: formData.shippingAddress.city,
          postalCode: formData.shippingAddress.postalCode,
          country: formData.shippingAddress.country,
          phoneNumber: formData.phone,
        },
        deliveryDate: formData.deliveryDate,
        deliveryTimeSlot: formData.deliveryTimeSlot,
        deliveryInstructions: formData.deliveryInstructions,
        notes: formData.notes,
        specialInstructions: formData.specialInstructions,
        discountCode: formData.discountCode,
      };

      // Create the order
      const response = await createOrderMutation.mutateAsync(orderRequest);

      if (response.success) {
        // Chỉ xoá các sản phẩm vừa thanh toán khỏi giỏ (giữ lại sản phẩm farm khác).
        items.forEach((i) => removeItem(i.id));
        const orderId = response.data?.order.id;

        if (formData.paymentMethod === 'stripe') {
          try {
            const checkout = await createCheckoutMutation.mutateAsync({
              orderId: orderId!,
            });
            await WebBrowser.openAuthSessionAsync(checkout.data.url, 'f2t://');
          } catch {
            // Checkout session creation failed — user can retry from Order Details
          }
          router.replace(`/(app)/orders/${orderId}`);
        } else {
          router.replace(`/checkout/success?orderId=${orderId}`);
        }
      }
    } catch (error) {
      Alert.alert(
        'Order Failed',
        'There was an error processing your order. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <View className="flex-row items-center justify-between">
          <Button
            label="← Back"
            onPress={() => router.back()}
            variant="ghost"
            size="sm"
          />
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            Checkout
          </Text>
          <View className="w-12" />
        </View>
      </View>

      <View className="flex-1">
        <CheckoutForm
          onSubmit={handleOrderSubmit}
          isLoading={createOrderMutation.isPending}
          initialData={initialData}
          supportedDeliveryMethods={supportedDeliveryMethods}
        />
      </View>

      {/* Tổng tiền của các sản phẩm đang thanh toán (subset) */}
      <View className="border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <View className="mb-1 flex-row items-center justify-between">
          <Text className="text-gray-600 dark:text-gray-400">
            Tạm tính ({items.length} sản phẩm)
          </Text>
          <Text className="text-gray-900 dark:text-white">
            {formatPrice(subtotal)}
          </Text>
        </View>
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-gray-600 dark:text-gray-400">Thuế VAT (10%)</Text>
          <Text className="text-gray-900 dark:text-white">{formatPrice(tax)}</Text>
        </View>
        <View className="flex-row items-center justify-between border-t border-gray-100 pt-2 dark:border-gray-700">
          <Text className="font-semibold text-gray-900 dark:text-white">
            Tổng (chưa gồm phí giao hàng)
          </Text>
          <Text className="text-lg font-bold text-gray-900 dark:text-white">
            {formatPrice(total)}
          </Text>
        </View>
      </View>
    </View>
  );
};

// Export with route guard
export default function CheckoutScreenWithGuard() {
  return (
    <ConsumerRouteGuard>
      <CheckoutScreen />
    </ConsumerRouteGuard>
  );
}
