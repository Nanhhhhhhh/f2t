import type { Product } from '@/types';

export type CrossSellVariables = { productIds: string[]; limit?: number };

export type CrossSellResponse = {
  success: boolean;
  data: Product[];
  message?: string;
};
