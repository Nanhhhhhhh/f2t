import type { CartItem } from './index';

// Format cart item for display
export const formatCartItem = (item: CartItem) => {
  return {
    id: item.id,
    name: item.product.name,
    quantity: item.quantity,
    unit: item.product.unit,
    pricePerUnit: item.product.pricePerUnit,
    totalPrice: item.product.pricePerUnit * item.quantity,
    farmName: item.product.farmId, // This would be resolved from farm data
    addedAt: new Date(item.addedAt).toLocaleDateString(),
    notes: item.notes,
  };
};

// Calculate cart totals
export const calculateCartTotals = (items: CartItem[]) => {
  const subtotal = items.reduce((total, item) => {
    return total + item.product.pricePerUnit * item.quantity;
  }, 0);

  // Calculate delivery fees (simplified - would be more complex in real app)
  const farms = Array.from(new Set(items.map((item) => item.farmId)));
  const deliveryFee = farms.length * 5; // $5 per farm

  // Calculate tax (simplified - would be based on location)
  const taxRate = 0.08; // 8% tax
  const tax = subtotal * taxRate;

  const total = subtotal + deliveryFee + tax;

  return {
    subtotal,
    deliveryFee,
    tax,
    total,
    itemCount: items.reduce((count, item) => count + item.quantity, 0),
    farmCount: farms.length,
  };
};

// Group cart items by farm
export const groupCartItemsByFarm = (items: CartItem[]) => {
  const grouped = items.reduce(
    (acc, item) => {
      if (!acc[item.farmId]) {
        acc[item.farmId] = [];
      }
      acc[item.farmId].push(item);
      return acc;
    },
    {} as Record<string, CartItem[]>
  );

  return Object.entries(grouped).map(([farmId, farmItems]) => ({
    farmId,
    items: farmItems,
    subtotal: farmItems.reduce((total, item) => {
      return total + item.product.pricePerUnit * item.quantity;
    }, 0),
    itemCount: farmItems.reduce((count, item) => count + item.quantity, 0),
  }));
};

// Validate cart before checkout
export const validateCartForCheckout = (items: CartItem[]) => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (items.length === 0) {
    errors.push('Cart is empty');
    return { isValid: false, errors, warnings };
  }

  // Check each item
  items.forEach((item, index) => {
    const { product, quantity } = item;

    // Check if product is still available
    if (product.status !== 'available') {
      errors.push(`${product.name} is no longer available`);
    }

    // Check stock availability
    if (product.availableQuantity < quantity) {
      errors.push(
        `${product.name}: Only ${product.availableQuantity} ${product.unit}s available (requested: ${quantity})`
      );
    }

    // Check minimum order quantity
    if (quantity < product.minimumOrder) {
      errors.push(
        `${product.name}: Minimum order quantity is ${product.minimumOrder} ${product.unit}s`
      );
    }

    // Check if product is fresh (warning only)
    const harvestDate = new Date(product.harvestDate);
    const daysSinceHarvest = Math.floor(
      (Date.now() - harvestDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceHarvest > 7) {
      warnings.push(
        `${product.name} was harvested ${daysSinceHarvest} days ago`
      );
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

// Generate cart summary text
export const generateCartSummary = (items: CartItem[]) => {
  const totals = calculateCartTotals(items);
  

  if (items.length === 0) {
    return 'Your cart is empty';
  }

  const itemText = totals.itemCount === 1 ? 'item' : 'items';
  const farmText = totals.farmCount === 1 ? 'farm' : 'farms';

  return `${totals.itemCount} ${itemText} from ${totals.farmCount} ${farmText} • ${formatPrice(totals.total)}`;
};

// Check if product is in cart
export const isProductInCart = (
  items: CartItem[],
  productId: string
): boolean => {
  return items.some((item) => item.productId === productId);
};

// Get cart item for product
export const getCartItemForProduct = (
  items: CartItem[],
  productId: string
): CartItem | undefined => {
  return items.find((item) => item.productId === productId);
};

// Calculate estimated delivery time
export const calculateEstimatedDelivery = (items: CartItem[]) => {
  const farmGroups = groupCartItemsByFarm(items);

  // Simplified calculation - would be more complex in real app
  const maxDeliveryDays = Math.max(
    ...farmGroups.map((_group) => {
      // Each farm would have its own delivery time
      // For now, assume 1-3 days based on farm
      return Math.floor(Math.random() * 3) + 1;
    })
  );

  const today = new Date();
  const deliveryDate = new Date(today);
  deliveryDate.setDate(today.getDate() + maxDeliveryDays);

  return {
    estimatedDays: maxDeliveryDays,
    deliveryDate: deliveryDate.toISOString(),
    deliveryDateFormatted: deliveryDate.toLocaleDateString(),
  };
};

// Format price for display (VND — consistent with @/api/products formatPrice)
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'VND',
  }).format(price);
};

// Format quantity with unit
export const formatQuantity = (quantity: number, unit: string): string => {
  return `${quantity} ${unit}${quantity !== 1 ? 's' : ''}`;
};

// Generate cart item ID
export const generateCartItemId = (): string => {
  return `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Sort cart items by farm, then by name
export const sortCartItems = (items: CartItem[]): CartItem[] => {
  return [...items].sort((a, b) => {
    // First sort by farm ID
    if (a.farmId !== b.farmId) {
      return a.farmId.localeCompare(b.farmId);
    }
    // Then sort by product name
    return a.product.name.localeCompare(b.product.name);
  });
};

// Get cart statistics
export const getCartStatistics = (items: CartItem[]) => {
  const totals = calculateCartTotals(items);
  

  const organicItems = items.filter((item) => item.product.isOrganic).length;
  const seasonalItems = items.filter((item) => {
    // Simplified seasonal check
    
    return (
      item.product.seasonalAvailability?.includes('year_round') ||
      item.product.seasonalAvailability?.includes('summer')
    );
  }).length;

  return {
    ...totals,
    organicItems,
    seasonalItems,
    averageItemPrice:
      totals.itemCount > 0 ? totals.subtotal / totals.itemCount : 0,
    mostExpensiveItem: items.reduce(
      (max, item) =>
        item.product.pricePerUnit > max.product.pricePerUnit ? item : max,
      items[0] || null
    ),
    cheapestItem: items.reduce(
      (min, item) =>
        item.product.pricePerUnit < min.product.pricePerUnit ? item : min,
      items[0] || null
    ),
  };
};
