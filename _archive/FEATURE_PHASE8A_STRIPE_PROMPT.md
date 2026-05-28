# PHASE 8A — Payments (Stripe)

## CONTEXT
Read CONTEXT.md first. That is your memory.
Phases 1–7 are complete. Orders have paymentMethod and paymentStatus fields.
We are using Stripe — not VNPay, not MoMo.

## WHY STRIPE
- Official npm SDK with full TypeScript types — no manual HMAC implementation
- Test keys available in 2 minutes — no registration paperwork
- Webhook CLI lets you test webhooks on localhost without ngrok
- Works for any currency — no country restriction

## SETUP BEFORE STARTING (developer does this — takes 5 minutes)
1. Create free account at https://dashboard.stripe.com
2. Switch to Test Mode (toggle in top left)
3. Go to Developers → API keys → copy:
   - Publishable key (`pk_test_...`)
   - Secret key (`sk_test_...`)
4. Install Stripe CLI: https://stripe.com/docs/stripe-cli
5. Run: `stripe listen --forward-to localhost:3000/api/payments/webhook`
   This gives you a webhook signing secret (`whsec_...`)

That's it. No business registration, no approval process.

---

## YOUR TASK THIS SESSION
1. Accept online payments via Stripe Checkout
2. Handle Stripe webhooks to confirm payment
3. Update order paymentStatus when payment succeeds or fails
4. Wire the frontend to open Stripe Checkout and return to the app

---

## STEP 1 — INVESTIGATE FIRST

```bash
# Current order payment fields
grep -rn "paymentStatus\|paymentMethod\|payment" \
  f2t-backend/src/modules/orders/schemas/order.schema.ts

# Frontend payment hooks
find f2t-frontend/src/api -name "*payment*" | sort
grep -rn "payment\|stripe\|checkout" \
  f2t-frontend/src/app/ --include="*.tsx" | head -20
```

---

## STEP 2 — INSTALL & CONFIGURE

```bash
cd f2t-backend
npm install stripe
```

Add to `.env.development`:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...      # from stripe listen output
STRIPE_CURRENCY=vnd                  # or usd — Stripe supports both
```

> Note: VND (Vietnamese Dong) is supported by Stripe but amounts must be
> whole numbers (no decimals). USD works too if preferred for testing.

---

## STEP 3 — ORDER SCHEMA UPDATES

Ensure these fields exist on the Order schema:

```typescript
@Prop({ enum: ['cash', 'stripe'], required: true })
paymentMethod!: string;

@Prop({ enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' })
paymentStatus!: string;

@Prop()
stripeSessionId?: string;    // Stripe Checkout session ID

@Prop()
stripePaymentIntentId?: string;

@Prop()
paidAt?: Date;
```

---

## STEP 4 — PAYMENTS MODULE

```
src/modules/payments/
  payments.module.ts
  payments.controller.ts
  payments.service.ts
  dto/
    create-checkout.dto.ts
```

### PaymentsService:

```typescript
// src/modules/payments/payments.service.ts
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY') ?? '',
    );
  }

  async createCheckoutSession(
    orderId: string,
    userId: string,
  ): Promise<{ sessionId: string; url: string }> {
    // 1. Verify order belongs to user and is unpaid
    const order = await this.ordersService.findById(orderId);

    if ((order.consumerId as Types.ObjectId).toHexString() !== userId) {
      throw new ForbiddenException('Not your order');
    }
    if (order.paymentStatus === 'paid') {
      throw new BadRequestException('Order is already paid');
    }
    if (order.paymentMethod === 'cash') {
      throw new BadRequestException('This order uses cash payment');
    }

    // 2. Build line items from order snapshot
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      order.items.map(item => ({
        price_data: {
          currency: this.configService.get<string>('STRIPE_CURRENCY') ?? 'usd',
          product_data: {
            name: item.productName,
            description: `${item.quantity} × ${item.unit}`,
          },
          // Stripe amounts are in smallest currency unit
          // VND has no subunits so multiply by 1, USD multiply by 100
          unit_amount: this.toStripeAmount(item.pricePerUnit),
        },
        quantity: item.quantity,
      }));

    // 3. Create Checkout session
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      metadata: { orderId },    // CRITICAL — used to identify order in webhook
      // success_url and cancel_url are deep links back into the app
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

    let event: Stripe.Event;
    try {
      // Stripe verifies the signature — this throws if invalid
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;

        if (!orderId) {
          console.warn('[Stripe] Webhook missing orderId in metadata');
          return;
        }

        if (session.payment_status === 'paid') {
          await this.ordersService.updatePaymentStatus(orderId, 'paid', {
            stripePaymentIntentId: session.payment_intent as string,
            paidAt: new Date(),
          });

          // Notify consumer
          const order = await this.ordersService.findById(orderId);
          void this.notificationsService.createAndPush({
            userId: (order.consumerId as Types.ObjectId).toHexString(),
            type: NotificationType.System,
            title: 'Thanh toán thành công',
            message: `Đơn hàng #${orderId.slice(-8)} đã được thanh toán.`,
            referenceId: orderId,
            referenceType: 'order',
          });
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;
        if (orderId) {
          await this.ordersService.updatePaymentStatus(orderId, 'failed');
        }
        break;
      }

      default:
        // Ignore all other events
        break;
    }
  }

  // Stripe amounts are in smallest currency unit
  private toStripeAmount(amount: number): number {
    const currency = this.configService.get<string>('STRIPE_CURRENCY') ?? 'usd';
    // VND has no subunits — use as-is
    // USD, EUR etc. — multiply by 100 (cents)
    const zeroDecimalCurrencies = ['vnd', 'jpy', 'krw'];
    return zeroDecimalCurrencies.includes(currency.toLowerCase())
      ? Math.round(amount)
      : Math.round(amount * 100);
  }
}
```

### Add to OrdersService:
```typescript
async saveStripeSession(orderId: string, sessionId: string): Promise<void> {
  await this.orderModel.findByIdAndUpdate(orderId, {
    stripeSessionId: sessionId,
  });
}

async updatePaymentStatus(
  orderId: string,
  status: 'paid' | 'failed' | 'refunded',
  extra?: {
    stripePaymentIntentId?: string;
    paidAt?: Date;
  },
): Promise<void> {
  await this.orderModel.findByIdAndUpdate(orderId, {
    paymentStatus: status,
    ...extra,
  });
}
```

---

## STEP 5 — PAYMENTS CONTROLLER

```typescript
@Controller('payments')
export class PaymentsController {

  // POST /api/payments/checkout
  // Creates a Stripe Checkout session
  // Returns: { sessionId, url } — frontend opens url in WebBrowser
  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async createCheckout(
    @Body() dto: CreateCheckoutDto,
    @CurrentUser() user: JwtUser,
  ): Promise<{ sessionId: string; url: string }> {
    return this.paymentsService.createCheckoutSession(dto.orderId, user.userId);
  }

  // POST /api/payments/webhook
  // Called by Stripe — must receive raw body (not parsed JSON)
  // IMPORTANT: this route must be EXCLUDED from the global body parser
  @Post('webhook')
  @HttpCode(200)
  async stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    if (!req.rawBody) {
      throw new BadRequestException('Missing raw body');
    }
    await this.paymentsService.handleWebhook(req.rawBody, signature);
    return { received: true };
  }
}

// CreateCheckoutDto:
export class CreateCheckoutDto {
  @IsString()
  @IsNotEmpty()
  orderId!: string;
}
```

### CRITICAL — raw body for webhook in main.ts:
```typescript
// main.ts — Stripe webhook needs raw body to verify signature
const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  rawBody: true,  // ADD THIS
});
```

---

## STEP 6 — FRONTEND WIRING

```bash
cd f2t-frontend
npx expo install expo-web-browser expo-linking
```

### Create payment hook:
```typescript
// f2t-frontend/src/api/payments/use-create-checkout.tsx
// POST /api/payments/checkout
// Body: { orderId: string }
// Returns: { sessionId: string, url: string }
```

### Open Stripe Checkout from order detail:
```typescript
import * as WebBrowser from 'expo-web-browser';

// In order detail screen, when:
// order.paymentMethod === 'stripe' && order.paymentStatus === 'pending'
// Show "Pay Now" button:

const handlePayNow = async () => {
  const { url } = await createCheckout.mutateAsync({ orderId: order.id });

  const result = await WebBrowser.openAuthSessionAsync(
    url,
    'f2t://', // deep link scheme — Stripe redirects here after payment
  );

  if (result.type === 'success') {
    // Parse the deep link to get status
    const parsed = Linking.parse(result.url);
    const status = parsed.queryParams?.status;
    if (status === 'success') {
      // Refetch order to get updated paymentStatus
      await refetchOrder();
    }
  }
};
```

### Payment result — just refetch the order:
```typescript
// No dedicated result screen needed.
// After WebBrowser closes, refetch the order.
// The webhook has already updated paymentStatus by then
// (Stripe webhooks are typically delivered in < 2 seconds)
// If not yet updated: show "Payment processing..." and poll once more after 3s
```

---

## STEP 7 — TEST CARDS (no real money involved)

Stripe provides test card numbers:

| Card | Number | Use |
|------|--------|-----|
| Visa (success) | `4242 4242 4242 4242` | Payment succeeds |
| Declined | `4000 0000 0000 0002` | Payment fails |
| Auth required | `4000 0025 0000 3155` | Requires 3D Secure |

Expiry: any future date. CVC: any 3 digits. ZIP: any.

---

## STEP 8 — VERIFICATION

```bash
# Start backend
npm run start:dev &

# In another terminal — listen for webhooks
stripe listen --forward-to localhost:3000/api/payments/webhook
# Copy the whsec_... it prints and put in .env.development

# 1. Create an online payment order
ORDER_ID=$(curl -s -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer $CONSUMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"farmId\":\"$FARM_ID\",\"items\":[{\"productId\":\"$PRODUCT_ID\",\"quantity\":1}],\"paymentMethod\":\"stripe\",\"deliveryMethod\":\"delivery\"}" \
  | jq -r '.data.id')
echo "Order: $ORDER_ID"

# 2. Create checkout session
SESSION=$(curl -s -X POST http://localhost:3000/api/payments/checkout \
  -H "Authorization: Bearer $CONSUMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"orderId\":\"$ORDER_ID\"}" | jq .)
echo $SESSION | jq '.data.url'
# Must return a https://checkout.stripe.com/... URL

# 3. Simulate payment success via Stripe CLI
stripe trigger checkout.session.completed \
  --add checkout_session:metadata.orderId=$ORDER_ID

# 4. Check paymentStatus updated
sleep 2
curl -s "http://localhost:3000/api/orders/$ORDER_ID" \
  -H "Authorization: Bearer $CONSUMER_TOKEN" | jq '.data.paymentStatus'
# Must return: "paid"

# 5. Try to pay again
curl -s -X POST http://localhost:3000/api/payments/checkout \
  -H "Authorization: Bearer $CONSUMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"orderId\":\"$ORDER_ID\"}" | jq '.message'
# Must return: "Order is already paid"

# 6. Try cash order
CASH_ID=$(curl -s -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer $CONSUMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"farmId\":\"$FARM_ID\",\"items\":[{\"productId\":\"$PRODUCT_ID\",\"quantity\":1}],\"paymentMethod\":\"cash\",\"deliveryMethod\":\"pickup\"}" \
  | jq -r '.data.id')
curl -s -X POST http://localhost:3000/api/payments/checkout \
  -H "Authorization: Bearer $CONSUMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"orderId\":\"$CASH_ID\"}" | jq '.statusCode'
# Must return: 400

# 7. Build + lint + test
npm run build && npm run lint && npm test
```

---

## STEP 9 — UPDATE CONTEXT.md

At session end, update CONTEXT.md:
- Mark Phase 8A (Payments — Stripe) as ✅ Complete
- Add to endpoint table:
  - `POST /api/payments/checkout` → creates Stripe Checkout session
  - `POST /api/payments/webhook` → Stripe webhook handler (raw body)
- Add env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CURRENCY`
- Note: `rawBody: true` added to NestFactory.create in main.ts
- Note: webhook is the authoritative payment confirmation — not the redirect
- Note: test with `stripe trigger` CLI — no real money
- Output full updated CONTEXT.md

---

## RULES
- `rawBody: true` in main.ts is MANDATORY — Stripe signature verification fails without it
- Webhook signature verification is NON-NEGOTIABLE — never skip
- Webhook is the only place that updates paymentStatus — never trust redirect URL params
- Push notification on payment success — but failure must never break webhook response
- Cash orders must be rejected at checkout creation
- Already-paid orders must be rejected at checkout creation
- `npm run build && npm run lint && npm test` must pass

## START
Say: **"Starting Phase 8A — Stripe Payments. Reading current order schema and payment fields."**
