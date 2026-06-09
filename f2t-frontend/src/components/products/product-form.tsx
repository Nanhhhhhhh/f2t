import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState } from 'react';
import {
  type Control,
  Controller,
  type FieldErrors,
  useForm,
} from 'react-hook-form';
import { ScrollView } from 'react-native';
import { z } from 'zod';

import {
  getCategoryLabel,
  PRODUCT_CATEGORIES,
  useCreateProduct,
  useUpdateProduct,
} from '@/api/products';
import { Button, Checkbox, Input, Select, Text, View } from '@/components/ui';
import type { Product } from '@/types';
import { SEASONS } from '@/types/constants';

import { ProductImagePicker } from './image-picker';
import { NutritionalInfoForm } from './nutritional-info-form';

// Validation schema
const productFormSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(100, 'Name too long'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description too long'),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  pricePerUnit: z
    .number()
    .min(0.01, 'Price must be greater than 0')
    .max(10000, 'Price too high'),
  unit: z.string().min(1, 'Unit is required'),
  status: z
    .enum(['available', 'sold_out', 'unavailable', 'seasonal'])
    .optional(),
  availableQuantity: z
    .number()
    .min(0, 'Quantity cannot be negative')
    .max(100000, 'Quantity too high'),
  minimumOrder: z
    .number()
    .min(1, 'Minimum order must be at least 1')
    .max(1000, 'Minimum order too high'),
  images: z.array(z.string()).max(5, 'Maximum 5 images allowed'),
  harvestDate: z.string().min(1, 'Harvest date is required'),
  deliveryDate: z.string().min(1, 'Delivery date is required'),
  estimatedShelfLife: z
    .number()
    .min(1, 'Shelf life must be at least 1 day')
    .max(365, 'Shelf life too long'),
  isOrganic: z.boolean(),
  farmingMethods: z
    .array(z.string())
    .min(1, 'At least one farming method required'),
  qualityGrade: z.string().optional(),
  freshnessLevel: z.string().optional(),
  seasonalAvailability: z
    .array(z.string())
    .min(1, 'At least one season required'),
  storageRequirements: z.string().optional(),
  packagingType: z.string().optional(),
  tags: z.array(z.string()).max(10, 'Maximum 10 tags allowed'),
  nutritionalInfo: z
    .object({
      calories: z.number().optional(),
      protein: z.number().optional(),
      carbs: z.number().optional(),
      fat: z.number().optional(),
      fiber: z.number().optional(),
      vitamins: z.array(z.string()).optional(),
    })
    .optional(),
  storageInstructions: z.string().max(200, 'Instructions too long').optional(),
  allergenInfo: z.array(z.string()).optional(),
});

type ProductFormData = z.infer<typeof productFormSchema>;

type ProductFormProps = {
  product?: Product;
  farmId: string;
  onSuccess?: (product: Product) => void;
  onCancel?: () => void;
  loading?: boolean;
};

// Form field components
const BasicInfoSection = ({
  control,
  errors,
}: {
  control: Control<ProductFormData>;
  errors: FieldErrors<ProductFormData>;
}) => (
  <View className="mb-6">
    <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
      Basic Information
    </Text>

    <View className="mb-4">
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Product Name *"
            placeholder="e.g., Organic Roma Tomatoes"
            value={value}
            onChangeText={onChange}
            error={errors.name?.message}
          />
        )}
      />
    </View>

    <View className="mb-4">
      <Controller
        control={control}
        name="description"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Description *"
            placeholder="Describe your product, growing methods, taste, etc."
            value={value}
            onChangeText={onChange}
            error={errors.description?.message}
            multiline
            numberOfLines={4}
          />
        )}
      />
    </View>

    <View className="mb-4 flex-row space-x-3">
      <View className="flex-1">
        <Controller
          control={control}
          name="category"
          render={({ field: { onChange, value } }) => (
            <Select
              label="Category *"
              value={value}
              onSelect={onChange}
              options={Object.values(PRODUCT_CATEGORIES).map((category) => ({
                label: getCategoryLabel(category),
                value: category,
              }))}
              placeholder="Select category"
              error={errors.category?.message}
            />
          )}
        />
      </View>

      <View className="flex-1">
        <Controller
          control={control}
          name="subcategory"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Subcategory"
              placeholder="e.g., Cherry, Heirloom"
              value={value}
              onChangeText={onChange}
              error={errors.subcategory?.message}
            />
          )}
        />
      </View>
    </View>
  </View>
);

const PricingSection = ({
  control,
  errors,
}: {
  control: Control<ProductFormData>;
  errors: FieldErrors<ProductFormData>;
}) => {
  const unitOptions = [
    { label: 'Kilogram (kg)', value: 'kg' },
    { label: 'Gram (g)', value: 'g' },
    { label: 'Piece', value: 'piece' },
    { label: 'Bunch', value: 'bunch' },
    { label: 'Box', value: 'box' },
    { label: 'Bag', value: 'bag' },
    { label: 'Liter', value: 'liter' },
  ];

  const statusOptions = [
    { label: 'Đang bán', value: 'available' },
    { label: 'Hết hàng', value: 'sold_out' },
    { label: 'Ngừng bán', value: 'unavailable' },
    { label: 'Theo mùa', value: 'seasonal' },
  ];

  return (
    <View className="mb-6">
      <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Pricing & Quantity
      </Text>

      <View className="mb-4 flex-row space-x-3">
        <View className="flex-1">
          <Controller
            control={control}
            name="pricePerUnit"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Price per Unit *"
                placeholder="0.00"
                value={value?.toString()}
                onChangeText={(text) => onChange(parseFloat(text) || 0)}
                keyboardType="decimal-pad"
                error={errors.pricePerUnit?.message}
              />
            )}
          />
        </View>

        <View className="flex-1">
          <Controller
            control={control}
            name="unit"
            render={({ field: { onChange, value } }) => (
              <Select
                label="Unit *"
                value={value}
                onSelect={onChange}
                options={unitOptions}
                placeholder="Select unit"
                error={errors.unit?.message}
              />
            )}
          />
        </View>
      </View>

      <View className="mb-4 flex-row space-x-3">
        <View className="flex-1">
          <Controller
            control={control}
            name="availableQuantity"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Available Quantity *"
                placeholder="0"
                value={value?.toString()}
                onChangeText={(text) => onChange(parseInt(text) || 0)}
                keyboardType="numeric"
                error={errors.availableQuantity?.message}
              />
            )}
          />
        </View>

        <View className="flex-1">
          <Controller
            control={control}
            name="minimumOrder"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Minimum Order *"
                placeholder="1"
                value={value?.toString()}
                onChangeText={(text) => onChange(parseInt(text) || 1)}
                keyboardType="numeric"
                error={errors.minimumOrder?.message}
              />
            )}
          />
        </View>
      </View>

      <View className="mb-4">
        <Controller
          control={control}
          name="status"
          render={({ field: { onChange, value } }) => (
            <Select
              label="Trạng thái"
              value={value}
              onSelect={onChange}
              options={statusOptions}
              placeholder="Chọn trạng thái"
              error={errors.status?.message}
            />
          )}
        />
      </View>
    </View>
  );
};

const DatesSection = ({
  control,
  errors,
}: {
  control: Control<ProductFormData>;
  errors: FieldErrors<ProductFormData>;
}) => (
  <View className="mb-6">
    <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
      Dates & Freshness
    </Text>

    <View className="mb-4 flex-row space-x-3">
      <View className="flex-1">
        <Controller
          control={control}
          name="harvestDate"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Harvest Date *"
              placeholder="YYYY-MM-DD"
              value={value}
              onChangeText={onChange}
              error={errors.harvestDate?.message}
            />
          )}
        />
      </View>

      <View className="flex-1">
        <Controller
          control={control}
          name="deliveryDate"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Available From"
              placeholder="YYYY-MM-DD"
              value={value}
              onChangeText={onChange}
              error={errors.deliveryDate?.message}
            />
          )}
        />
      </View>
    </View>

    <View className="mb-4">
      <Controller
        control={control}
        name="estimatedShelfLife"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Shelf Life (days)"
            placeholder="7"
            value={value?.toString()}
            onChangeText={(text) => onChange(parseInt(text) || 1)}
            keyboardType="numeric"
            error={errors.estimatedShelfLife?.message}
          />
        )}
      />
    </View>
  </View>
);

const QualitySection = ({
  control,
  errors,
}: {
  control: Control<ProductFormData>;
  errors: FieldErrors<ProductFormData>;
}) => {
  const qualityOptions = [
    { label: 'Premium', value: 'premium' },
    { label: 'Standard', value: 'standard' },
    { label: 'Seconds', value: 'seconds' },
    { label: 'Bulk', value: 'bulk' },
  ];

  const freshnessOptions = [
    { label: 'Same Day', value: 'same_day' },
    { label: 'Next Day', value: 'next_day' },
    { label: 'Within Week', value: 'within_week' },
    { label: 'Stored', value: 'stored' },
  ];

  const farmingMethodOptions = [
    { label: 'Hữu cơ', value: 'organic' },
    { label: 'Thông thường', value: 'conventional' },
    { label: 'Nhà kính', value: 'greenhouse' },
    { label: 'Thủy canh', value: 'hydroponic' },
    { label: 'Bền vững', value: 'sustainable' },
    { label: 'Tự nhiên', value: 'natural' },
  ];

  return (
    <View className="mb-6">
      <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Quality & Methods
      </Text>

      <View className="mb-4">
        <Controller
          control={control}
          name="isOrganic"
          render={({ field: { onChange, value } }) => (
            <Checkbox
              label="Certified Organic"
              checked={value}
              onChange={onChange}
              accessibilityLabel="Mark as certified organic"
            />
          )}
        />
      </View>

      <View className="mb-4 flex-row space-x-3">
        <View className="flex-1">
          <Controller
            control={control}
            name="qualityGrade"
            render={({ field: { onChange, value } }) => (
              <Select
                label="Quality Grade"
                value={value}
                onSelect={onChange}
                options={qualityOptions}
                placeholder="Select grade"
                error={errors.qualityGrade?.message}
              />
            )}
          />
        </View>

        <View className="flex-1">
          <Controller
            control={control}
            name="freshnessLevel"
            render={({ field: { onChange, value } }) => (
              <Select
                label="Freshness Level"
                value={value}
                onSelect={onChange}
                options={freshnessOptions}
                placeholder="Select freshness"
                error={errors.freshnessLevel?.message}
              />
            )}
          />
        </View>
      </View>

      <View className="mb-4">
        <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Farming Methods *
        </Text>
        <Controller
          control={control}
          name="farmingMethods"
          render={({ field: { onChange, value = [] } }) => (
            <View className="flex-row flex-wrap gap-2">
              {farmingMethodOptions.map((method) => (
                <Checkbox
                  key={method.value}
                  label={method.label}
                  checked={value.includes(method.value)}
                  onChange={(checked) => {
                    if (checked) {
                      onChange([...value, method.value]);
                    } else {
                      onChange(value.filter((v: string) => v !== method.value));
                    }
                  }}
                  accessibilityLabel={`Toggle ${method.label} farming method`}
                />
              ))}
            </View>
          )}
        />
        {errors.farmingMethods && (
          <Text className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.farmingMethods.message}
          </Text>
        )}
      </View>
    </View>
  );
};

const SeasonalSection = ({
  control,
  errors,
}: {
  control: Control<ProductFormData>;
  errors: FieldErrors<ProductFormData>;
}) => {
  const seasonOptions = Object.values(SEASONS).map((season) => ({
    label: season.charAt(0).toUpperCase() + season.slice(1).replace('_', ' '),
    value: season,
  }));

  return (
    <View className="mb-6">
      <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Seasonal Availability
      </Text>

      <View className="mb-4">
        <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Available Seasons *
        </Text>
        <Controller
          control={control}
          name="seasonalAvailability"
          render={({ field: { onChange, value = [] } }) => (
            <View className="flex-row flex-wrap gap-2">
              {seasonOptions.map((season) => (
                <Checkbox
                  key={season.value}
                  label={season.label}
                  checked={value.includes(season.value)}
                  onChange={(checked) => {
                    if (checked) {
                      onChange([...value, season.value]);
                    } else {
                      onChange(value.filter((v: string) => v !== season.value));
                    }
                  }}
                  accessibilityLabel={`Toggle ${season.label} availability`}
                />
              ))}
            </View>
          )}
        />
        {errors.seasonalAvailability && (
          <Text className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.seasonalAvailability.message}
          </Text>
        )}
      </View>
    </View>
  );
};

const StorageSection = ({
  control,
  errors,
}: {
  control: Control<ProductFormData>;
  errors: FieldErrors<ProductFormData>;
}) => {
  const storageOptions = [
    { label: 'Refrigerated', value: 'refrigerated' },
    { label: 'Frozen', value: 'frozen' },
    { label: 'Room Temperature', value: 'room_temperature' },
    { label: 'Cool & Dry', value: 'cool_dry' },
  ];

  const packagingOptions = [
    { label: 'Loose', value: 'loose' },
    { label: 'Bagged', value: 'bagged' },
    { label: 'Boxed', value: 'boxed' },
    { label: 'Wrapped', value: 'wrapped' },
  ];

  return (
    <View className="mb-6">
      <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Storage & Packaging
      </Text>

      <View className="mb-4 flex-row space-x-3">
        <View className="flex-1">
          <Controller
            control={control}
            name="storageRequirements"
            render={({ field: { onChange, value } }) => (
              <Select
                label="Storage Requirements"
                value={value}
                onSelect={onChange}
                options={storageOptions}
                placeholder="Select storage type"
                error={errors.storageRequirements?.message}
              />
            )}
          />
        </View>

        <View className="flex-1">
          <Controller
            control={control}
            name="packagingType"
            render={({ field: { onChange, value } }) => (
              <Select
                label="Packaging Type"
                value={value}
                onSelect={onChange}
                options={packagingOptions}
                placeholder="Select packaging"
                error={errors.packagingType?.message}
              />
            )}
          />
        </View>
      </View>

      <View className="mb-4">
        <Controller
          control={control}
          name="storageInstructions"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Storage Instructions"
              placeholder="e.g., Keep refrigerated, use within 3 days"
              value={value}
              onChangeText={onChange}
              error={errors.storageInstructions?.message}
              multiline
              numberOfLines={2}
            />
          )}
        />
      </View>
    </View>
  );
};

export const ProductForm = ({
  product,
  farmId,
  onSuccess,
  onCancel,
  loading: externalLoading = false,
}: ProductFormProps) => {
  const [tags, setTags] = useState<string[]>(product?.tags || []);
  const [allergens, setAllergens] = useState<string[]>(
    product?.allergenInfo || []
  );

  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();

  const isEditing = !!product;
  const isLoading =
    externalLoading ||
    createProductMutation.isPending ||
    updateProductMutation.isPending;

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product
      ? {
          name: product.name,
          description: product.description,
          category: product.category,
          subcategory: product.subcategory,
          pricePerUnit: product.pricePerUnit,
          unit: product.unit,
          status: product.status as ProductFormData['status'],
          availableQuantity: product.availableQuantity,
          minimumOrder: product.minimumOrder,
          images: product.images,
          harvestDate: product.harvestDate,
          deliveryDate: product.deliveryDate,
          estimatedShelfLife: product.estimatedShelfLife,
          isOrganic: product.isOrganic,
          farmingMethods: product.farmingMethods,
          qualityGrade: product.qualityGrade,
          freshnessLevel: product.freshnessLevel,
          seasonalAvailability: product.seasonalAvailability || [],
          storageRequirements: product.storageRequirements,
          packagingType: product.packagingType,
          tags: product.tags,
          nutritionalInfo: product.nutritionalInfo,
          storageInstructions: product.storageInstructions,
          allergenInfo: product.allergenInfo,
        }
      : {
          farmingMethods: [],
          seasonalAvailability: [],
          tags: [],
          images: [],
          isOrganic: false,
          minimumOrder: 1,
          estimatedShelfLife: 7,
          status: 'available',
        },
  });

  const onSubmit = async (data: ProductFormData) => {
    try {
      const formData = {
        ...data,
        tags,
        allergenInfo: allergens,
      };

      if (isEditing && product) {
        const result = await updateProductMutation.mutateAsync({
          id: product.id,
          ...formData,
        });
        if (result.success && onSuccess) {
          onSuccess(result.data);
        }
      } else {
        // status is not part of CreateProductDto — server defaults new products to 'available'
        const { status: _status, ...createData } = formData;
        const result = await createProductMutation.mutateAsync({
          farmId,
          ...createData,
          price: createData.pricePerUnit,
          stockQuantity: createData.availableQuantity,
          organicCertified: createData.isOrganic,
          isActive: true,
        });
        if (result.success && onSuccess) {
          onSuccess(result.data);
        }
      }
    } catch (error) {}
  };

  const handleReset = () => {
    reset();
    setTags(product?.tags || []);
    setAllergens(product?.allergenInfo || []);
  };

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="p-4">
        <Text className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
          {isEditing ? 'Edit Product' : 'Add New Product'}
        </Text>

        <BasicInfoSection control={control} errors={errors} />
        <PricingSection control={control} errors={errors} />
        <DatesSection control={control} errors={errors} />
        <QualitySection control={control} errors={errors} />
        <SeasonalSection control={control} errors={errors} />
        <StorageSection control={control} errors={errors} />

        {/* Images Section */}
        <View className="mb-6">
          <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Product Images
          </Text>
          <Controller
            control={control}
            name="images"
            render={({ field: { onChange, value } }) => (
              <ProductImagePicker
                images={value || []}
                onImagesChange={onChange}
                maxImages={5}
                error={errors.images?.message}
              />
            )}
          />
        </View>

        {/* Nutritional Info Section */}
        <View className="mb-6">
          <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Nutritional Information (Optional)
          </Text>
          <Controller
            control={control}
            name="nutritionalInfo"
            render={({ field: { onChange, value } }) => (
              <NutritionalInfoForm
                nutritionalInfo={value}
                onNutritionalInfoChange={onChange}
                error={errors.nutritionalInfo?.message}
              />
            )}
          />
        </View>

        {/* Action Buttons */}
        <View className="mb-8 flex-row space-x-3">
          <Button
            label="Cancel"
            onPress={onCancel}
            variant="outline"
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            label="Reset"
            onPress={handleReset}
            variant="ghost"
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            label={isEditing ? 'Update Product' : 'Create Product'}
            onPress={handleSubmit(onSubmit)}
            variant="default"
            className="flex-1"
            loading={isLoading}
          />
        </View>
      </View>
    </ScrollView>
  );
};
