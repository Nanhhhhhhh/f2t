import React, { useMemo } from 'react';
import { Pressable } from 'react-native';

const formatVND = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

import { Button, Text, View } from '@/components/ui';
import {
  useCartFarms,
  useCartIsEmpty,
  useCartItemCount,
  useCartItems,
  useCartTotal,
} from '@/lib/cart';
import {
  calculateCartTotals,
  generateCartSummary,
  groupCartItemsByFarm,
  validateCartForCheckout,
} from '@/lib/cart/utils';

// Props for the cart summary component
export type CartSummaryProps = {
  onCheckout?: () => void;
  onViewCart?: () => void;
  onClearCart?: () => void;
  variant?: 'compact' | 'default' | 'detailed';
  showCheckoutButton?: boolean;
  showClearButton?: boolean;
  showFarmBreakdown?: boolean;
  showValidation?: boolean;
  className?: string;
};

// Cart totals display component
const CartTotalsDisplay = ({
  totals,
  variant = 'default',
}: {
  totals: ReturnType<typeof calculateCartTotals>;
  variant?: 'compact' | 'default' | 'detailed';
}) => {
  if (variant === 'compact') {
    return (
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-gray-900 dark:text-white">
          {totals.itemCount} item{totals.itemCount !== 1 ? 's' : ''}
        </Text>
        <Text className="text-lg font-bold text-gray-900 dark:text-white">
          {formatVND(totals.total)}
        </Text>
      </View>
    );
  }

  return (
    <View className="space-y-2">
      {/* Subtotal */}
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          Subtotal ({totals.itemCount} item{totals.itemCount !== 1 ? 's' : ''})
        </Text>
        <Text className="text-sm font-medium text-gray-900 dark:text-white">
          {formatVND(totals.subtotal)}
        </Text>
      </View>

      {/* Delivery Fee */}
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          Delivery ({totals.farmCount} farm{totals.farmCount !== 1 ? 's' : ''})
        </Text>
        <Text className="text-sm font-medium text-gray-900 dark:text-white">
          {formatVND(totals.deliveryFee)}
        </Text>
      </View>

      {/* Tax */}
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-gray-600 dark:text-gray-400">Tax</Text>
        <Text className="text-sm font-medium text-gray-900 dark:text-white">
          {formatVND(totals.tax)}
        </Text>
      </View>

      {/* Total */}
      <View className="border-t border-gray-200 pt-2 dark:border-gray-700">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-semibold text-gray-900 dark:text-white">
            Total
          </Text>
          <Text className="text-lg font-bold text-gray-900 dark:text-white">
            {formatVND(totals.total)}
          </Text>
        </View>
      </View>
    </View>
  );
};

// Farm breakdown component
const FarmBreakdown = ({
  farmGroups,
}: {
  farmGroups: ReturnType<typeof groupCartItemsByFarm>;
}) => (
  <View className="space-y-3">
    <Text className="text-sm font-medium text-gray-900 dark:text-white">
      Order Breakdown
    </Text>
    {farmGroups.map((group) => (
      <View
        key={group.farmId}
        className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800"
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-medium text-gray-900 dark:text-white">
            Farm {group.farmId.slice(-4)}
          </Text>
          <Text className="text-sm font-medium text-gray-900 dark:text-white">
            {formatVND(group.subtotal)}
          </Text>
        </View>
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          {group.itemCount} item{group.itemCount !== 1 ? 's' : ''}
        </Text>
      </View>
    ))}
  </View>
);

// Validation warnings component
const ValidationWarnings = ({
  validation,
}: {
  validation: ReturnType<typeof validateCartForCheckout>;
}) => {
  if (validation.isValid && validation.warnings.length === 0) {
    return null;
  }

  return (
    <View className="space-y-2">
      {validation.errors.length > 0 && (
        <View className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
          <Text className="text-sm font-medium text-red-800 dark:text-red-200">
            Issues Found:
          </Text>
          {validation.errors.map((error, index) => (
            <Text
              key={index}
              className="text-xs text-red-700 dark:text-red-300"
            >
              • {error}
            </Text>
          ))}
        </View>
      )}

      {validation.warnings.length > 0 && (
        <View className="rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
          <Text className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Warnings:
          </Text>
          {validation.warnings.map((warning, index) => (
            <Text
              key={index}
              className="text-xs text-yellow-700 dark:text-yellow-300"
            >
              • {warning}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

// Action buttons component
const ActionButtons = ({
  onCheckout,
  onViewCart,
  onClearCart,
  showCheckoutButton = true,
  showClearButton = false,
  isValid = true,
  variant = 'default',
}: {
  onCheckout?: () => void;
  onViewCart?: () => void;
  onClearCart?: () => void;
  showCheckoutButton?: boolean;
  showClearButton?: boolean;
  isValid?: boolean;
  variant?: 'compact' | 'default' | 'detailed';
}) => {
  if (variant === 'compact') {
    return (
      <View className="flex-row space-x-2">
        {onViewCart && (
          <Button
            label="View Cart"
            onPress={onViewCart}
            variant="outline"
            size="sm"
            className="flex-1"
          />
        )}
        {showCheckoutButton && onCheckout && (
          <Button
            label="Checkout"
            onPress={onCheckout}
            variant="default"
            size="sm"
            disabled={!isValid}
            className="flex-1"
          />
        )}
      </View>
    );
  }

  return (
    <View className="space-y-2">
      <View className="flex-row space-x-2">
        {onViewCart && (
          <Button
            label="View Cart"
            onPress={onViewCart}
            variant="outline"
            className="flex-1"
          />
        )}
        {showCheckoutButton && onCheckout && (
          <Button
            label="Proceed to Checkout"
            onPress={onCheckout}
            variant="default"
            disabled={!isValid}
            className="flex-1"
          />
        )}
      </View>

      {showClearButton && onClearCart && (
        <Button
          label="Clear Cart"
          onPress={onClearCart}
          variant="ghost"
          className="text-red-600 dark:text-red-400"
        />
      )}
    </View>
  );
};

// Empty cart component
const EmptyCart = ({ onViewProducts }: { onViewProducts?: () => void }) => (
  <View className="items-center space-y-4 py-8">
    <View className="size-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
      <Text className="text-2xl">🛒</Text>
    </View>
    <View className="items-center space-y-2">
      <Text className="text-lg font-medium text-gray-900 dark:text-white">
        Your cart is empty
      </Text>
      <Text className="text-sm text-gray-500 dark:text-gray-400">
        Add some products to get started
      </Text>
    </View>
    {onViewProducts && (
      <Button
        label="Browse Products"
        onPress={onViewProducts}
        variant="default"
      />
    )}
  </View>
);

// Main cart summary component
export const CartSummary = ({
  onCheckout,
  onViewCart,
  onClearCart,
  variant = 'default',
  showCheckoutButton = true,
  showClearButton = false,
  showFarmBreakdown = false,
  showValidation = true,
  className,
}: CartSummaryProps) => {
  const items = useCartItems();
  const totalPrice = useCartTotal();
  const itemCount = useCartItemCount();
  const isEmpty = useCartIsEmpty();
  const farms = useCartFarms();

  // Calculate cart totals
  const totals = useMemo(() => calculateCartTotals(items), [items]);

  // Group items by farm
  const farmGroups = useMemo(() => groupCartItemsByFarm(items), [items]);

  // Validate cart for checkout
  const validation = useMemo(() => validateCartForCheckout(items), [items]);

  // Generate cart summary text
  const summaryText = useMemo(() => generateCartSummary(items), [items]);

  if (isEmpty) {
    return (
      <View className={className}>
        <EmptyCart onViewProducts={onViewCart} />
      </View>
    );
  }

  return (
    <View className={`space-y-4 ${className}`}>
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white">
          Cart Summary
        </Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          {summaryText}
        </Text>
      </View>

      {/* Validation warnings */}
      {showValidation && <ValidationWarnings validation={validation} />}

      {/* Farm breakdown */}
      {showFarmBreakdown && variant !== 'compact' && (
        <FarmBreakdown farmGroups={farmGroups} />
      )}

      {/* Cart totals */}
      <CartTotalsDisplay totals={totals} variant={variant} />

      {/* Action buttons */}
      <ActionButtons
        onCheckout={onCheckout}
        onViewCart={onViewCart}
        onClearCart={onClearCart}
        showCheckoutButton={showCheckoutButton}
        showClearButton={showClearButton}
        isValid={validation.isValid}
        variant={variant}
      />
    </View>
  );
};

// Compact cart summary for headers/banners
export const CompactCartSummary = (
  props: Omit<CartSummaryProps, 'variant'>
) => <CartSummary {...props} variant="compact" />;

// Detailed cart summary for checkout screens
export const DetailedCartSummary = (
  props: Omit<CartSummaryProps, 'variant'>
) => (
  <CartSummary
    {...props}
    variant="detailed"
    showFarmBreakdown={true}
    showValidation={true}
  />
);

// Cart summary badge for navigation
export const CartSummaryBadge = ({ onPress }: { onPress?: () => void }) => {
  const itemCount = useCartItemCount();
  const totalPrice = useCartTotal();
  const isEmpty = useCartIsEmpty();

  if (isEmpty) {
    return null;
  }

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center space-x-2 rounded-lg bg-blue-600 px-3 py-2 dark:bg-blue-500"
    >
      <Text className="text-sm font-medium text-white">
        {itemCount} item{itemCount !== 1 ? 's' : ''}
      </Text>
      <Text className="text-sm font-bold text-white">
        {formatVND(totalPrice)}
      </Text>
    </Pressable>
  );
};

// Export default
export default CartSummary;
