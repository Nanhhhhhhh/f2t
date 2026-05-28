import React, { useCallback, useState } from 'react';
import { Alert, Pressable } from 'react-native';

import { Button, Image, Text, View } from '@/components/ui';
import type { CartItem } from '@/lib/cart';
import { useUpdateCartQuantity } from '@/lib/cart';
import { formatPrice } from '@/lib/cart/utils';

// Props for the cart item component
export type CartItemProps = {
  item: CartItem;
  onPress?: (item: CartItem) => void;
  onNotesPress?: (item: CartItem) => void;
  showFarmInfo?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
};

// Quantity controls component
const QuantityControls = ({
  item,
  onUpdateQuantity,
}: {
  item: CartItem;
  onUpdateQuantity: (quantity: number) => void;
}) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleQuantityChange = useCallback(
    async (newQuantity: number) => {
      if (newQuantity < 0) return;

      setIsUpdating(true);
      try {
        onUpdateQuantity(newQuantity);
      } finally {
        setIsUpdating(false);
      }
    },
    [onUpdateQuantity]
  );

  const handleIncrement = useCallback(() => {
    const newQuantity = item.quantity + 1;
    if (newQuantity <= item.product.availableQuantity) {
      handleQuantityChange(newQuantity);
    } else {
      Alert.alert(
        'Insufficient Stock',
        `Only ${item.product.availableQuantity} ${item.product.unit}s available`
      );
    }
  }, [
    item.quantity,
    item.product.availableQuantity,
    item.product.unit,
    handleQuantityChange,
  ]);

  const handleDecrement = useCallback(() => {
    if (item.quantity > 1) {
      handleQuantityChange(item.quantity - 1);
    }
  }, [item.quantity, handleQuantityChange]);

  const handleRemove = useCallback(() => {
    Alert.alert('Remove Item', `Remove ${item.product.name} from cart?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => handleQuantityChange(0),
      },
    ]);
  }, [item.product.name, handleQuantityChange]);

  return (
    <View className="flex-row items-center space-x-2">
      {/* Decrement button */}
      <Button
        label="-"
        onPress={handleDecrement}
        variant="outline"
        size="sm"
        disabled={item.quantity <= 1 || isUpdating}
        className="size-8 rounded-full p-0"
      />

      {/* Quantity display */}
      <View className="min-w-[40px] items-center">
        <Text className="text-sm font-medium text-gray-900 dark:text-white">
          {item.quantity}
        </Text>
      </View>

      {/* Increment button */}
      <Button
        label="+"
        onPress={handleIncrement}
        variant="outline"
        size="sm"
        disabled={item.quantity >= item.product.availableQuantity || isUpdating}
        className="size-8 rounded-full p-0"
      />

      {/* Remove button */}
      <Button
        label="🗑️"
        onPress={handleRemove}
        variant="ghost"
        size="sm"
        className="ml-2 size-8 rounded-full p-0"
      />
    </View>
  );
};

// Farm info component
const FarmInfo = ({ farmId }: { farmId: string }) => (
  <View className="flex-row items-center space-x-1">
    <Text className="text-xs text-gray-500 dark:text-gray-400">from</Text>
    <Text className="text-xs font-medium text-blue-600 dark:text-blue-400">
      Farm {farmId.slice(-4)}
    </Text>
  </View>
);

// Product image component
const ProductImage = ({
  images,
  productName,
}: {
  images: string[];
  productName: string;
}) => (
  <View className="size-16 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
    {images.length > 0 ? (
      <Image
        source={{ uri: images[0] }}
        className="size-full"
        contentFit="cover"
        alt={productName}
      />
    ) : (
      <View className="flex size-full items-center justify-center">
        <Text className="text-2xl">📦</Text>
      </View>
    )}
  </View>
);

// Price display component
const PriceDisplay = ({ item }: { item: CartItem }) => {
  const pricePerUnit = item.product.pricePerUnit;
  const totalPrice = pricePerUnit * item.quantity;

  return (
    <View className="items-end">
      <Text className="text-sm font-semibold text-gray-900 dark:text-white">
        {formatPrice(totalPrice)}
      </Text>
      <Text className="text-xs text-gray-500 dark:text-gray-400">
        {formatPrice(pricePerUnit)} per {item.product.unit}
      </Text>
    </View>
  );
};

// Notes display component
const NotesDisplay = ({
  item,
  onNotesPress,
}: {
  item: CartItem;
  onNotesPress?: (item: CartItem) => void;
}) => {
  if (!item.notes) return null;

  return (
    <Pressable
      onPress={() => onNotesPress?.(item)}
      className="mt-1 rounded bg-gray-50 p-2 dark:bg-gray-800"
    >
      <Text className="text-xs text-gray-600 dark:text-gray-400">
        Note: {item.notes}
      </Text>
    </Pressable>
  );
};

// Compact variant component
const CompactCartItem = ({
  item,
  onUpdateQuantity,
  onPress,
  onNotesPress,
}: CartItemProps & {
  onUpdateQuantity: (quantity: number) => void;
}) => (
  <Pressable
    onPress={() => onPress?.(item)}
    className="flex-row items-center space-x-3 rounded-lg bg-white p-3 dark:bg-gray-800"
  >
    <ProductImage
      images={item.product.images}
      productName={item.product.name}
    />

    <View className="flex-1">
      <Text
        className="text-sm font-medium text-gray-900 dark:text-white"
        numberOfLines={1}
      >
        {item.product.name}
      </Text>
      <Text
        className="text-xs text-gray-500 dark:text-gray-400"
        numberOfLines={1}
      >
        {item.product.description}
      </Text>
      <FarmInfo farmId={item.farmId} />
    </View>

    <View className="items-end space-y-1">
      <PriceDisplay item={item} />
      <QuantityControls item={item} onUpdateQuantity={onUpdateQuantity} />
    </View>
  </Pressable>
);

// Default variant component
const DefaultCartItem = ({
  item,
  onUpdateQuantity,
  onPress,
  onNotesPress,
  showFarmInfo,
}: CartItemProps & {
  onUpdateQuantity: (quantity: number) => void;
}) => (
  <View className="rounded-lg bg-white p-4 dark:bg-gray-800">
    <Pressable onPress={() => onPress?.(item)}>
      <View className="flex-row space-x-3">
        <ProductImage
          images={item.product.images}
          productName={item.product.name}
        />

        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900 dark:text-white">
            {item.product.name}
          </Text>
          <Text
            className="text-sm text-gray-600 dark:text-gray-400"
            numberOfLines={2}
          >
            {item.product.description}
          </Text>

          {showFarmInfo && <FarmInfo farmId={item.farmId} />}

          <View className="mt-2 flex-row items-center justify-between">
            <PriceDisplay item={item} />
            <View className="flex-row items-center space-x-2">
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                Added {new Date(item.addedAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>

    <View className="mt-3 flex-row items-center justify-between">
      <QuantityControls item={item} onUpdateQuantity={onUpdateQuantity} />

      <Button
        label="Add Note"
        onPress={() => onNotesPress?.(item)}
        variant="ghost"
        size="sm"
        className="text-xs"
      />
    </View>

    <NotesDisplay item={item} onNotesPress={onNotesPress} />
  </View>
);

// Detailed variant component
const DetailedCartItem = ({
  item,
  onUpdateQuantity,
  onPress,
  onNotesPress,
  showFarmInfo,
}: CartItemProps & {
  onUpdateQuantity: (quantity: number) => void;
}) => (
  <View className="rounded-lg bg-white p-4 dark:bg-gray-800">
    <Pressable onPress={() => onPress?.(item)}>
      <View className="flex-row space-x-3">
        <ProductImage
          images={item.product.images}
          productName={item.product.name}
        />

        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            {item.product.name}
          </Text>
          <Text
            className="text-sm text-gray-600 dark:text-gray-400"
            numberOfLines={3}
          >
            {item.product.description}
          </Text>

          {showFarmInfo && <FarmInfo farmId={item.farmId} />}

          {/* Product details */}
          <View className="mt-2 flex-row flex-wrap gap-2">
            {item.product.isOrganic && (
              <View className="rounded-full bg-green-100 px-2 py-1 dark:bg-green-900">
                <Text className="text-xs font-medium text-green-800 dark:text-green-200">
                  Organic
                </Text>
              </View>
            )}
            {item.product.tags?.map((tag) => (
              <View
                key={tag}
                className="rounded-full bg-blue-100 px-2 py-1 dark:bg-blue-900"
              >
                <Text className="text-xs font-medium text-blue-800 dark:text-blue-200">
                  {tag}
                </Text>
              </View>
            ))}
          </View>

          <View className="mt-3 flex-row items-center justify-between">
            <PriceDisplay item={item} />
            <View className="items-end">
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                Stock: {item.product.availableQuantity} {item.product.unit}s
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                Added {new Date(item.addedAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>

    <View className="mt-4 flex-row items-center justify-between">
      <QuantityControls item={item} onUpdateQuantity={onUpdateQuantity} />

      <View className="flex-row space-x-2">
        <Button
          label="Add Note"
          onPress={() => onNotesPress?.(item)}
          variant="ghost"
          size="sm"
          className="text-xs"
        />
        <Button
          label="View Details"
          onPress={() => onPress?.(item)}
          variant="outline"
          size="sm"
          className="text-xs"
        />
      </View>
    </View>

    <NotesDisplay item={item} onNotesPress={onNotesPress} />
  </View>
);

// Main cart item component
export const CartItemComponent = ({
  item,
  onPress,
  onNotesPress,
  showFarmInfo = true,
  variant = 'default',
  className,
}: CartItemProps) => {
  const updateQuantity = useUpdateCartQuantity();

  const handleUpdateQuantity = useCallback(
    (quantity: number) => {
      if (quantity === 0) {
        updateQuantity(item.id, 0); // This will remove the item
      } else {
        updateQuantity(item.id, quantity);
      }
    },
    [item.id, updateQuantity]
  );

  const baseProps = {
    item,
    onUpdateQuantity: handleUpdateQuantity,
    onPress,
    onNotesPress,
    showFarmInfo,
  };

  return (
    <View className={className}>
      {variant === 'compact' && <CompactCartItem {...baseProps} />}
      {variant === 'default' && <DefaultCartItem {...baseProps} />}
      {variant === 'detailed' && <DetailedCartItem {...baseProps} />}
    </View>
  );
};

// Export default
export default CartItemComponent;
