# Product Status Indicators - Usage Guide

This guide demonstrates how to use the product availability status indicator components in the Farm Marketplace app.

## Components Overview

### 1. ProductStatusBadge
A simple badge component that displays the current availability status of a product.

**Features:**
- Shows availability status (Available, Low Stock, Out of Stock, etc.)
- Multiple variants (default, compact, detailed)
- Customizable icon display
- Color-coded for quick visual recognition

**Usage:**
```tsx
import { ProductStatusBadge } from '@/components/products';

// Default variant
<ProductStatusBadge product={product} />

// Compact variant (icon only)
<ProductStatusBadge product={product} variant="compact" />

// Detailed variant (with border)
<ProductStatusBadge product={product} variant="detailed" />

// Without icon
<ProductStatusBadge product={product} showIcon={false} />
```

### 2. ProductAvailabilityIndicator
A comprehensive indicator that shows multiple availability-related information.

**Features:**
- Status badge
- Freshness indicator (for recently harvested products)
- Harvest time display
- Seasonal availability
- Stock count
- Shelf life information

**Usage:**
```tsx
import { ProductAvailabilityIndicator } from '@/components/products';

// Default variant (horizontal layout)
<ProductAvailabilityIndicator product={product} />

// Compact variant (minimal info)
<ProductAvailabilityIndicator 
  product={product} 
  variant="compact" 
/>

// Detailed variant (all information)
<ProductAvailabilityIndicator 
  product={product} 
  variant="detailed"
  showHarvestInfo={true}
  showSeasonalInfo={true}
  showFreshnessIndicator={true}
  showStockCount={true}
/>

// Custom configuration
<ProductAvailabilityIndicator 
  product={product}
  showHarvestInfo={false}
  showSeasonalInfo={true}
  showFreshnessIndicator={true}
  showStockCount={false}
/>
```

### 3. ProductStockIndicator
A specialized component for displaying stock levels and availability.

**Features:**
- Multiple display variants (text, bar, icon)
- Color-coded stock levels
- Low stock warnings
- Out of stock indicators

**Usage:**
```tsx
import { ProductStockIndicator } from '@/components/products';

// Text variant (default)
<ProductStockIndicator product={product} />

// Bar variant (visual progress bar)
<ProductStockIndicator 
  product={product} 
  variant="bar" 
  showLabel={true}
/>

// Icon variant (emoji indicators)
<ProductStockIndicator 
  product={product} 
  variant="icon" 
/>

// With label
<ProductStockIndicator 
  product={product} 
  showLabel={true}
/>
```

## Common Use Cases

### Product Card
```tsx
import { ProductCard, ProductStatusBadge } from '@/components/products';

function MyProductCard({ product }: { product: Product }) {
  return (
    <View>
      <Image source={{ uri: product.images[0] }} />
      <Text>{product.name}</Text>
      <ProductStatusBadge product={product} variant="compact" />
      <Text>{formatPrice(product.pricePerUnit)}</Text>
    </View>
  );
}
```

### Product Detail Screen
```tsx
import { 
  ProductAvailabilityIndicator,
  ProductStockIndicator 
} from '@/components/products';

function ProductDetailScreen({ product }: { product: Product }) {
  return (
    <ScrollView>
      {/* Product images and basic info */}
      
      {/* Comprehensive availability info */}
      <ProductAvailabilityIndicator 
        product={product}
        variant="detailed"
        showHarvestInfo={true}
        showSeasonalInfo={true}
        showFreshnessIndicator={true}
        showStockCount={true}
      />
      
      {/* Stock level bar */}
      <ProductStockIndicator 
        product={product} 
        variant="bar" 
        showLabel={true}
      />
      
      {/* Rest of product details */}
    </ScrollView>
  );
}
```

### Product List Item
```tsx
import { ProductStatusBadge } from '@/components/products';

function ProductListItem({ product }: { product: Product }) {
  return (
    <Pressable>
      <Image source={{ uri: product.images[0] }} />
      <View>
        <Text>{product.name}</Text>
        <ProductStatusBadge product={product} />
        <Text>{formatPrice(product.pricePerUnit)}</Text>
      </View>
    </Pressable>
  );
}
```

### Inventory Management
```tsx
import { 
  ProductStockIndicator,
  ProductStatusBadge 
} from '@/components/products';

function InventoryItem({ product }: { product: Product }) {
  return (
    <View>
      <Text>{product.name}</Text>
      
      {/* Status badge */}
      <ProductStatusBadge product={product} variant="detailed" />
      
      {/* Stock level bar for quick visual reference */}
      <ProductStockIndicator 
        product={product} 
        variant="bar" 
        showLabel={true}
      />
      
      {/* Action buttons */}
      <Button label="Update Stock" onPress={handleUpdateStock} />
    </View>
  );
}
```

### Search Results
```tsx
import { ProductStatusBadge } from '@/components/products';

function SearchResultItem({ product }: { product: Product }) {
  return (
    <View className="flex-row items-center gap-3">
      <Image source={{ uri: product.images[0] }} />
      <View className="flex-1">
        <Text>{product.name}</Text>
        <View className="flex-row items-center gap-2">
          <ProductStatusBadge product={product} variant="compact" />
          <Text>{formatPrice(product.pricePerUnit)}</Text>
        </View>
      </View>
    </View>
  );
}
```

## Status Types

The components recognize the following status types:

- **available**: Product is in stock and ready for purchase
- **low_stock**: Product has limited quantity remaining (≤5 units)
- **out_of_stock**: Product is currently unavailable (0 units)
- **expired**: Product has passed its expiry date
- **inactive**: Product is not currently being sold
- **seasonal**: Product is only available during certain seasons
- **pre_order**: Product is available for pre-order

## Styling

All components accept a `className` prop for custom styling:

```tsx
<ProductStatusBadge 
  product={product} 
  className="my-2 mx-4"
/>

<ProductAvailabilityIndicator 
  product={product}
  className="p-4 bg-white rounded-lg shadow"
/>

<ProductStockIndicator 
  product={product}
  className="mt-2"
/>
```

## Accessibility

All components are built with accessibility in mind and work well with screen readers. The status information is conveyed through both visual indicators and text labels.

## Performance

The components are optimized for performance:
- Minimal re-renders
- Efficient calculations
- Memoized where appropriate
- Lightweight and fast

## Testing

All components come with comprehensive test suites. See `product-status-indicators.test.tsx` for examples.

