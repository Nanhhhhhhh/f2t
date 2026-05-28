import type { Product } from '@/types';

// Cart item type
export type CartItem = {
  id: string; // Unique cart item ID
  productId: string;
  product: Product;
  quantity: number;
  farmId: string;
  addedAt: string; // ISO timestamp
  notes?: string; // Optional customer notes
};

// Cart totals type
export type CartTotals = {
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  itemCount: number;
  farmCount: number;
};

// Cart validation result
export type CartValidation = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
};

// Cart group by farm
export type CartFarmGroup = {
  farmId: string;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
};

// Cart statistics
export type CartStatistics = CartTotals & {
  organicItems: number;
  seasonalItems: number;
  averageItemPrice: number;
  mostExpensiveItem: CartItem | null;
  cheapestItem: CartItem | null;
};

// Delivery estimation
export type DeliveryEstimation = {
  estimatedDays: number;
  deliveryDate: string; // ISO timestamp
  deliveryDateFormatted: string;
};

// Cart item display format
export type CartItemDisplay = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  farmName: string;
  addedAt: string;
  notes?: string;
};

// Cart actions
export type CartActions = {
  addItem: (product: Product, quantity?: number, notes?: string) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  updateNotes: (cartItemId: string, notes: string) => void;
  clearCart: () => void;
  clearFarmItems: (farmId: string) => void;
  getItemByProductId: (productId: string) => CartItem | undefined;
  getItemsByFarm: (farmId: string) => CartItem[];
  canAddItem: (
    product: Product,
    quantity: number
  ) => { canAdd: boolean; reason?: string };
};

// Cart visibility actions
export type CartVisibilityActions = {
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
};

// Cart persistence actions
export type CartPersistenceActions = {
  hydrate: () => void;
  clearStorage: () => void;
};

// Cart state interface
export type CartState = {
  // State
  items: CartItem[];
  isOpen: boolean;
  lastUpdated: string | null;

  // Computed values
  totalItems: number;
  totalPrice: number;
  farms: string[]; // Unique farm IDs in cart
  isEmpty: boolean;

  // Actions
  addItem: (product: Product, quantity?: number, notes?: string) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  updateNotes: (cartItemId: string, notes: string) => void;
  clearCart: () => void;
  clearFarmItems: (farmId: string) => void;

  // Cart visibility
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;

  // Utility actions
  getItemByProductId: (productId: string) => CartItem | undefined;
  getItemsByFarm: (farmId: string) => CartItem[];
  canAddItem: (
    product: Product,
    quantity: number
  ) => { canAdd: boolean; reason?: string };

  // Persistence
  hydrate: () => void;
  clearStorage: () => void;
};
