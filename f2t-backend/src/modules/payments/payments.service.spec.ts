import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';

import { PaymentsService } from './payments.service';
import { OrdersService } from '../orders/orders.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FarmsService } from '../farms/farms.service';

// ── Stripe SDK mock ───────────────────────────────────────────────────────────
const mockSessionsCreate = jest.fn();
const mockConstructEvent = jest.fn();

jest.mock('stripe', () =>
  jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: mockSessionsCreate } },
    webhooks: { constructEvent: mockConstructEvent },
  })),
);

// ── Helpers ───────────────────────────────────────────────────────────────────

const CONSUMER_ID = new Types.ObjectId().toHexString();
const ORDER_ID = new Types.ObjectId().toHexString();
const FARM_ID = new Types.ObjectId().toHexString();

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: ORDER_ID,
    customerId: new Types.ObjectId(CONSUMER_ID),
    farmId: new Types.ObjectId(FARM_ID),
    paymentStatus: 'pending',
    paymentMethod: 'stripe',
    deliveryFee: 20000,
    total: 120000,
    items: [{ productName: 'Cà chua', quantity: 2, pricePerUnit: 50000, unit: 'kg' }],
    ...overrides,
  };
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('PaymentsService', () => {
  let service: PaymentsService;
  let ordersService: jest.Mocked<Pick<OrdersService, 'findById' | 'saveStripeSession' | 'updatePaymentStatus'>>;
  let notificationsService: jest.Mocked<Pick<NotificationsService, 'createAndPush'>>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: OrdersService,
          useValue: {
            findById: jest.fn(),
            saveStripeSession: jest.fn().mockResolvedValue(undefined),
            updatePaymentStatus: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            createAndPush: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: FarmsService,
          useValue: {
            findOne: jest.fn().mockResolvedValue({ ownerId: new Types.ObjectId() }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const cfg: Record<string, string> = {
                STRIPE_SECRET_KEY: 'sk_test_mock',
                STRIPE_WEBHOOK_SECRET: 'whsec_mock',
                STRIPE_CURRENCY: 'vnd',
              };
              return cfg[key] ?? '';
            }),
          },
        },
      ],
    }).compile();

    service = module.get(PaymentsService);
    ordersService = module.get(OrdersService);
    notificationsService = module.get(NotificationsService);
  });

  // ── createCheckoutSession ─────────────────────────────────────────────────

  describe('createCheckoutSession', () => {
    it('should return sessionId and url for a valid pending stripe order', async () => {
      (ordersService.findById as jest.Mock).mockResolvedValue(makeOrder());
      mockSessionsCreate.mockResolvedValue({
        id: 'cs_test_abc',
        url: 'https://checkout.stripe.com/pay/cs_test_abc',
      });

      const result = await service.createCheckoutSession(ORDER_ID, CONSUMER_ID);

      expect(result).toEqual({
        sessionId: 'cs_test_abc',
        url: 'https://checkout.stripe.com/pay/cs_test_abc',
      });
      expect(ordersService.saveStripeSession).toHaveBeenCalledWith(ORDER_ID, 'cs_test_abc');
    });

    it('should throw ForbiddenException when order belongs to a different user', async () => {
      (ordersService.findById as jest.Mock).mockResolvedValue(makeOrder());
      const otherUser = new Types.ObjectId().toHexString();

      await expect(service.createCheckoutSession(ORDER_ID, otherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when order is already paid', async () => {
      (ordersService.findById as jest.Mock).mockResolvedValue(
        makeOrder({ paymentStatus: 'paid' }),
      );

      await expect(service.createCheckoutSession(ORDER_ID, CONSUMER_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when order uses cash payment', async () => {
      (ordersService.findById as jest.Mock).mockResolvedValue(
        makeOrder({ paymentMethod: 'cash' }),
      );

      await expect(service.createCheckoutSession(ORDER_ID, CONSUMER_ID)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── handleWebhook ─────────────────────────────────────────────────────────

  describe('handleWebhook', () => {
    const rawBody = Buffer.from('{"type":"test"}');
    const signature = 't=1,v1=mock';

    it('should update order to paid on checkout.session.completed', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            payment_status: 'paid',
            payment_intent: 'pi_mock_123',
            metadata: { orderId: ORDER_ID },
          },
        },
      });
      (ordersService.findById as jest.Mock).mockResolvedValue(makeOrder());

      await service.handleWebhook(rawBody, signature);

      expect(ordersService.updatePaymentStatus).toHaveBeenCalledWith(
        ORDER_ID,
        'paid',
        expect.objectContaining({ stripePaymentIntentId: 'pi_mock_123' }),
      );
      expect(notificationsService.createAndPush).toHaveBeenCalled();
    });

    it('should update order to failed on checkout.session.expired', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'checkout.session.expired',
        data: { object: { metadata: { orderId: ORDER_ID } } },
      });

      await service.handleWebhook(rawBody, signature);

      expect(ordersService.updatePaymentStatus).toHaveBeenCalledWith(ORDER_ID, 'failed');
    });

    it('should throw BadRequestException when Stripe signature is invalid', async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error('No signatures found matching the expected signature for payload');
      });

      await expect(service.handleWebhook(rawBody, 'bad-sig')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
