# Cart Persistence with MMKV

This document describes the cart persistence implementation using MMKV storage for the Farm Marketplace app.

## Overview

The cart system uses MMKV (Memory-Mapped Key-Value) storage for fast, persistent storage of cart data. This ensures that users' cart contents are preserved across app restarts and device reboots.

## Features

### ✅ **Implemented Features**

- **Persistent Storage**: Cart data is automatically saved to MMKV storage
- **Data Migration**: Automatic migration of old cart data formats
- **Error Handling**: Graceful handling of storage errors
- **Performance**: Fast read/write operations with MMKV
- **Selective Persistence**: Only cart items and metadata are persisted, not UI state
- **Storage Management**: Utilities for storage cleanup and debugging

### 🔧 **Technical Implementation**

#### Storage Configuration

```typescript
const CART_STORAGE_KEY = 'cart-storage';
const CART_STORAGE_VERSION = 1;
```

#### Data Structure

```typescript
type CartItem = {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  farmId: string;
  addedAt: string;
  notes?: string;
};

type PersistedCartState = {
  items: CartItem[];
  lastUpdated: string | null;
};
```

#### Storage Operations

- **Read**: `storage.getString(CART_STORAGE_KEY)`
- **Write**: `storage.set(CART_STORAGE_KEY, jsonData)`
- **Delete**: `storage.delete(CART_STORAGE_KEY)`

## Usage

### Basic Cart Operations

```typescript
import { useCart, useCartStorage } from '@/lib/cart';

function CartComponent() {
  const { items, addItem, removeItem, clearCart } = useCart();
  const { lastUpdated, clearStorage } = useCartStorage();

  // Add item to cart (automatically persisted)
  const handleAddItem = (product: Product) => {
    addItem(product, 1);
  };

  // Clear cart and storage
  const handleClearCart = () => {
    clearCart();
    clearStorage();
  };

  return (
    <View>
      <Text>Items: {items.length}</Text>
      <Text>Last Updated: {lastUpdated}</Text>
    </View>
  );
}
```

### Storage Management

```typescript
import { getCartStorageInfo, cleanupCartStorage } from '@/lib/cart';

// Get storage information
const storageInfo = getCartStorageInfo();
console.log('Has cart data:', storageInfo.hasCartData);
console.log('Storage size:', storageInfo.cartDataSize);

// Clean up old cart data
const cleanupResult = cleanupCartStorage();
console.log('Cleaned keys:', cleanupResult.cleanedKeys);
```

## Data Migration

The cart system includes automatic data migration to handle format changes:

### Version 0 → 1 Migration

- Adds `lastUpdated` timestamp if missing
- Adds version information
- Handles corrupted data gracefully

### Migration Function

```typescript
const migrateCartData = (data: any): any => {
  if (!data || typeof data !== 'object') {
    return { items: [], lastUpdated: null };
  }

  // Handle old format without lastUpdated
  if (data.state && !data.state.lastUpdated) {
    data.state.lastUpdated = new Date().toISOString();
  }

  // Handle old format without version
  if (!data.version) {
    data.version = CART_STORAGE_VERSION;
  }

  return data;
};
```

## Error Handling

The cart persistence includes comprehensive error handling:

### Storage Errors

```typescript
const safeStorageOperation = <T>(operation: () => T, fallback: T): T => {
  try {
    return operation();
  } catch (error) {
    console.warn('Cart storage operation failed:', error);
    return fallback;
  }
};
```

### Error Scenarios Handled

- **Corrupted Data**: Invalid JSON data is ignored, cart initializes empty
- **Missing Data**: No data returns empty cart
- **Storage Failures**: Write/read failures don't crash the app
- **Migration Errors**: Old data format issues are handled gracefully

## Performance Considerations

### MMKV Benefits

- **Fast**: Memory-mapped storage for quick access
- **Efficient**: Minimal memory overhead
- **Reliable**: Crash-safe storage operations
- **Cross-platform**: Works on iOS and Android

### Optimization Strategies

- **Selective Persistence**: Only essential data is persisted
- **Batch Operations**: Multiple cart changes are batched
- **Lazy Loading**: Data is loaded only when needed
- **Error Recovery**: Failed operations don't block the UI

## Testing

### Test Coverage

The cart persistence includes comprehensive tests:

- **Storage Operations**: Read, write, delete operations
- **Data Migration**: Version migration and format handling
- **Error Handling**: Graceful error recovery
- **Performance**: Large data handling
- **Edge Cases**: Corrupted data, missing data, etc.

### Running Tests

```bash
npm test src/lib/cart/
```

## Debugging

### Storage Information

```typescript
import { getCartStorageInfo } from '@/lib/cart';

const info = getCartStorageInfo();
console.log('Storage Debug Info:', info);
```

### Storage Cleanup

```typescript
import { cleanupCartStorage } from '@/lib/cart';

const result = cleanupCartStorage();
console.log('Cleanup Result:', result);
```

## Best Practices

### Do's

- ✅ Use the provided hooks for cart operations
- ✅ Handle storage errors gracefully
- ✅ Test with different data scenarios
- ✅ Monitor storage size for performance
- ✅ Use cleanup utilities for maintenance

### Don'ts

- ❌ Don't access MMKV storage directly
- ❌ Don't ignore storage errors
- ❌ Don't store large objects in cart
- ❌ Don't modify cart state outside of actions
- ❌ Don't forget to test migration scenarios

## Troubleshooting

### Common Issues

1. **Cart not persisting**
   - Check if MMKV is properly initialized
   - Verify storage permissions
   - Check for storage errors in console

2. **Data migration issues**
   - Ensure version handling is correct
   - Test with old data formats
   - Check migration function logic

3. **Performance issues**
   - Monitor storage size
   - Use cleanup utilities
   - Check for memory leaks

### Debug Steps

1. Check storage info: `getCartStorageInfo()`
2. Verify cart state: `useCart().items`
3. Check for errors in console
4. Test with fresh app install
5. Verify MMKV initialization

## Future Enhancements

### Planned Features

- **Data Compression**: Compress large cart data
- **Sync**: Cloud sync for cart data
- **Analytics**: Cart usage analytics
- **Backup**: Cart data backup/restore
- **Encryption**: Encrypt sensitive cart data

### Migration Path

- **Version 2**: Add compression support
- **Version 3**: Add cloud sync
- **Version 4**: Add encryption
- **Version 5**: Add analytics

## Related Files

- `src/lib/cart/index.tsx` - Main cart store with persistence
- `src/lib/cart/storage.test.tsx` - Storage utility tests
- `src/lib/cart/cart.test.tsx` - Cart functionality tests
- `src/lib/cart/utils.tsx` - Cart utility functions
