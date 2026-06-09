import { ForbiddenException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { Review } from './schemas/review.schema';
import { Order } from '../orders/schemas/order.schema';
import { Product } from '../products/schemas/product.schema';
import { UsersService } from '../users/users.service';

const mockReviewModel = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
  deleteOne: jest.fn(),
  findById: jest.fn(),
};

const mockOrderModel = { findOne: jest.fn() };
const mockProductModel = { updateOne: jest.fn() };
const mockUsersService = { findById: jest.fn() };

describe('ReviewsService', () => {
  let service: ReviewsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: getModelToken(Review.name), useValue: mockReviewModel },
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
        { provide: getModelToken(Product.name), useValue: mockProductModel },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();
    service = module.get(ReviewsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw ForbiddenException when no delivered order found', async () => {
      mockUsersService.findById.mockResolvedValue({ firstName: 'A', lastName: 'B' });
      mockOrderModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      await expect(
        service.create('uid1', { productId: 'pid1', orderId: 'oid1', rating: 5, comment: 'great' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('should return paginated reviews', async () => {
      mockReviewModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
          }),
        }),
      });
      mockReviewModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result).toEqual({ items: [], total: 0, page: 1, limit: 10, hasMore: false });
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException when review not found', async () => {
      mockReviewModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      await expect(service.remove('reviewid123456789012', 'uid1', false)).rejects.toThrow();
    });

    it('should throw ForbiddenException when non-owner tries to delete', async () => {
      const mockReview = {
        customerId: { toHexString: () => 'owner-id' },
        productId: { toHexString: () => 'pid1' },
      };
      mockReviewModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockReview) });
      await expect(service.remove('rid1', 'other-user-id', false)).rejects.toThrow();
    });

    it('should allow admin to delete any review', async () => {
      const mockReview = {
        customerId: { toHexString: () => 'owner-id' },
        productId: { toHexString: () => '507f1f77bcf86cd799439011' },
      };
      mockReviewModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockReview) });
      mockReviewModel.deleteOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });
      mockReviewModel.aggregate.mockResolvedValue([{ avg: 4.5, count: 2 }]);
      mockProductModel.updateOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });
      await expect(service.remove('rid1', 'admin-id', true)).resolves.toBeUndefined();
    });
  });

  describe('findMine', () => {
    it('should return only reviews for the given customerId', async () => {
      mockReviewModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
          }),
        }),
      });
      mockReviewModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });
      const result = await service.findMine('507f1f77bcf86cd799439011', { page: 1, limit: 10 });
      expect(result).toHaveProperty('items');
      expect(mockReviewModel.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: expect.anything() }),
      );
    });
  });
});
