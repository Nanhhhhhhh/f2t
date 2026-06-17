import { MMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Product } from '@/types';

import { getEffectiveUnitPrice } from './utils';

// MMKV storage instance for cart persistence
const storage = new MMKV();

// Storage key for cart data
const CART_STORAGE_KEY = 'cart-storage';

// Storage version for data migration
const CART_STORAGE_VERSION = 1;

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

// Cart state interface
interface CartState {
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
}

// Helper functions
const calculateTotalPrice = (items: CartItem[]): number => {
  return items.reduce((total, item) => {
    return total + getEffectiveUnitPrice(item.product) * item.quantity;
  }, 0);
};

const calculateTotalItems = (items: CartItem[]): number => {
  return items.reduce((total, item) => total + item.quantity, 0);
};

const getUniqueFarms = (items: CartItem[]): string[] => {
  return Array.from(new Set(items.map((item) => item.farmId)));
};

const generateCartItemId = (): string => {
  return `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Data migration utilities
const migrateCartData = (data: unknown): Partial<CartState> => {
  if (!data || typeof data !== 'object') {
    return { items: [], lastUpdated: null };
  }

  const typedData = data as {
    state?: { lastUpdated?: string };
    version?: number;
  };

  // Handle old format without lastUpdated
  if (typedData.state && !typedData.state.lastUpdated) {
    typedData.state.lastUpdated = new Date().toISOString();
  }

  // Handle old format without version
  if (!typedData.version) {
    typedData.version = CART_STORAGE_VERSION;
  }

  return typedData as unknown as Partial<CartState>;
};

// Error handling for storage operations
const safeStorageOperation = <T,>(operation: () => T, fallback: T): T => {
  try {
    return operation();
  } catch (error) {
    return fallback;
  }
};

// Helper function to update computed values
const updateComputedValues = (state: CartState) => {
  const totalItems = calculateTotalItems(state.items);
  const totalPrice = calculateTotalPrice(state.items);
  const farms = getUniqueFarms(state.items);
  const isEmpty = state.items.length === 0;

  return {
    totalItems,
    totalPrice,
    farms,
    isEmpty,
  };
};

// Cart store
export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      // Initial state
      items: [],
      isOpen: false,
      lastUpdated: null,

      // Computed values (calculated on each access)
      totalItems: 0,
      totalPrice: 0,
      farms: [],
      isEmpty: true,

      // Add item to cart
      addItem: (product: Product, quantity = 1, notes?: string) => {
        const state = get();
        const { canAdd, reason } = state.canAddItem(product, quantity);

        if (!canAdd) {
          throw new Error(reason || 'Cannot add item to cart');
        }

        // Check if product already exists in cart
        const existingItem = state.getItemByProductId(product.id);

        if (existingItem) {
          // Update existing item quantity
          const newQuantity = existingItem.quantity + quantity;
          const updatedItems = state.items.map((item) =>
            item.id === existingItem.id
              ? { ...item, quantity: newQuantity }
              : item
          );

          set((state) => ({
            items: updatedItems,
            lastUpdated: new Date().toISOString(),
            ...updateComputedValues({ ...state, items: updatedItems }),
          }));
        } else {
          // Add new item
          const newItem: CartItem = {
            id: generateCartItemId(),
            productId: product.id,
            product,
            quantity,
            farmId: product.farmId,
            addedAt: new Date().toISOString(),
            notes,
          };

          const updatedItems = [...state.items, newItem];

          set((state) => ({
            items: updatedItems,
            lastUpdated: new Date().toISOString(),
            ...updateComputedValues({ ...state, items: updatedItems }),
          }));
        }
      },

      // Remove item from cart
      removeItem: (cartItemId: string) => {
        set((state) => {
          const updatedItems = state.items.filter(
            (item) => item.id !== cartItemId
          );
          return {
            items: updatedItems,
            lastUpdated: new Date().toISOString(),
            ...updateComputedValues({ ...state, items: updatedItems }),
          };
        });
      },

      // Update item quantity
      updateQuantity: (cartItemId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(cartItemId);
          return;
        }

        set((state) => {
          const updatedItems = state.items.map((item) =>
            item.id === cartItemId ? { ...item, quantity } : item
          );
          return {
            items: updatedItems,
            lastUpdated: new Date().toISOString(),
            ...updateComputedValues({ ...state, items: updatedItems }),
          };
        });
      },

      // Update item notes
      updateNotes: (cartItemId: string, notes: string) => {
        set((state) => {
          const updatedItems = state.items.map((item) =>
            item.id === cartItemId ? { ...item, notes } : item
          );
          return {
            items: updatedItems,
            lastUpdated: new Date().toISOString(),
            ...updateComputedValues({ ...state, items: updatedItems }),
          };
        });
      },

      // Clear entire cart
      clearCart: () => {
        set((state) => {
          const updatedItems: CartItem[] = [];
          return {
            items: updatedItems,
            lastUpdated: new Date().toISOString(),
            ...updateComputedValues({ ...state, items: updatedItems }),
          };
        });
      },

      // Clear items from specific farm
      clearFarmItems: (farmId: string) => {
        set((state) => {
          const updatedItems = state.items.filter(
            (item) => item.farmId !== farmId
          );
          return {
            items: updatedItems,
            lastUpdated: new Date().toISOString(),
            ...updateComputedValues({ ...state, items: updatedItems }),
          };
        });
      },

      // Cart visibility controls
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      // Get item by product ID
      getItemByProductId: (productId: string) => {
        return get().items.find((item) => item.productId === productId);
      },

      // Get items by farm
      getItemsByFarm: (farmId: string) => {
        return get().items.filter((item) => item.farmId === farmId);
      },

      // Check if item can be added
      canAddItem: (product: Product, quantity: number) => {
        const state = get();

        // Check if product is purchasable. 'available' và 'seasonal' đều mua được
        // (seasonal chỉ là nhãn mùa vụ); chỉ chặn 'sold_out' / 'unavailable'.
        if (!['available', 'seasonal'].includes(product.status)) {
          return { canAdd: false, reason: 'Product is not available' };
        }

        // Giỏ hàng CHO PHÉP nhiều farm. Việc bắt buộc 1 farm/đơn được kiểm tra ở
        // bước thanh toán (chọn sản phẩm cùng farm), không chặn khi thêm vào giỏ.

        // Check stock availability
        if (product.availableQuantity < quantity) {
          return {
            canAdd: false,
            reason: `Only ${product.availableQuantity} ${product.unit}s available`,
          };
        }

        // Check minimum order quantity
        if (quantity < product.minimumOrder) {
          return {
            canAdd: false,
            reason: `Minimum order quantity is ${product.minimumOrder} ${product.unit}s`,
          };
        }

        // Check if adding this quantity would exceed stock
        const existingItem = state.getItemByProductId(product.id);
        if (existingItem) {
          const newTotalQuantity = existingItem.quantity + quantity;
          if (newTotalQuantity > product.availableQuantity) {
            return {
              canAdd: false,
              reason: `Cannot add ${quantity} more. Only ${product.availableQuantity - existingItem.quantity} ${product.unit}s available`,
            };
          }
        }

        return { canAdd: true };
      },

      // Hydrate from storage
      hydrate: () => {
        try {
          const stored = storage.getString('cart-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            const items = parsed.state?.items || [];
            set((state) => ({
              items,
              lastUpdated: parsed.state?.lastUpdated || null,
              ...updateComputedValues({ ...state, items }),
            }));
          }
        } catch (error) {}
      },

      // Clear storage
      clearStorage: () => {
        safeStorageOperation(() => {
          storage.delete(CART_STORAGE_KEY);
        }, undefined);
        get().clearCart();
      },
    }),
    {
      name: CART_STORAGE_KEY,
      version: CART_STORAGE_VERSION,
      storage: createJSONStorage(() => ({
        getItem: (name: string) => {
          return safeStorageOperation(() => {
            const value = storage.getString(name);
            if (!value) return null;

            try {
              const data = JSON.parse(value);
              return JSON.stringify(migrateCartData(data));
            } catch (error) {
              return null;
            }
          }, null);
        },
        setItem: (name: string, value: string) => {
          safeStorageOperation(() => {
            storage.set(name, value);
          }, undefined);
        },
        removeItem: (name: string) => {
          safeStorageOperation(() => {
            storage.delete(name);
          }, undefined);
        },
      })),
      // Only persist items and lastUpdated, not UI state
      partialize: (state) => ({
        items: state.items,
        lastUpdated: state.lastUpdated,
      }),
      // Migration function for data format changes
      migrate: (persistedState: unknown, version: number) => {
        if (version === 0) {
          // Handle migration from version 0 to 1
          return migrateCartData(persistedState);
        }
        return persistedState;
      },
    }
  )
);

// Helper hooks for common cart operations
export const useCartItems = () => useCart((state) => state.items);
export const useCartTotal = () => useCart((state) => state.totalPrice);
export const useCartItemCount = () => useCart((state) => state.totalItems);
export const useCartIsEmpty = () => useCart((state) => state.isEmpty);
export const useCartFarms = () => useCart((state) => state.farms);

// Cart actions hook - stable selectors
export const useAddToCart = () => useCart((state) => state.addItem);
export const useRemoveFromCart = () => useCart((state) => state.removeItem);
export const useUpdateCartQuantity = () =>
  useCart((state) => state.updateQuantity);
export const useUpdateCartNotes = () => useCart((state) => state.updateNotes);
export const useClearCart = () => useCart((state) => state.clearCart);
export const useClearFarmItems = () => useCart((state) => state.clearFarmItems);
export const useGetItemByProductId = () =>
  useCart((state) => state.getItemByProductId);
export const useGetItemsByFarm = () => useCart((state) => state.getItemsByFarm);
export const useCanAddItem = () => useCart((state) => state.canAddItem);

// Cart actions hook - all actions
export const useCartActions = () => ({
  addItem: useCart.getState().addItem,
  removeItem: useCart.getState().removeItem,
  updateQuantity: useCart.getState().updateQuantity,
  updateNotes: useCart.getState().updateNotes,
  clearCart: useCart.getState().clearCart,
  clearFarmItems: useCart.getState().clearFarmItems,
  getItemByProductId: useCart.getState().getItemByProductId,
  getItemsByFarm: useCart.getState().getItemsByFarm,
  canAddItem: useCart.getState().canAddItem,
});

// Cart visibility hooks
export const useCartIsOpen = () => useCart((state) => state.isOpen);
export const useOpenCart = () => useCart((state) => state.openCart);
export const useCloseCart = () => useCart((state) => state.closeCart);
export const useToggleCart = () => useCart((state) => state.toggleCart);

// Cart visibility hook - all actions
export const useCartVisibility = () => ({
  isOpen: useCart.getState().isOpen,
  openCart: useCart.getState().openCart,
  closeCart: useCart.getState().closeCart,
  toggleCart: useCart.getState().toggleCart,
});

// Storage management utilities
export const useCartLastUpdated = () => useCart((state) => state.lastUpdated);
export const useClearCartStorage = () => useCart((state) => state.clearStorage);
export const useHydrateCart = () => useCart((state) => state.hydrate);

export const useCartStorage = () => ({
  lastUpdated: useCart.getState().lastUpdated,
  clearStorage: useCart.getState().clearStorage,
  hydrate: useCart.getState().hydrate,
});

// Storage statistics and debugging utilities
export const getCartStorageInfo = (): {
  hasCartData: boolean;
  storageKeys: string[];
  cartDataSize: number;
  lastModified: string | null;
} => {
  return safeStorageOperation(
    () => {
      const keys = storage.getAllKeys();
      const cartData = storage.getString(CART_STORAGE_KEY);

      return {
        hasCartData: !!cartData,
        storageKeys: keys,
        cartDataSize: cartData ? cartData.length : 0,
        lastModified: cartData ? new Date().toISOString() : null,
      };
    },
    {
      hasCartData: false,
      storageKeys: [],
      cartDataSize: 0,
      lastModified: null,
    }
  );
};

// Clean up old cart data (useful for maintenance)
export const cleanupCartStorage = (): {
  cleanedKeys: string[];
  remainingKeys: string[];
} => {
  return safeStorageOperation(
    () => {
      const keys = storage.getAllKeys();
      const cartKeys = keys.filter(
        (key) => key.startsWith('cart-') && key !== CART_STORAGE_KEY
      );

      cartKeys.forEach((key) => {
        storage.delete(key);
      });

      return {
        cleanedKeys: cartKeys,
        remainingKeys: keys.filter((key) => !cartKeys.includes(key)),
      };
    },
    {
      cleanedKeys: [],
      remainingKeys: [],
    }
  );
};

// Cart persistence hook
export const useCartPersistence = () =>
  useCart((state) => ({
    hydrate: state.hydrate,
    clearStorage: state.clearStorage,
  }));
