import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { OrdersService } from './orders.service';
import { getModelToken } from '@nestjs/mongoose';
import { Order } from './schemas/order.schema';
import { ProductsService } from '../products/products.service';
import { FarmsService } from '../farms/farms.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DeliveryService } from '../delivery/delivery.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let module: TestingModule;
  let orderModel: any;
  let farmsService: FarmsService;
  let notificationsService: NotificationsService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getModelToken(Order.name),
          useValue: {
            find: jest.fn(),
            findById: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            countDocuments: jest.fn(),
            exec: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: ProductsService,
          useValue: {
            findOne: jest.fn(),
            updateStock: jest.fn(),
          },
        },
        {
          provide: FarmsService,
          useValue: {
            findOne: jest.fn(),
            findOneByOwner: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            createAndPush: jest.fn(),
          },
        },
        {
          provide: DeliveryService,
          useValue: {
            createShipment: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderModel = module.get(getModelToken(Order.name));
    farmsService = module.get<FarmsService>(FarmsService);
    notificationsService =
      module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updatePaymentStatusByFarm', () => {
    it('should throw BadRequestException for stripe orders', async () => {
      const stripeOrderId = new Types.ObjectId();
      jest.spyOn(orderModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({
          _id: stripeOrderId,
          farmId: new Types.ObjectId(),
          paymentMethod: 'stripe',
          paymentStatus: 'pending',
        }),
      });

      await expect(
        service.updatePaymentStatusByFarm(
          stripeOrderId.toHexString(),
          'userId',
          'paid',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update payment status for cash orders', async () => {
      const farmId = new Types.ObjectId();
      const cashOrderId = new Types.ObjectId();
      const mockFarm = { _id: farmId };
      const mockCashOrder = {
        _id: cashOrderId,
        farmId,
        paymentMethod: 'cash',
        paymentStatus: 'pending',
      };

      jest.spyOn(orderModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(mockCashOrder),
      });
      jest
        .spyOn(farmsService, 'findOneByOwner')
        .mockResolvedValueOnce(mockFarm as any);
      jest.spyOn(orderModel, 'findByIdAndUpdate').mockReturnValueOnce({
        exec: jest
          .fn()
          .mockResolvedValue({ ...mockCashOrder, paymentStatus: 'paid' }),
      });

      const result = await service.updatePaymentStatusByFarm(
        cashOrderId.toHexString(),
        'userId',
        'paid',
      );
      expect(result.paymentStatus).toBe('paid');
    });
  });
});
