# Orders API

API module cho quản lý đơn hàng trong hệ thống Farm to Table.

## Tính năng

### Mock Data
API này hỗ trợ mock data để phát triển và testing mà không cần backend thật.

Mock data được điều khiển bởi cấu hình global `USE_MOCK_DATA` trong `src/api/common/config.ts`:
- `USE_MOCK_DATA = true`: Sử dụng mock data
- `USE_MOCK_DATA = false`: Sử dụng real API

### Available Hooks

#### 1. useGetOrders
Query để lấy danh sách orders với pagination.

```typescript
const { data, isLoading, error } = useGetOrders({
  variables: {
    page: 1,
    limit: 10,
    status: 'pending',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
});
```

#### 2. useGetOrdersInfinite
Query để lấy danh sách orders với infinite scrolling.

```typescript
const { 
  data, 
  isLoading, 
  error,
  fetchNextPage,
  hasNextPage,
} = useGetOrdersInfinite({
  variables: {
    limit: 10,
    status: 'pending',
  },
});
```

#### 3. useGetOrder
Query để lấy chi tiết 1 order.

```typescript
const { data, isLoading, error } = useGetOrder({
  variables: { id: 'order-1' },
});
```

#### 4. useCreateOrder
Mutation để tạo order mới.

```typescript
const { mutate: createOrder, isLoading } = useCreateOrder();

createOrder({
  items: [
    {
      productId: 'prod-1',
      quantity: 2,
    },
  ],
  paymentMethod: 'credit_card',
  deliveryMethod: 'delivery',
  billingAddress: { /* ... */ },
  shippingAddress: { /* ... */ },
});
```

#### 5. useUpdateOrderStatus
Mutation để cập nhật trạng thái order.

```typescript
const { mutate: updateStatus } = useUpdateOrderStatus();

updateStatus({
  id: 'order-1',
  status: 'confirmed',
  notes: 'Đơn hàng đã được xác nhận',
});
```

#### 6. useCancelOrder
Mutation để hủy order.

```typescript
const { mutate: cancelOrder } = useCancelOrder();

cancelOrder({
  id: 'order-1',
  reason: 'Khách hàng thay đổi ý định',
});
```

#### 7. useRefundOrder
Mutation để hoàn tiền order.

```typescript
const { mutate: refundOrder } = useRefundOrder();

refundOrder({
  id: 'order-1',
  amount: 165000,
  reason: 'Sản phẩm không đúng yêu cầu',
});
```

## Mock Data

Mock data bao gồm 8 orders mẫu với các trạng thái khác nhau:

### Order Statuses
- `pending`: Đơn hàng mới tạo, chờ xác nhận
- `confirmed`: Đơn hàng đã được xác nhận
- `preparing`: Đang chuẩn bị đơn hàng
- `ready_for_pickup`: Sẵn sàng để lấy hàng
- `out_for_delivery`: Đang giao hàng
- `delivered`: Đã giao hàng thành công
- `cancelled`: Đã hủy
- `refunded`: Đã hoàn tiền

### Payment Statuses
- `pending`: Chờ thanh toán
- `processing`: Đang xử lý thanh toán
- `completed`: Thanh toán thành công
- `failed`: Thanh toán thất bại
- `refunded`: Đã hoàn tiền
- `cancelled`: Đã hủy

### Payment Methods
- `cash_on_delivery`: Thanh toán khi nhận hàng
- `credit_card`: Thẻ tín dụng
- `debit_card`: Thẻ ghi nợ
- `bank_transfer`: Chuyển khoản ngân hàng
- `digital_wallet`: Ví điện tử
- `cryptocurrency`: Tiền điện tử

### Delivery Methods
- `pickup`: Khách hàng tự đến lấy
- `delivery`: Giao hàng tận nơi
- `third_party`: Dịch vụ giao hàng bên thứ 3

## Utility Functions

Module cung cấp nhiều utility functions để xử lý orders:

- `formatOrderStatus()`: Format trạng thái order cho hiển thị
- `formatPaymentStatus()`: Format trạng thái thanh toán
- `getOrderStatusColor()`: Lấy màu sắc cho trạng thái order
- `canCancelOrder()`: Kiểm tra có thể hủy order hay không
- `canRefundOrder()`: Kiểm tra có thể hoàn tiền hay không
- `isOrderActive()`: Kiểm tra order có đang active không
- `calculateOrderProgress()`: Tính phần trăm hoàn thành của order
- `groupOrdersByStatus()`: Nhóm orders theo trạng thái
- `calculateOrderStats()`: Tính toán thống kê orders
- Và nhiều functions khác...

## Filter & Sort Options

### Filter Parameters
```typescript
{
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  farmId?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
}
```

### Sort Options
```typescript
{
  sortBy?: 'createdAt' | 'updatedAt' | 'total' | 'status';
  sortOrder?: 'asc' | 'desc';
}
```

## Examples

### Lấy tất cả orders đang active
```typescript
const { data } = useGetOrders({
  variables: {
    page: 1,
    limit: 20,
  },
});

const activeOrders = data?.data?.orders.filter(isOrderActive);
```

### Lấy orders của 1 farm cụ thể
```typescript
const { data } = useGetOrders({
  variables: {
    farmId: '1',
    page: 1,
    limit: 10,
  },
});
```

### Lấy orders theo khoảng thời gian
```typescript
const { data } = useGetOrders({
  variables: {
    startDate: '2025-10-01',
    endDate: '2025-10-31',
    page: 1,
    limit: 20,
  },
});
```

## Notes

- Mock data bao gồm full order lifecycle từ pending đến delivered/cancelled
- Mỗi order có timeline chi tiết với các events
- Mock data bao gồm nhiều farms và products khác nhau
- Mock data có simulate network delay để test loading states
- Tất cả các filters và sorting đều hoạt động với mock data

