import type { ApiResponse, Farm, Order, Product, User } from '@/types';
import type { Post } from '@/api/posts/types';

export type AdminUsersQuery = {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isBanned?: boolean;
};

export type AdminFarmsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  verificationStatus?: string;
};

export type AdminOrdersQuery = {
  page?: number;
  limit?: number;
  status?: string;
  paymentStatus?: string;
};

export type AdminPostsQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

export type AdminProductsQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

export type AdminAnalytics = {
  totalUsers: number;
  totalFarms: number;
  totalOrders: number;
  totalRevenue: number;
  ordersByStatus: Record<string, number>;
  farmsByVerification: Record<string, number>;
  newUsersThisMonth: number;
  newOrdersThisMonth: number;
};

export type BanUserRequest = {
  isBanned: boolean;
};

export type ChangeRoleRequest = {
  role: 'consumer' | 'farm' | 'admin';
};

export type VerifyFarmRequest = {
  verificationStatus: 'verified' | 'rejected' | 'pending';
  reason?: string;
};

// Responses
export type AdminAnalyticsResponse = ApiResponse<AdminAnalytics>;

export type PaginatedResponse<T> = ApiResponse<{
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}>;

export type AdminUsersResponse = PaginatedResponse<User>;
export type AdminFarmsResponse = PaginatedResponse<Farm>;
export type AdminOrdersResponse = PaginatedResponse<Order>;
export type AdminPostsResponse = PaginatedResponse<Post>;
export type AdminProductsResponse = PaginatedResponse<Product>;
