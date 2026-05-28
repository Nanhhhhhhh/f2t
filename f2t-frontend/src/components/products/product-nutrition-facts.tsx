import React, { useState } from 'react';
import { Pressable } from 'react-native';

import { Text, View } from '@/components/ui';
import type { Product } from '@/types';

type ProductNutritionFactsProps = {
  nutritionalInfo: NonNullable<Product['nutritionalInfo']>;
};

export const ProductNutritionFacts = ({
  nutritionalInfo,
}: ProductNutritionFactsProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const macronutrients = [
    { label: 'Calories', value: nutritionalInfo.calories, unit: '' },
    { label: 'Protein', value: nutritionalInfo.protein, unit: 'g' },
    { label: 'Carbohydrates', value: nutritionalInfo.carbs, unit: 'g' },
    { label: 'Fat', value: nutritionalInfo.fat, unit: 'g' },
    { label: 'Fiber', value: nutritionalInfo.fiber, unit: 'g' },
  ].filter((item) => item.value !== undefined);

  const vitamins = nutritionalInfo.vitamins || [];

  return (
    <View>
      <Pressable
        onPress={() => setIsExpanded(!isExpanded)}
        className="flex-row items-center justify-between"
      >
        <Text className="text-lg font-semibold text-gray-900 dark:text-white">
          Nutrition Facts
        </Text>
        <Text className="text-gray-500 dark:text-gray-500">
          {isExpanded ? '−' : '+'}
        </Text>
      </Pressable>

      {isExpanded && (
        <View className="mt-4">
          {/* Serving size info */}
          <View className="mb-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Per 100g serving
            </Text>
          </View>

          {/* Macronutrients */}
          {macronutrients.length > 0 && (
            <View className="mb-4">
              <Text className="mb-3 font-medium text-gray-700 dark:text-gray-300">
                Macronutrients
              </Text>
              <View className="space-y-2">
                {macronutrients.map((nutrient, index) => (
                  <View key={index} className="flex-row justify-between">
                    <Text className="text-gray-600 dark:text-gray-400">
                      {nutrient.label}
                    </Text>
                    <Text className="font-medium text-gray-900 dark:text-white">
                      {nutrient.value}
                      {nutrient.unit}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Vitamins and minerals */}
          {vitamins.length > 0 && (
            <View className="mb-4">
              <Text className="mb-3 font-medium text-gray-700 dark:text-gray-300">
                Rich in Vitamins & Minerals
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {vitamins.map((vitamin, index) => (
                  <View
                    key={index}
                    className="rounded-full bg-green-100 px-3 py-1 dark:bg-green-900/20"
                  >
                    <Text className="text-sm font-medium text-green-800 dark:text-green-300">
                      {vitamin}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Health benefits note */}
          <View className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/10">
            <Text className="text-sm text-blue-800 dark:text-blue-300">
              💡 Nutritional values are approximate and may vary based on
              growing conditions and preparation methods.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};
