# Summary of Changes - Mock Data Implementation

## Tổng quan

Đã implement mock data cho orders và tạo cấu hình global `USE_MOCK_DATA` để điều khiển việc sử dụng mock data hoặc real API cho tất cả API modules.

## Thay đổi chính

### 1. Global API Configuration

**File mới:** `src/api/common/config.ts`

Tạo cấu hình global để điều khiển tất cả API calls:

```typescript
export const USE_MOCK_DATA = true; // Set to false to use real API
export const MOCK_DELAY = 500; // Network delay simulation
export function simulateNetworkDelay(delay?: number): Promise<void>
```

**Lợi ích:**
- ✅ Chỉ cần thay đổi 1 config để switch giữa mock data và real API
- ✅ Consistent behavior across tất cả API modules
- ✅ Dễ dàng customize network delay cho testing
- ✅ Scalable cho future APIs

**File cập nhật:** `src/api/common/index.tsx`
- Export config global để dễ dàng import

### 2. Orders API Mock Data

**File mới:** `src/api/orders/mock-orders.ts`

Tạo comprehensive mock data cho orders:

**Mock Data bao gồm:**
- 8 orders mẫu với đầy đủ các trạng thái:
  - `pending`: Đơn hàng mới tạo
  - `confirmed`: Đã xác nhận
  - `preparing`: Đang chuẩn bị
  - `ready_for_pickup`: Sẵn sàng lấy hàng
  - `out_for_delivery`: Đang giao hàng
  - `delivered`: Đã giao thành công (2 orders)
  - `cancelled`: Đã hủy và hoàn tiền

**Tính năng:**
- Full order details (items, addresses, timeline)
- Multiple payment methods (credit card, digital wallet, bank transfer, COD)
- Multiple delivery methods (delivery, pickup)
- Realistic timestamps và timeline events
- Products từ nhiều farms khác nhau
- Support filters và sorting

**Helper Functions:**
- `getMockOrders()`: Lấy danh sách orders với pagination và filters
- `getMockOrder()`: Lấy single order theo ID

### 3. Orders API Hooks Update

**Files cập nhật:**

1. `src/api/orders/use-get-orders.tsx`
   - Implement logic để sử dụng mock data khi `USE_MOCK_DATA = true`
   - Support cả regular query và infinite query
   - Simulate network delay

2. `src/api/orders/use-get-order.tsx`
   - Implement logic để sử dụng mock data cho single order
   - Support mock delay

3. `src/api/orders/index.tsx`
   - Export mock data và helper functions

### 4. Farms API Update

**Files cập nhật:**

1. `src/api/farms/use-get-farms.tsx`
   - Replace local `USE_MOCK_DATA` với global config
   - Use `simulateNetworkDelay()` helper

2. `src/api/farms/use-get-farm.tsx`
   - Replace local `USE_MOCK_DATA` với global config
   - Use `simulateNetworkDelay()` helper

### 5. Products API Update

**Files cập nhật:**

1. `src/api/products/use-get-products.tsx`
   - Replace local `USE_MOCK_DATA` với global config
   - Use `simulateNetworkDelay()` helper
   - Cả regular và infinite query

2. `src/api/products/use-get-product.tsx`
   - Replace local `USE_MOCK_DATA` với global config
   - Use `simulateNetworkDelay()` helper

### 6. Orders Screen Update

**File cập nhật:** `src/app/orders/index.tsx`

**Thay đổi:**
- Fix order status values để match với mock data types
- Update status filter tabs với correct statuses:
  - `pending`, `confirmed`, `preparing`, `out_for_delivery`, `delivered`, `cancelled`
- Update order statistics calculation với correct statuses
- Format currency hiển thị VND thay vì USD
- Fix active orders count calculation

**Before:**
```typescript
statusTabs = [
  { label: 'Processing', value: 'processing' }, // ❌ Incorrect
  { label: 'Shipped', value: 'shipped' },       // ❌ Incorrect
]
```

**After:**
```typescript
statusTabs = [
  { label: 'Confirmed', value: 'confirmed' },          // ✅ Correct
  { label: 'Preparing', value: 'preparing' },          // ✅ Correct
  { label: 'Shipping', value: 'out_for_delivery' },    // ✅ Correct
]
```

### 7. Documentation

**Files mới:**

1. `src/api/common/CONFIG_GUIDE.md`
   - Comprehensive guide về global config
   - Migration guide cho APIs mới
   - Best practices và troubleshooting
   - Examples và use cases

2. `src/api/orders/README.md`
   - API documentation cho orders
   - Available hooks và functions
   - Filter và sort options
   - Usage examples

3. `src/api/orders/MOCK_DATA_USAGE.md`
   - Chi tiết về mock data structure
   - Usage examples cho từng scenario
   - Testing strategies
   - Switch giữa mock và real API

## File Structure

```
src/
├── api/
│   ├── common/
│   │   ├── config.ts          # ✨ NEW - Global config
│   │   ├── CONFIG_GUIDE.md    # ✨ NEW - Config documentation
│   │   └── index.tsx           # ✅ Updated - Export config
│   │
│   ├── orders/
│   │   ├── mock-orders.ts     # ✨ NEW - Mock data
│   │   ├── README.md          # ✨ NEW - API docs
│   │   ├── MOCK_DATA_USAGE.md # ✨ NEW - Mock data guide
│   │   ├── index.tsx           # ✅ Updated - Export mock data
│   │   ├── use-get-orders.tsx  # ✅ Updated - Use global config
│   │   └── use-get-order.tsx   # ✅ Updated - Use global config
│   │
│   ├── farms/
│   │   ├── use-get-farms.tsx   # ✅ Updated - Use global config
│   │   └── use-get-farm.tsx    # ✅ Updated - Use global config
│   │
│   └── products/
│       ├── use-get-products.tsx # ✅ Updated - Use global config
│       └── use-get-product.tsx  # ✅ Updated - Use global config
│
└── app/
    └── orders/
        └── index.tsx           # ✅ Updated - Fix statuses & currency
```

## Cách sử dụng

### Development Mode (Mock Data)

1. Mở `src/api/common/config.ts`
2. Ensure `USE_MOCK_DATA = true` (default)
3. Run app: `npm start`

Tất cả orders, products, và farms sẽ sử dụng mock data.

### Production Mode (Real API)

1. Mở `src/api/common/config.ts`
2. Change `USE_MOCK_DATA = false`
3. Ensure backend server đang chạy
4. Run app

Tất cả API calls sẽ gọi đến real endpoints.

## Testing

### Quick Test - View Orders từ Profile

1. Run app với `USE_MOCK_DATA = true`
2. Navigate to Profile tab
3. Click "View Orders" trong Quick Actions section
4. Should see 8 mock orders với different statuses

### Test Filters

1. Try các status filters: All, Pending, Confirmed, etc.
2. Try search functionality
3. Try sort order (ascending/descending)
4. Should see data update correctly

### Test Network Delay

Adjust `MOCK_DELAY` trong config:

```typescript
export const MOCK_DELAY = 2000; // 2 seconds
```

You should see loading states longer.

## Benefits

### Before
- ❌ Mỗi API module có local `USE_MOCK_DATA`
- ❌ Phải update nhiều files để switch mode
- ❌ Không consistent
- ❌ Network delay hardcoded
- ❌ Không có orders mock data

### After
- ✅ Single global config
- ✅ Chỉ update 1 file để switch mode
- ✅ Consistent across all APIs
- ✅ Customizable network delay
- ✅ Comprehensive orders mock data
- ✅ Full documentation
- ✅ Ready for production

## Migration cho APIs khác

Để add mock data cho API mới:

1. Create `mock-[entity].ts` trong API folder
2. Export `MOCK_ENTITIES`, `getMockEntities()`, `getMockEntity()`
3. Update hook file:
   ```typescript
   import { USE_MOCK_DATA, simulateNetworkDelay } from '../common/config';
   
   if (USE_MOCK_DATA) {
     await simulateNetworkDelay();
     return getMockEntities(params);
   }
   ```
4. Export mock data trong `index.tsx`
5. Create `README.md` và `MOCK_DATA_USAGE.md`

## Next Steps

Có thể extend hệ thống này với:

1. **Environment Variables**
   ```typescript
   export const USE_MOCK_DATA = process.env.MOCK_API_ENABLED === 'true';
   ```

2. **Feature Flags**
   ```typescript
   import { featureFlags } from '@/lib/feature-flags';
   export const USE_MOCK_DATA = featureFlags.mockApiEnabled;
   ```

3. **Per-module Config**
   ```typescript
   export const MOCK_CONFIG = {
     orders: true,
     products: true,
     farms: false, // Use real API for farms only
   };
   ```

4. **Mock Data Generator**
   - Tự động generate mock data từ types
   - Faker.js integration
   - Random data generation

## Notes

- ✅ Không có breaking changes
- ✅ Backward compatible
- ✅ No linter errors
- ✅ Follows project conventions (kebab-case, functional components)
- ✅ Full TypeScript support
- ✅ Documented thoroughly

## Conclusion

Hệ thống mock data đã được implement thành công với:
- Global configuration cho tất cả APIs
- Comprehensive orders mock data
- Updated tất cả existing APIs để use global config
- Full documentation
- Ready to use ngay!

Chỉ cần thay đổi `USE_MOCK_DATA` trong `src/api/common/config.ts` để switch giữa mock data và real API! 🎉

