export type Review = {
  _id: string;
  productId: string;
  orderId: string;
  customerId: string;
  customerName: string;
  customerAvatarUrl?: string;
  rating: number;
  comment: string;
  photos: string[];
  createdAt: string;
  updatedAt: string;
};

export type ReviewsPage = {
  items: Review[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

export type CreateReviewRequest = {
  productId: string;
  orderId: string;
  rating: number; // 1-5
  comment: string; // max 500 chars
  photos?: string[]; // max 3 URLs
};

export type GetReviewsQuery = {
  productId?: string;
  page?: number;
  limit?: number;
};
