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
import { DynamicPricingService } from '../dynamic-pricing/dynamic-pricing.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let module: TestingModule;
  let orderModel: any;
  let farmsService: FarmsService;
  let notificationsService: NotificationsService;
  let productsService: ProductsService;
  let dynamicPricingService: DynamicPricingService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getModelToken(Order.name),
          // Constructor-style mock so `new this.orderModel(doc)` works in create().
          // Captures the constructed payload and resolves it from save().
          useValue: Object.assign(
            function (this: any, doc: any) {
              Object.assign(this, doc);
              if (!this._id) this._id = new Types.ObjectId();
              this.save = jest.fn().mockResolvedValue(this);
            },
            {
              find: jest.fn(),
              findById: jest.fn(),
              findByIdAndUpdate: jest.fn(),
              countDocuments: jest.fn(),
              exec: jest.fn(),
            },
          ),
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
        {
          provide: DynamicPricingService,
          useValue: {
            getAcceptedOverridesForProducts: jest
              .fn()
              .mockResolvedValue(new Map()),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderModel = module.get(getModelToken(Order.name));
    farmsService = module.get<FarmsService>(FarmsService);
    notificationsService =
      module.get<NotificationsService>(NotificationsService);
    productsService = module.get<ProductsService>(ProductsService);
    dynamicPricingService = module.get<DynamicPricingService>(
      DynamicPricingService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create - AI pricing', () => {
    const buildScenario = (overridesMap: Map<string, any>) => {
      const productId = new Types.ObjectId();
      const farmObjId = new Types.ObjectId();
      const farmId = farmObjId.toHexString();

      jest.spyOn(productsService, 'findOne').mockResolvedValue({
        _id: productId,
        name: 'Tomato',
        images: ['img.jpg'],
        unit: 'kg',
        pricePerUnit: 100,
        availableQuantity: 10,
        farmId: farmObjId,
      } as any);
      jest.spyOn(productsService, 'updateStock').mockResolvedValue({} as any);
      jest.spyOn(farmsService, 'findOne').mockResolvedValue({
        _id: farmObjId,
        name: 'Green Farm',
        ownerId: new Types.ObjectId(),
      } as any);
      jest
        .spyOn(dynamicPricingService, 'getAcceptedOverridesForProducts')
        .mockResolvedValue(overridesMap);
      jest.spyOn(notificationsService, 'createAndPush').mockResolvedValue(
        {} as any,
      );

      const dto: any = {
        farmId,
        items: [{ productId: productId.toHexString(), quantity: 2 }],
        paymentMethod: 'cash',
        deliveryMethod: 'pickup',
        shippingAddress: { addressLine1: '1 Road' },
      };
      return { productId, farmId, dto };
    };

    it('snapshots the accepted AI override price (targetPrice) instead of base price', async () => {
      const { productId, dto } = buildScenario(new Map());
      const map = new Map<string, any>([
        [
          productId.toHexString(),
          { targetPrice: 70, deltaPct: -30, freshnessScore: 0.9 },
        ],
      ]);
      jest
        .spyOn(dynamicPricingService, 'getAcceptedOverridesForProducts')
        .mockResolvedValue(map);

      const order: any = await service.create(new Types.ObjectId().toHexString(), dto);

      expect(order.items[0].pricePerUnit).toBe(70);
      expect(order.items[0].totalPrice).toBe(140);
      expect(order.subtotal).toBe(140);
    });

    it('falls back to base price when no accepted override exists', async () => {
      const { dto } = buildScenario(new Map());

      const order: any = await service.create(new Types.ObjectId().toHexString(), dto);

      expect(order.items[0].pricePerUnit).toBe(100);
      expect(order.items[0].totalPrice).toBe(200);
    });
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
