# Mock Data Usage - Orders API

Guide chi tiết về cách sử dụng mock data cho Orders API.

## Cấu hình

Mock data được điều khiển bởi config global trong `src/api/common/config.ts`:

```typescript
export const USE_MOCK_DATA = true; // Set to false to use real API
```

## Mock Data Structure

Mock data bao gồm 8 orders mẫu đại diện cho các trạng thái khác nhau trong order lifecycle:

### Order 1: Delivered Order
- **Status**: `delivered`
- **Payment**: `completed` via Credit Card
- **Items**: Cà chua bi + Xà lách xoong (từ Farm 1)
- **Total**: 165,000 VND
- **Delivery**: Đã giao thành công

### Order 2: Out for Delivery
- **Status**: `out_for_delivery`
- **Payment**: `completed` via Digital Wallet
- **Items**: Xoài cát Hòa Lộc (từ Farm 2)
- **Total**: 247,500 VND
- **Delivery**: Đang trên đường giao

### Order 3: Preparing
- **Status**: `preparing`
- **Payment**: `completed` via Cash on Delivery
- **Items**: Rau cải xanh + Rau muống (từ Farm 3)
- **Total**: 115,500 VND
- **Delivery**: Đang chuẩn bị

### Order 4: Confirmed
- **Status**: `confirmed`
- **Payment**: `completed` via Bank Transfer
- **Items**: Đu đủ Đại Loan (từ Farm 2)
- **Total**: 110,000 VND
- **Delivery**: Đã xác nhận, chờ chuẩn bị

### Order 5: Pending
- **Status**: `pending`
- **Payment**: `pending` via Credit Card
- **Items**: Cà rót tím + Ớt chuông (từ Farm 1)
- **Total**: 154,000 VND
- **Delivery**: Chờ xác nhận

### Order 6: Cancelled & Refunded
- **Status**: `cancelled`
- **Payment**: `refunded`
- **Items**: Dưa chuột baby (từ Farm 5)
- **Total**: 122,100 VND (Đã hoàn tiền)
- **Reason**: Khách hàng thay đổi ý định

### Order 7: Ready for Pickup
- **Status**: `ready_for_pickup`
- **Payment**: `completed` via Cash on Delivery
- **Items**: Bí đỏ Nhật Bản (từ Farm 6)
- **Total**: 169,400 VND
- **Delivery**: Pickup tại trang trại

### Order 8: Delivered (Historical)
- **Status**: `delivered`
- **Payment**: `completed` via Credit Card
- **Items**: Dưa hấu + Bưởi (từ Farm 2)
- **Total**: 286,000 VND
- **Delivery**: Đã giao thành công (trước đó)

## Sử dụng Mock Data

### 1. Basic Usage

```typescript
import { useGetOrders } from '@/api/orders';

function OrdersList() {
  const { data, isLoading, error } = useGetOrders({
    variables: {
      page: 1,
      limit: 10,
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <View>
      {data?.data?.orders.map(order => (
        <OrderCard key={order.id} order={order} />
      ))}
    </View>
  );
}
```

### 2. Filter by Status

```typescript
// Lấy tất cả orders đang pending
const { data } = useGetOrders({
  variables: {
    status: 'pending',
    page: 1,
    limit: 10,
  },
});

// Lấy tất cả orders đã giao
const { data: deliveredOrders } = useGetOrders({
  variables: {
    status: 'delivered',
    page: 1,
    limit: 20,
  },
});
```

### 3. Filter by Payment Status

```typescript
// Lấy tất cả orders có payment pending
const { data } = useGetOrders({
  variables: {
    paymentStatus: 'pending',
    page: 1,
    limit: 10,
  },
});
```

### 4. Filter by Farm

```typescript
// Lấy tất cả orders từ Farm 1
const { data } = useGetOrders({
  variables: {
    farmId: '1',
    page: 1,
    limit: 10,
  },
});
```

### 5. Filter by Customer

```typescript
// Lấy tất cả orders của customer
const { data } = useGetOrders({
  variables: {
    customerId: 'user-1',
    page: 1,
    limit: 10,
  },
});
```

### 6. Filter by Date Range

```typescript
// Lấy orders trong khoảng thời gian
const { data } = useGetOrders({
  variables: {
    startDate: '2025-10-20',
    endDate: '2025-10-25',
    page: 1,
    limit: 20,
  },
});
```

### 7. Sort Orders

```typescript
// Sort by creation date (newest first)
const { data } = useGetOrders({
  variables: {
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    limit: 10,
  },
});

// Sort by total amount (highest first)
const { data: ordersByPrice } = useGetOrders({
  variables: {
    sortBy: 'total',
    sortOrder: 'desc',
    page: 1,
    limit: 10,
  },
});
```

### 8. Get Single Order

```typescript
import { useGetOrder } from '@/api/orders';

function OrderDetail({ orderId }: { orderId: string }) {
  const { data, isLoading } = useGetOrder({
    variables: { id: orderId },
  });

  if (isLoading) return <LoadingSpinner />;

  return <OrderDetailsView order={data?.data} />;
}
```

### 9. Infinite Scroll

```typescript
import { useGetOrdersInfinite } from '@/api/orders';

function OrdersInfiniteList() {
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetOrdersInfinite({
    variables: {
      limit: 10,
    },
  });

  const allOrders = data?.pages.flatMap(page => page.data?.orders || []) || [];

  return (
    <FlatList
      data={allOrders}
      renderItem={({ item }) => <OrderCard order={item} />}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      }}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? <LoadingSpinner /> : null
      }
    />
  );
}
```

## Utility Functions với Mock Data

```typescript
import {
  formatOrderStatus,
  getOrderStatusColor,
  canCancelOrder,
  isOrderActive,
  calculateOrderStats,
} from '@/api/orders';

function OrderCard({ order }: { order: Order }) {
  const statusText = formatOrderStatus(order.status);
  const statusColor = getOrderStatusColor(order.status);
  const canCancel = canCancelOrder(order);
  const isActive = isOrderActive(order);

  return (
    <View>
      <Text style={{ color: statusColor }}>{statusText}</Text>
      {canCancel && <Button onPress={handleCancel}>Cancel Order</Button>}
      {isActive && <Badge>Active</Badge>}
    </View>
  );
}

function OrdersStats({ orders }: { orders: Order[] }) {
  const stats = calculateOrderStats(orders);

  return (
    <View>
      <Text>Total Orders: {stats.totalOrders}</Text>
      <Text>Total Revenue: {stats.totalRevenue} VND</Text>
      <Text>Average Order Value: {stats.averageOrderValue} VND</Text>
      <Text>Active Orders: {stats.activeOrders}</Text>
      <Text>Completed Orders: {stats.completedOrders}</Text>
    </View>
  );
}
```

## Testing với Mock Data

Mock data rất hữu ích cho testing:

```typescript
// Test component với different order statuses
it('should render pending order correctly', () => {
  const { getByText } = render(
    <OrderCard order={MOCK_ORDERS[4]} /> // Pending order
  );
  
  expect(getByText('Pending')).toBeTruthy();
});

it('should render delivered order correctly', () => {
  const { getByText } = render(
    <OrderCard order={MOCK_ORDERS[0]} /> // Delivered order
  );
  
  expect(getByText('Delivered')).toBeTruthy();
});
```

## Network Delay Simulation

Mock data tự động simulate network delay (500ms) để test loading states:

```typescript
// Automatic delay trong fetcher
if (USE_MOCK_DATA) {
  await simulateNetworkDelay(); // 500ms delay
  return getMockOrders(params);
}
```

Bạn có thể custom delay trong `src/api/common/config.ts`:

```typescript
export const MOCK_DELAY = 1000; // 1 second delay
```

## Switch giữa Mock Data và Real API

Để chuyển sang real API, chỉ cần thay đổi 1 dòng trong `src/api/common/config.ts`:

```typescript
// Mock data mode
export const USE_MOCK_DATA = true;

// Real API mode
export const USE_MOCK_DATA = false;
```

Tất cả API hooks sẽ tự động chuyển sang real API endpoints.

## Notes

- Mock data được designed để cover tất cả order statuses
- Mỗi order có full timeline với detailed events
- Mock data bao gồm nhiều payment methods và delivery methods
- Filters và sorting hoạt động giống như real API
- Mock data có timestamps realistic cho testing date-based features

