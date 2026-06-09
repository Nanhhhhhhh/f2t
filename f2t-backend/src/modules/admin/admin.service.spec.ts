import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AdminService } from './admin.service';
import { User } from '../users/schemas/user.schema';
import { Farm } from '../farms/schemas/farm.schema';
import { Order } from '../orders/schemas/order.schema';
import { Product } from '../products/schemas/product.schema';
import { Post } from '../posts/schemas/post.schema';

describe('AdminService', () => {
  let service: AdminService;

  const mockUserModel = {
    find: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn(),
    countDocuments: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  const mockFarmModel = {
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  const mockOrderModel = {
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  };

  const mockProductModel = {};

  const mockPostModel = {
    find: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn(),
    countDocuments: jest.fn(),
    findByIdAndDelete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(Farm.name), useValue: mockFarmModel },
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
        { provide: getModelToken(Product.name), useValue: mockProductModel },
        { provide: getModelToken(Post.name), useValue: mockPostModel },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    jest.clearAllMocks();
  });

  describe('findAllUsers', () => {
    it('returns paginated list with items array and total', async () => {
      mockUserModel.countDocuments.mockResolvedValue(0);
      mockUserModel.exec.mockResolvedValue([]);

      const result = await service.findAllUsers({ page: 1, limit: 10 });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(mockUserModel.find).toHaveBeenCalled();
    });
  });

  describe('banUser', () => {
    it('throws NotFoundException when user not found', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const validId = new Types.ObjectId().toHexString();
      await expect(service.banUser(validId, true)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAnalytics', () => {
    it('returns object with required keys', async () => {
      mockUserModel.countDocuments.mockResolvedValue(10);
      mockFarmModel.countDocuments.mockResolvedValue(5);
      mockOrderModel.countDocuments.mockResolvedValue(20);
      
      mockOrderModel.aggregate.mockImplementation((pipeline: any[]) => {
        if (pipeline[0].$match) {
          return Promise.resolve([{ total: 1000 }]);
        }
        return Promise.resolve([{ _id: 'pending', count: 2 }]);
      });
      
      mockFarmModel.aggregate.mockResolvedValue([{ _id: 'verified', count: 5 }]);

      const result = await service.getAnalytics();

      expect(result).toHaveProperty('totalUsers', 10);
      expect(result).toHaveProperty('totalFarms', 5);
      expect(result).toHaveProperty('totalOrders', 20);
      expect(result).toHaveProperty('totalRevenue', 1000);
      expect(result).toHaveProperty('ordersByStatus');
      expect(result.ordersByStatus).toHaveProperty('pending', 2);
      expect(result).toHaveProperty('farmsByVerification');
      expect(result.farmsByVerification).toHaveProperty('verified', 5);
      expect(result).toHaveProperty('newUsersThisMonth', 10);
      expect(result).toHaveProperty('newOrdersThisMonth', 20);
    });
  });

  describe('verifyFarm', () => {
    it('throws NotFoundException when farm not found', async () => {
      mockFarmModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const validId = new Types.ObjectId().toHexString();
      await expect(service.verifyFarm(validId, 'verified')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPosts', () => {
    it('returns paginated post list', async () => {
      mockPostModel.exec.mockResolvedValue([]);
      mockPostModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });

      const result = await service.getPosts(1, 10);

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('deletePost', () => {
    it('throws NotFoundException when post not found', async () => {
      mockPostModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const validId = new Types.ObjectId().toHexString();
      await expect(service.deletePost(validId)).rejects.toThrow(NotFoundException);
    });
  });
});
