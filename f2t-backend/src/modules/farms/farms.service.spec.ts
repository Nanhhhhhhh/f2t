import { Test, TestingModule } from '@nestjs/testing';
import { FarmsService } from './farms.service';
import { getModelToken } from '@nestjs/mongoose';
import { Farm } from './schemas/farm.schema';
import { Order } from '../orders/schemas/order.schema';
import { Product } from '../products/schemas/product.schema';

describe('FarmsService', () => {
  let service: FarmsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FarmsService,
        {
          provide: getModelToken(Farm.name),
          useValue: {
            find: jest.fn(),
            findById: jest.fn(),
            findOne: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            findByIdAndDelete: jest.fn(),
            countDocuments: jest.fn(),
            aggregate: jest.fn(),
            exec: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getModelToken(Order.name),
          useValue: {
            countDocuments: jest.fn(),
            aggregate: jest.fn(),
          },
        },
        {
          provide: getModelToken(Product.name),
          useValue: {
            countDocuments: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FarmsService>(FarmsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should include id in geo-search results', async () => {
      const mockFarms = [
        { _id: '507f1f77bcf86cd799439011', name: 'Farm 1' },
        { _id: '507f1f77bcf86cd799439012', name: 'Farm 2' },
      ];

      const mockAggregateResult = [
        {
          metadata: [{ total: 2 }],
          data: mockFarms.map((f) => ({ ...f, id: f._id })),
        },
      ];

      const farmModel = (service as any).farmModel;
      farmModel.aggregate.mockResolvedValue(mockAggregateResult);

      const result = await service.findAll({
        latitude: 10.8231,
        longitude: 106.6297,
        radius: 10,
      });

      expect(farmModel.aggregate).toHaveBeenCalled();
      expect(result.items[0]).toHaveProperty('id');
      expect(result.items[0].id).toBe('507f1f77bcf86cd799439011');
      expect(result.total).toBe(2);
    });
  });
});
