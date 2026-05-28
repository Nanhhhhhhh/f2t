import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';

import { DeliveryService } from './delivery.service';
import { OrdersService } from '../orders/orders.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

const ORDER_ID = new Types.ObjectId().toHexString();
const USER_ID = new Types.ObjectId().toHexString();

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: ORDER_ID,
    status: 'shipped',
    ghnOrderCode: null,
    shippingAddress: {
      recipientName: 'Nguyen Van A',
      phone: '0901234567',
      streetAddress: '123 Nguyễn Trãi',
      ward: 'Phường 2',
      district: 'Quận 5',
      province: 'TP. Hồ Chí Minh',
    },
    items: [{ productName: 'Rau muống', quantity: 1 }],
    total: 50000,
    paymentStatus: 'paid',
    trackingSteps: [],
    estimatedDeliveryDate: null,
    driverLocation: null,
    ...overrides,
  };
}

// Config that leaves GHN unconfigured (empty strings → isConfigured() = false)
const unconfiguredGHN = {
  provide: ConfigService,
  useValue: {
    get: jest.fn((key: string) => {
      const cfg: Record<string, string | number> = {
        GHN_API_URL: '',
        GHN_TOKEN: '',
        GHN_SHOP_ID: '',
        GHN_SERVICE_ID: 53321,
      };
      return cfg[key] ?? '';
    }),
  },
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('DeliveryService', () => {
  let service: DeliveryService;
  let ordersService: jest.Mocked<Pick<OrdersService, 'findById' | 'findOneForUser' | 'saveShipmentInfo' | 'updateTrackingSteps' | 'findByGhnOrderCode' | 'appendTrackingStep' | 'updateOrderStatus'>>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryService,
        {
          provide: OrdersService,
          useValue: {
            findById: jest.fn(),
            findOneForUser: jest.fn(),
            saveShipmentInfo: jest.fn().mockResolvedValue(undefined),
            updateTrackingSteps: jest.fn().mockResolvedValue(undefined),
            findByGhnOrderCode: jest.fn(),
            appendTrackingStep: jest.fn().mockResolvedValue(undefined),
            updateOrderStatus: jest.fn().mockResolvedValue(undefined),
          },
        },
        unconfiguredGHN,
      ],
    }).compile();

    service = module.get(DeliveryService);
    ordersService = module.get(OrdersService);
  });

  // ── createShipment ────────────────────────────────────────────────────────

  describe('createShipment', () => {
    it('should skip gracefully and not throw when GHN is not configured', async () => {
      await expect(service.createShipment(ORDER_ID)).resolves.toBeUndefined();
      // findById should never be called if GHN is unconfigured
      expect(ordersService.findById).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when the order has no shipping address', async () => {
      // Force GHN to appear configured so the service reaches the address check
      jest.spyOn(service['ghnProvider'], 'isConfigured').mockReturnValue(true);
      (ordersService.findById as jest.Mock).mockResolvedValue(
        makeOrder({ shippingAddress: null }),
      );

      await expect(service.createShipment(ORDER_ID)).rejects.toThrow(BadRequestException);
    });
  });

  // ── getTracking ───────────────────────────────────────────────────────────

  describe('handleGhnWebhook', () => {
    it('should append a tracking step and update order status on "delivered"', async () => {
      const order = makeOrder({ _id: new Types.ObjectId(), ghnOrderCode: 'GHN-TEST-001', status: 'shipping' });
      (ordersService.findByGhnOrderCode as jest.Mock).mockResolvedValue(order);

      await service.handleGhnWebhook({
        OrderCode: 'GHN-TEST-001',
        Status: 'delivered',
        Description: 'Giao hàng thành công',
        Time: new Date().toISOString(),
      });

      expect(ordersService.appendTrackingStep).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ status: 'delivered' }),
      );
      expect(ordersService.updateOrderStatus).toHaveBeenCalledWith(expect.any(String), 'delivered');
    });

    it('should silently ignore webhook for unknown GHN order code', async () => {
      (ordersService.findByGhnOrderCode as jest.Mock).mockResolvedValue(null);

      await expect(
        service.handleGhnWebhook({ OrderCode: 'GHN-UNKNOWN', Status: 'delivering' }),
      ).resolves.toBeUndefined();

      expect(ordersService.appendTrackingStep).not.toHaveBeenCalled();
    });
  });

  describe('getTracking', () => {
    it('should return Dijkstra mock route when order has no GHN code and status is trackable', async () => {
      (ordersService.findOneForUser as jest.Mock).mockResolvedValue(makeOrder({ status: 'shipped' }));

      const result = await service.getTracking(ORDER_ID, USER_ID, 'consumer');

      expect(result.trackingCode).toBe('GHN-ALGO-F2T-99');
      expect(Array.isArray(result.routePolyline)).toBe(true);
      expect((result.routePolyline ?? []).length).toBeGreaterThan(0);
      expect(result.driverLocation).not.toBeNull();
      expect(result.driverLocation?.latitude).toBeGreaterThan(0);
    });

    it('createShipment calculates weight dynamically from order items', async () => {
      jest.spyOn(service['ghnProvider'], 'isConfigured').mockReturnValue(true);
      const createOrderSpy = jest
        .spyOn(service['ghnProvider'], 'createOrder')
        .mockResolvedValue({ orderCode: 'GHN-DYN-001', expectedDeliveryTime: new Date().toISOString(), totalFee: 0 });
      (ordersService.findById as jest.Mock).mockResolvedValue(
        makeOrder({ items: [{ productName: 'Rau muống', quantity: 3 }, { productName: 'Cà chua', quantity: 2 }] }),
      );

      await service.createShipment(ORDER_ID);
      // 3*100 + 2*100 = 500g
      expect(createOrderSpy).toHaveBeenCalledWith(expect.objectContaining({ weight: 500 }));
    });

    it('should degrade gracefully and return DB data when GHN tracking fetch fails', async () => {
      const existingSteps = [
        { status: 'picked_up', description: 'Tài xế lấy hàng', timestamp: new Date(), location: 'Củ Chi' },
      ];
      (ordersService.findOneForUser as jest.Mock).mockResolvedValue(
        makeOrder({
          ghnOrderCode: 'GHN-REAL-123',
          status: 'shipped',
          trackingSteps: existingSteps,
        }),
      );
      // GHN provider throws (e.g. network error)
      jest.spyOn(service['ghnProvider'], 'getTracking').mockRejectedValue(
        new Error('GHN API unavailable'),
      );

      const result = await service.getTracking(ORDER_ID, USER_ID, 'consumer');

      // Must fall back to DB data — not throw
      expect(result.trackingCode).toBe('GHN-REAL-123');
      expect(result.steps).toEqual(existingSteps);
    });
  });
});
