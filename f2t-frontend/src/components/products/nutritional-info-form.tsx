import React, { useState } from 'react';
import { Pressable } from 'react-native';

import { Button, Input, Text, View } from '@/components/ui';

type NutritionalInfo = {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  vitamins?: string[];
};

type NutritionalInfoFormProps = {
  nutritionalInfo?: NutritionalInfo;
  onNutritionalInfoChange: (info?: NutritionalInfo) => void;
  error?: string;
};

const commonVitamins = [
  'Vitamin A',
  'Vitamin C',
  'Vitamin D',
  'Vitamin E',
  'Vitamin K',
  'Vitamin B1',
  'Vitamin B2',
  'Vitamin B6',
  'Vitamin B12',
  'Folate',
  'Niacin',
  'Biotin',
  'Pantothenic Acid',
  'Calcium',
  'Iron',
  'Magnesium',
  'Phosphorus',
  'Potassium',
  'Sodium',
  'Zinc',
  'Copper',
  'Manganese',
  'Selenium',
];

export const NutritionalInfoForm = ({
  nutritionalInfo,
  onNutritionalInfoChange,
  error,
}: NutritionalInfoFormProps) => {
  const [showForm, setShowForm] = useState(!!nutritionalInfo);
  const [vitamins, setVitamins] = useState<string[]>(
    nutritionalInfo?.vitamins || []
  );

  const updateField = (
    field: keyof NutritionalInfo,
    value: NutritionalInfo[keyof NutritionalInfo]
  ) => {
    const updatedInfo = {
      ...nutritionalInfo,
      [field]: value,
    };
    onNutritionalInfoChange(updatedInfo);
  };

  const toggleVitamin = (vitamin: string) => {
    const newVitamins = vitamins.includes(vitamin)
      ? vitamins.filter((v) => v !== vitamin)
      : [...vitamins, vitamin];

    setVitamins(newVitamins);
    updateField('vitamins', newVitamins);
  };

  const clearNutritionalInfo = () => {
    setVitamins([]);
    onNutritionalInfoChange(undefined);
    setShowForm(false);
  };

  if (!showForm) {
    return (
      <View>
        <Button
          label="+ Add Nutritional Information"
          onPress={() => setShowForm(true)}
          variant="outline"
        />
        <Text className="mt-2 text-sm text-gray-500 dark:text-gray-500">
          Optional: Add nutritional facts to help customers make informed
          choices
        </Text>
      </View>
    );
  }

  return (
    <View className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      {/* Header */}
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-gray-900 dark:text-white">
          Nutritional Information
        </Text>
        <Button
          label="Remove"
          onPress={clearNutritionalInfo}
          variant="ghost"
          className="px-2 py-1"
        />
      </View>

      {/* Macronutrients */}
      <View className="mb-4">
        <Text className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
          Per 100g serving
        </Text>

        <View className="mb-3 flex-row space-x-3">
          <View className="flex-1">
            <Input
              label="Calories"
              placeholder="0"
              value={nutritionalInfo?.calories?.toString() || ''}
              onChangeText={(text) =>
                updateField('calories', parseFloat(text) || undefined)
              }
              keyboardType="decimal-pad"
            />
          </View>

          <View className="flex-1">
            <Input
              label="Protein (g)"
              placeholder="0"
              value={nutritionalInfo?.protein?.toString() || ''}
              onChangeText={(text) =>
                updateField('protein', parseFloat(text) || undefined)
              }
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View className="mb-3 flex-row space-x-3">
          <View className="flex-1">
            <Input
              label="Carbs (g)"
              placeholder="0"
              value={nutritionalInfo?.carbs?.toString() || ''}
              onChangeText={(text) =>
                updateField('carbs', parseFloat(text) || undefined)
              }
              keyboardType="decimal-pad"
            />
          </View>

          <View className="flex-1">
            <Input
              label="Fat (g)"
              placeholder="0"
              value={nutritionalInfo?.fat?.toString() || ''}
              onChangeText={(text) =>
                updateField('fat', parseFloat(text) || undefined)
              }
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View className="mb-4">
          <Input
            label="Fiber (g)"
            placeholder="0"
            value={nutritionalInfo?.fiber?.toString() || ''}
            onChangeText={(text) =>
              updateField('fiber', parseFloat(text) || undefined)
            }
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      {/* Vitamins & Minerals */}
      <View className="mb-4">
        <Text className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
          Rich in Vitamins & Minerals
        </Text>

        <View className="flex-row flex-wrap gap-2">
          {commonVitamins.map((vitamin) => (
            <Pressable
              key={vitamin}
              onPress={() => toggleVitamin(vitamin)}
              className={`rounded-full border px-3 py-1 ${
                vitamins.includes(vitamin)
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <Text
                className={`text-sm ${
                  vitamins.includes(vitamin)
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {vitamin}
              </Text>
            </Pressable>
          ))}
        </View>

        {vitamins.length > 0 && (
          <View className="mt-3">
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              Selected: {vitamins.join(', ')}
            </Text>
          </View>
        )}
      </View>

      {/* Helper Text */}
      <Text className="text-xs text-gray-500 dark:text-gray-500">
        💡 Nutritional information helps customers understand the health
        benefits of your products. Values should be per 100g serving.
      </Text>

      {/* Error Message */}
      {error && (
        <Text className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </Text>
      )}
    </View>
  );
};
