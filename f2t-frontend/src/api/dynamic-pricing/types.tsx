import type { ApiResponse } from '@/types';

export type FreshnessTag = 'fresh' | 'aging' | 'critical';
export type SuggestionStatus = 'shadow' | 'pending_review' | 'accepted' | 'rejected' | 'expired';

export type PriceSuggestion = {
  id: string;
  productId: string;
  productName: string;
  farmId: string;
  basePrice: number;
  targetPrice: number;
  deltaPct: number;
  freshnessScore: number;
  freshnessTag: FreshnessTag;
  safetyClipped: boolean;
  mode: string;
  status: SuggestionStatus;
  computedAt: string;
  expiresAt: string;
  reviewedAt?: string;
};

export type PriceSuggestionsData = {
  items: PriceSuggestion[];
  total: number;
};

export type PriceSuggestionsResponse = ApiResponse<PriceSuggestionsData>;

export type SubmitFreshnessData = {
  medianScore: number;
  freshnessTag: FreshnessTag;
  suggestion?: PriceSuggestion | null;
};

export type SubmitFreshnessResponse = ApiResponse<SubmitFreshnessData>;

export type SubmitFreshnessVariables = {
  productId: string;
  score: number;
  category: string;
};

export type ReviewSuggestionVariables = {
  id: string;
  decision: 'accept' | 'reject';
};

export type ReviewSuggestionResponse = ApiResponse<PriceSuggestion>;

export type ScanFreshnessData = {
  score: number;
  tag: FreshnessTag;
  label: string;
  confidence: number;
  medianScore: number;
  freshnessTag: FreshnessTag;
};

export type ScanFreshnessResponse = ApiResponse<ScanFreshnessData>;

export type ScanFreshnessVariables = {
  productId: string;
  image_b64: string;
  category: string;
};
