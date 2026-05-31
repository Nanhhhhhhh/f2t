# Order Notification Bell & Payment Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a notification bell UI (consumer: order status changes, farm: payment received), notify the farm owner when Stripe payment succeeds, and restrict manual payment confirmation to cash-only orders.

**Architecture:** Backend adds a `PaymentReceived` notification type and fires it from `updatePaymentStatus()` (called by the Stripe webhook) after reading the order's `farmId` to locate the farm owner. `updatePaymentStatusByFarm()` gains a guard that rejects Stripe orders. Frontend adds a reusable `NotificationBell` component wired into the tab layout header, and the farm order detail screen hides the "Update Payment" button for non-cash orders.

**Tech Stack:** NestJS 11, Mongoose, Expo Push (existing `NotificationsService.createAndPush`), React Native, NativeWind, react-query-kit (`useUnreadNotificationCount` hook already exists in `src/api/notifications/index.tsx`).

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `f2t-backend/src/modules/notifications/enums/notification-type.enum.ts` | Modify | Add `PaymentReceived` value |
| `f2t-backend/src/modules/orders/orders.service.ts` | Modify | Notify farm on Stripe paid; guard cash-only on `updatePaymentStatusByFarm` |
| `f2t-backend/src/modules/orders/orders.service.spec.ts` | Modify | Tests for the two new behaviours |
| `f2t-frontend/src/components/ui/notification-bell.tsx` | Create | Bell icon + unread badge, navigates to `/notifications` |
| `f2t-frontend/src/app/(app)/_layout.tsx` | Modify | Mount `NotificationBell` in tab screen headers |
| `f2t-frontend/src/app/(app)/farm/orders/[id].tsx` | Modify | Hide Update Payment for Stripe orders; show read-only "Paid via Stripe" badge |

---

## Task 1 — Backend: Add `PaymentReceived` notification type

**Files:**
- Modify: `f2t-backend/src/modules/notifications/enums/notification-type.enum.ts`

- [ ] **Step 1.1 — Add the enum value**

Open `f2t-backend/src/modules/notifications/enums/notification-type.enum.ts` and add:

```typescript
export enum NotificationType {
  // Order lifecycle — sent to consumer
  OrderPlaced = 'order_placed',
  OrderConfirmed = 'order_confirmed',
  OrderPreparing = 'order_preparing',
  OrderShipped = 'order_shipped',
  OrderReadyForPickup = 'order_ready_for_pickup',
  OrderDelivered = 'order_delivered',
  OrderCancelled = 'order_cancelled',

  // Order lifecycle — sent to farm
  NewOrder = 'new_order',
  PaymentReceived = 'payment_received',   // ← ADD THIS

  // Stock — sent to farm
  LowStock = 'low_stock',

  // System
  System = 'system',
  PriceSuggestion = 'price_suggestion',
}
```

- [ ] **Step 1.2 — Verify build still passes**

```bash
cd f2t-backend && npm run build 2>&1 | tail -5
```
Expected: no errors.

- [ ] **Step 1.3 — Commit**

```bash
cd f2t-backend
git add src/modules/notifications/enums/notification-type.enum.ts
git commit -m "feat(notifications): add PaymentReceived notification type"
```

---

## Task 2 — Backend: Notify farm on Stripe payment + guard cash-only

**Files:**
- Modify: `f2t-backend/src/modules/orders/orders.service.ts`
- Modify: `f2t-backend/src/modules/orders/orders.service.spec.ts`

### 2A — Write failing tests first

- [ ] **Step 2.1 — Add tests to `orders.service.spec.ts`**

Find the existing `describe` block for `updatePaymentStatusByFarm` (or add one). Add these two test cases:

```typescript
describe('updatePaymentStatusByFarm', () => {
  it('should throw BadRequestException when order paymentMethod is stripe', async () => {
    // Arrange: mock order with paymentMethod 'stripe'
    const stripeOrder = {
      _id: new Types.ObjectId(),
      farmId: new Types.ObjectId(),
      paymentMethod: 'stripe',
      paymentStatus: 'pending',
    };
    jest.spyOn(orderModel, 'findById').mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue(stripeOrder),
    } as any);

    // Act & Assert
    await expect(
      service.updatePaymentStatusByFarm('someOrderId', 'someUserId', 'paid'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should allow payment update when order paymentMethod is cash', async () => {
    const cashOrder = {
      _id: new Types.ObjectId(),
      farmId: farmDoc._id,
      paymentMethod: 'cash',
      paymentStatus: 'pending',
    };
    jest.spyOn(orderModel, 'findById').mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue(cashOrder),
    } as any);
    jest.spyOn(farmsService, 'findOneByOwner').mockResolvedValueOnce(farmDoc as any);
    jest.spyOn(orderModel, 'findByIdAndUpdate').mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue({ ...cashOrder, paymentStatus: 'paid' }),
    } as any);

    const result = await service.updatePaymentStatusByFarm(
      cashOrder._id.toHexString(),
      'someUserId',
      'paid',
    );
    expect(result.paymentStatus).toBe('paid');
  });
});
```

- [ ] **Step 2.2 — Run tests to confirm they fail**

```bash
cd f2t-backend && npx jest src/modules/orders/orders.service.spec.ts --no-coverage 2>&1 | tail -20
```
Expected: 2 new tests fail (method doesn't have the guard yet).

### 2B — Implement: guard cash-only in `updatePaymentStatusByFarm`

- [ ] **Step 2.3 — Add guard at the top of `updatePaymentStatusByFarm`**

In `f2t-backend/src/modules/orders/orders.service.ts`, locate `updatePaymentStatusByFarm` (around line 526). After the `findById` call and the `NotFoundException` check, add the guard **before** the ownership check:

```typescript
async updatePaymentStatusByFarm(
  orderId: string,
  userId: string,
  status: string,
  transactionId?: string,
): Promise<OrderDocument> {
  if (!Types.ObjectId.isValid(orderId)) {
    throw new BadRequestException('Invalid order ID format');
  }

  const order = await this.orderModel.findById(orderId).exec();
  if (!order) throw new NotFoundException('Order not found');

  // ── NEW: only cash orders can be confirmed manually ──
  if (order.paymentMethod === 'stripe') {
    throw new BadRequestException(
      'Payment status for Stripe orders is managed automatically',
    );
  }

  // Ownership check — farm must own this order
  const farm = await this.farmsService.findOneByOwner(userId);
  // ... rest of existing code unchanged ...
```

- [ ] **Step 2.4 — Run tests again**

```bash
cd f2t-backend && npx jest src/modules/orders/orders.service.spec.ts --no-coverage 2>&1 | tail -20
```
Expected: the two new tests pass.

### 2C — Implement: notify farm when Stripe payment succeeds

- [ ] **Step 2.5 — Modify `updatePaymentStatus` to also send a notification**

Locate `updatePaymentStatus` (around line 572). Replace the current thin implementation:

```typescript
async updatePaymentStatus(
  orderId: string,
  status: 'paid' | 'failed' | 'refunded',
  extra?: {
    stripePaymentIntentId?: string;
    paidAt?: Date;
  },
): Promise<void> {
  const order = await this.orderModel
    .findByIdAndUpdate(
      orderId,
      { paymentStatus: status, ...extra },
      { new: true },
    )
    .exec();

  if (!order || status !== 'paid') return;

  // Notify the farm owner that payment was received
  try {
    const farm = await this.farmsService.findOne(
      (order.farmId as Types.ObjectId).toHexString(),
    );
    void this.notificationsService.createAndPush({
      userId: (farm.ownerId as Types.ObjectId).toHexString(),
      type: NotificationType.PaymentReceived,
      title: 'Thanh toán nhận được!',
      message: `Đơn hàng #${order.orderNumber} đã được thanh toán thành công.`,
      referenceId: (order._id as Types.ObjectId).toHexString(),
      referenceType: 'order',
      data: {
        orderId: (order._id as Types.ObjectId).toHexString(),
        orderNumber: order.orderNumber,
        totalAmount: order.total,
      },
    });
  } catch {
    // Notification failure must never break the payment flow
  }
}
```

> `farmsService.findOne(id)` is already available — `FarmsService` is injected in `OrdersService` constructor.

- [ ] **Step 2.6 — Run full order service tests**

```bash
cd f2t-backend && npx jest src/modules/orders/orders.service.spec.ts --no-coverage 2>&1 | tail -20
```
Expected: all tests pass.

- [ ] **Step 2.7 — Build check**

```bash
npm run build 2>&1 | tail -5
```
Expected: no errors.

- [ ] **Step 2.8 — Commit**

```bash
git add src/modules/orders/orders.service.ts src/modules/orders/orders.service.spec.ts
git commit -m "feat(orders): guard cash-only manual payment; notify farm on Stripe payment"
```

---

## Task 3 — Frontend: `NotificationBell` component

**Files:**
- Create: `f2t-frontend/src/components/ui/notification-bell.tsx`
- Modify: `f2t-frontend/src/app/(app)/_layout.tsx`

### 3A — Create the component

- [ ] **Step 3.1 — Create `notification-bell.tsx`**

Create `f2t-frontend/src/components/ui/notification-bell.tsx`:

```typescript
import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import React from 'react';
import { TouchableOpacity } from 'react-native';

import { useUnreadNotificationCount } from '@/api/notifications';
import { Text, View } from '@/components/ui';
import { useAuth } from '@/lib';

export function NotificationBell() {
  const router = useRouter();
  const user = useAuth.use.user();

  const { data } = useUnreadNotificationCount({
    variables: { userId: user?.id ?? '' },
    enabled: !!user?.id,
    refetchInterval: 30_000,
  });

  const unreadCount = data?.data?.count ?? 0;

  return (
    <TouchableOpacity
      onPress={() => router.push('/notifications')}
      className="relative mr-3 p-1"
      accessibilityLabel="Notifications"
    >
      <Bell size={24} className="text-gray-700 dark:text-gray-300" />
      {unreadCount > 0 && (
        <View className="absolute -right-0.5 -top-0.5 size-4 items-center justify-center rounded-full bg-red-500">
          <Text className="text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
```

> **Note:** `useUnreadNotificationCount` already exists in `src/api/notifications/index.tsx`. The backend endpoint `GET /notifications/user/:userId/unread-count` returns `{ count: number }` wrapped in the standard `{ success, data }` envelope — hence `data?.data?.count`.

### 3B — Wire into layout header

- [ ] **Step 3.2 — Import and mount in `_layout.tsx`**

In `f2t-frontend/src/app/(app)/_layout.tsx`:

1. Add import at the top:
```typescript
import { NotificationBell } from '@/components/ui/notification-bell';
```

2. In `screenOptions` (the shared options object around line 74), add:
```typescript
headerRight: () => <NotificationBell />,
```

This adds the bell to every tab screen header. Screens that already set `headerShown: false` (like Home/Dashboard) won't show it — which is correct since those screens have their own custom headers or are full-bleed. If you want it on all screens including those, set `headerShown: true` per screen and add a custom `headerTitle`.

- [ ] **Step 3.3 — Type-check**

```bash
cd f2t-frontend && pnpm type-check 2>&1 | grep "error TS" | grep -v "test\|spec\|mock" | head -10
```
Expected: no errors.

- [ ] **Step 3.4 — Commit**

```bash
cd f2t-frontend
git add src/components/ui/notification-bell.tsx src/app/\(app\)/_layout.tsx
git commit -m "feat(ui): add NotificationBell component with unread count badge"
```

---

## Task 4 — Frontend: Payment UI guard for farm order detail

**Files:**
- Modify: `f2t-frontend/src/app/(app)/farm/orders/[id].tsx`

The "Update Payment" button (around line 338–347) currently appears for all orders. We need:
- **Stripe + paid:** show a read-only "Paid via Stripe" badge instead
- **Stripe + not paid:** hide the button (payment is handled automatically)
- **Cash:** show the button as before

- [ ] **Step 4.1 — Add a derived constant for payment button visibility**

In `f2t-frontend/src/app/(app)/farm/orders/[id].tsx`, inside the component body (after `order` is available), add:

```typescript
const isCashOrder = order.paymentMethod === 'cash';
const isPaidByStripe =
  order.paymentMethod === 'stripe' && order.paymentStatus === 'paid';
```

- [ ] **Step 4.2 — Replace the Update Payment button block**

Find the "Update Payment" button block (around line 338–347):

```typescript
          <View className="flex-1">
            <TouchableOpacity
              onPress={() => paymentModal.present()}
              className="flex-row items-center justify-center rounded-lg border border-gray-300 bg-white py-2.5 dark:border-gray-600 dark:bg-gray-800"
            >
              <Text className="font-semibold text-gray-900 dark:text-white">
                Update Payment
              </Text>
            </TouchableOpacity>
          </View>
```

Replace with:

```typescript
          {isCashOrder && (
            <View className="flex-1">
              <TouchableOpacity
                onPress={() => paymentModal.present()}
                className="flex-row items-center justify-center rounded-lg border border-gray-300 bg-white py-2.5 dark:border-gray-600 dark:bg-gray-800"
              >
                <Text className="font-semibold text-gray-900 dark:text-white">
                  Update Payment
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {isPaidByStripe && (
            <View className="flex-1 flex-row items-center justify-center rounded-lg bg-green-50 py-2.5 dark:bg-green-900/20">
              <Text className="font-semibold text-green-700 dark:text-green-400">
                ✓ Paid via Stripe
              </Text>
            </View>
          )}
```

- [ ] **Step 4.3 — Type-check**

```bash
cd f2t-frontend && pnpm type-check 2>&1 | grep "error TS" | grep -v "test\|spec\|mock" | head -5
```
Expected: no errors.

- [ ] **Step 4.4 — Commit**

```bash
git add src/app/\(app\)/farm/orders/\[id\].tsx
git commit -m "feat(farm-orders): restrict payment update to cash orders; show Stripe paid badge"
```

---

## Self-Review

**Spec coverage:**
- ✅ Notification bell component (Task 3) — consumer sees order status notifications, farm sees payment notifications via the same `/notifications` screen
- ✅ Notify farm when Stripe payment received (Task 2C — `updatePaymentStatus`)
- ✅ Stripe payment auto-sets status to `paid` — already done by existing webhook, no change needed
- ✅ Farm can only manually confirm payment for cash orders — Task 2B (backend guard) + Task 4 (frontend UI)

**Placeholder scan:** None found. All code blocks are complete.

**Type consistency:**
- `NotificationType.PaymentReceived` defined in Task 1, used in Task 2C — consistent.
- `isCashOrder` / `isPaidByStripe` defined and used within same file — consistent.
- `useUnreadNotificationCount` used in Task 3 — hook already exists in `src/api/notifications/index.tsx`, returns `{ data: { count: number } }` via standard envelope.
