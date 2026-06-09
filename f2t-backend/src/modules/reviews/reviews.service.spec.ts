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
});
