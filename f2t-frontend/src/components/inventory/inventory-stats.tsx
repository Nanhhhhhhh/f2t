import React from 'react';
import { ScrollView } from 'react-native';

import { formatPrice } from '@/api/products';
import { Text, View } from '@/components/ui';
import type { Product } from '@/types';

type InventoryStatsProps = {
  products: Product[];
};

// Calculate inventory statistics
const calculateStats = (products: Product[]) => {
  const totalProducts = products.length;
  const activeProducts = products.filter(
    (p) => p.status === 'available'
  ).length;
  const inStockProducts = products.filter(
    (p) => p.availableQuantity > 0
  ).length;
  const lowStockProducts = products.filter(
    (p) => p.availableQuantity > 0 && p.availableQuantity <= 5
  ).length;
  const outOfStockProducts = products.filter(
    (p) => p.availableQuantity === 0
  ).length;

  const totalValue = products.reduce((sum, product) => {
    return sum + product.pricePerUnit * product.availableQuantity;
  }, 0);

  const totalQuantity = products.reduce((sum, product) => {
    return sum + product.availableQuantity;
  }, 0);

  return {
    totalProducts,
    activeProducts,
    inStockProducts,
    lowStockProducts,
    outOfStockProducts,
    totalValue,
    totalQuantity,
  };
};

// Individual stat card component
const StatCard = ({
  title,
  value,
  subtitle,
  color = 'gray',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: 'gray' | 'green' | 'yellow' | 'red' | 'blue';
}) => {
  const colorClasses = {
    gray: 'bg-gray-50 border-gray-100 dark:bg-gray-800 dark:border-gray-700',
    green:
      'bg-green-50 border-green-100 dark:bg-green-900/10 dark:border-green-800',
    yellow:
      'bg-yellow-50 border-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-800',
    red: 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-800',
    blue: 'bg-blue-50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-800',
  };

  const textColorClasses = {
    gray: 'text-gray-900 dark:text-white',
    green: 'text-green-700 dark:text-green-300',
    yellow: 'text-yellow-700 dark:text-yellow-300',
    red: 'text-red-700 dark:text-red-300',
    blue: 'text-blue-700 dark:text-blue-300',
  };

  return (
    <View
      className={`mr-3 min-w-[120px] rounded-xl border p-2.5 ${colorClasses[color]}`}
    >
      <Text className={`text-lg font-bold ${textColorClasses[color]}`}>
        {value}
      </Text>
      <Text
        className={`text-[11px] font-medium leading-tight ${textColorClasses[color]}`}
      >
        {title}
      </Text>
      {subtitle && (
        <Text className={`text-[9px] opacity-70 ${textColorClasses[color]}`}>
          {subtitle}
        </Text>
      )}
    </View>
  );
};

export const InventoryStats = ({ products }: InventoryStatsProps) => {
  const stats = calculateStats(products);

  if (products.length === 0) return null;

  return (
    <View className="mb-4">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          subtitle={`${stats.activeProducts} active`}
          color="blue"
        />
        <StatCard
          title="Total Value"
          value={formatPrice(stats.totalValue)}
          subtitle={`${stats.totalQuantity} items`}
          color="green"
        />
        <StatCard
          title="In Stock"
          value={stats.inStockProducts}
          color="green"
        />
        <StatCard
          title="Low Stock"
          value={stats.lowStockProducts}
          color="yellow"
        />
        <StatCard
          title="Out of Stock"
          value={stats.outOfStockProducts}
          color="red"
        />
      </ScrollView>
    </View>
  );
};
