import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { OrdersService } from '../orders/orders.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

interface StripeLineItem {
  price_data: {
    currency: string;
    product_data: { name: string; description?: string };
    unit_amount: number;
  };
  quantity: number;
}

interface StripeSessionData {
  metadata: Record<string, string> | null;
  payment_status: string;
  payment_intent: string | null;
}

const extractId = (
  val: Types.ObjectId | { _id: Types.ObjectId } | { id: string },
): string => {
  if (val instanceof Types.ObjectId) return val.toHexString();
  if ('id' in val && typeof (val as { id: string }).id === 'string') {
    return (val as { id: string }).id;
  }
  return (val as { _id: Types.ObjectId })._id.toHexString();
};

@Injectable()
export class PaymentsService {
  private stripe: InstanceType<typeof Stripe>;

  constructor(
    private readonly ordersService: OrdersService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY') ?? '',
      { apiVersion: '2026-04-22.dahlia' },
    );
  }

  async createCheckoutSession(
    orderId: string,
    userId: string,
  ): Promise<{ sessionId: string; url: string }> {
    // 1. Verify order belongs to user and is unpaid
    const order = await this.ordersService.findById(orderId);

    const orderCustomerId = extractId(order.customerId);

    if (orderCustomerId !== userId) {
      throw new ForbiddenException('Not your order');
    }
    if (order.paymentStatus === 'paid') {
      throw new BadRequestException('Order is already paid');
    }
    if (order.paymentMethod === 'cash') {
      throw new BadRequestException('This order uses cash payment');
    }

    // 2. Build line items from order items
    const lineItems: StripeLineItem[] =
      order.items.map((item: { productName: string; quantity: number; unit: string; pricePerUnit: number }) => ({
        price_data: {
          currency: this.configService.get<string>('STRIPE_CURRENCY') ?? 'vnd',
          product_data: {
            name: item.productName,
            description: `${item.quantity} × ${item.unit}`,
          },
          unit_amount: this.toStripeAmount(item.pricePerUnit),
        },
        quantity: item.quantity,
      }));

    // Add delivery fee as a line item if > 0
    if (order.deliveryFee > 0) {
      lineItems.push({
        price_data: {
          currency: this.configService.get<string>('STRIPE_CURRENCY') ?? 'vnd',
          product_data: {
            name: 'Phí vận chuyển',
          },
          unit_amount: this.toStripeAmount(order.deliveryFee),
        },
        quantity: 1,
      });
    }

    // 3. Create Checkout session
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      metadata: { orderId },
      success_url: `f2t://payment/result?status=success&orderId=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `f2t://payment/result?status=cancelled&orderId=${orderId}`,
    });

    if (!session.url) {
      throw new InternalServerErrorException('Failed to create Stripe session');
    }

    // 4. Save session ID on order
    await this.ordersService.saveStripeSession(orderId, session.id);

    return { sessionId: session.id, url: session.url };
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret =
      this.configService.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';

    let event: ReturnType<InstanceType<typeof Stripe>['webhooks']['constructEvent']>;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err: unknown) {
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as StripeSessionData;
        const orderId = session.metadata?.orderId;

        if (!orderId) {
          return;
        }

        if (session.payment_status === 'paid') {
          await this.ordersService.updatePaymentStatus(orderId, 'paid', {
            stripePaymentIntentId: session.payment_intent as string,
            paidAt: new Date(),
          });

          // Notify consumer
          const order = await this.ordersService.findById(orderId);
          const consumerId = extractId(order.customerId);

          void this.notificationsService.createAndPush({
            userId: consumerId,
            type: NotificationType.System,
            title: 'Thanh toán thành công',
            message: `Đơn hàng #${orderId.slice(-8)} đã được thanh toán thành công.`,
            referenceId: orderId,
            referenceType: 'order',
          });
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as StripeSessionData;
        const orderId = session.metadata?.orderId;
        if (orderId) {
          await this.ordersService.updatePaymentStatus(orderId, 'failed');
        }
        break;
      }

      default:
        break;
    }
  }

  private toStripeAmount(amount: number): number {
    const currency = this.configService.get<string>('STRIPE_CURRENCY') ?? 'vnd';
    const zeroDecimalCurrencies = ['vnd', 'jpy', 'krw'];
    return zeroDecimalCurrencies.includes(currency.toLowerCase())
      ? Math.round(amount)
      : Math.round(amount * 100);
  }
}
