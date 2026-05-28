# API Configuration Guide

Hướng dẫn cấu hình global cho tất cả API calls trong ứng dụng Farm to Table.

## Tổng quan

File `src/api/common/config.ts` chứa các cấu hình global để điều khiển behavior của tất cả API calls trong ứng dụng.

## Cấu hình chính

### USE_MOCK_DATA

Biến global để điều khiển việc sử dụng mock data hoặc real API.

```typescript
export const USE_MOCK_DATA = true; // Sử dụng mock data
// export const USE_MOCK_DATA = false; // Sử dụng real API
```

**Khi `USE_MOCK_DATA = true`:**
- Tất cả API calls sẽ sử dụng mock data
- Không cần backend server
- Phù hợp cho development và testing
- Có network delay simulation để test loading states

**Khi `USE_MOCK_DATA = false`:**
- Tất cả API calls sẽ gọi đến real API endpoints
- Cần có backend server đang chạy
- Sử dụng cho production và integration testing

### MOCK_DELAY

Độ trễ mạng giả lập (milliseconds) khi sử dụng mock data.

```typescript
export const MOCK_DELAY = 500; // 500ms delay
```

Bạn có thể thay đổi giá trị này để test các scenarios khác nhau:
- `100`: Network rất nhanh
- `500`: Network tốc độ trung bình (mặc định)
- `1000-2000`: Network chậm
- `5000+`: Network rất chậm (timeout scenarios)

## API Modules có Mock Data

Hiện tại các API modules sau đã hỗ trợ mock data:

### 1. Orders API
**Path:** `src/api/orders/`

**Mock Data:**
- 8 orders mẫu với đầy đủ các trạng thái
- Bao gồm order items, timeline, addresses
- Hỗ trợ filters và sorting

**Files:**
- `mock-orders.ts`: Mock data và helper functions
- `use-get-orders.tsx`: Get orders list
- `use-get-order.tsx`: Get single order

**Docs:**
- `README.md`: API documentation
- `MOCK_DATA_USAGE.md`: Hướng dẫn sử dụng mock data

### 2. Products API
**Path:** `src/api/products/`

**Mock Data:**
- Hơn 30 products từ nhiều farms khác nhau
- Bao gồm vegetables, fruits với đầy đủ thông tin
- Hỗ trợ search, filters, sorting

**Files:**
- `mock-products.ts`: Mock data và helper functions
- `use-get-products.tsx`: Get products list
- `use-get-product.tsx`: Get single product

**Docs:**
- `README.md`: API documentation
- `BUGFIX_*.md`: Các bugfix notes

### 3. Farms API
**Path:** `src/api/farms/`

**Mock Data:**
- 6 farms mẫu với locations khác nhau
- Bao gồm delivery zones, business hours, certifications
- Hỗ trợ location-based search

**Files:**
- `mock-farms.ts`: Mock data và helper functions
- `use-get-farms.tsx`: Get farms list
- `use-get-farm.tsx`: Get single farm

**Docs:**
- `README.md`: API documentation
- `MOCK_DATA_USAGE.md`: Hướng dẫn sử dụng mock data

## Cách sử dụng

### Development Mode (Mock Data)

1. Mở file `src/api/common/config.ts`
2. Set `USE_MOCK_DATA = true`
3. (Optional) Điều chỉnh `MOCK_DELAY` nếu cần

```typescript
export const USE_MOCK_DATA = true;
export const MOCK_DELAY = 500;
```

4. Run ứng dụng:
```bash
npm start
# hoặc
npx expo start
```

### Production Mode (Real API)

1. Mở file `src/api/common/config.ts`
2. Set `USE_MOCK_DATA = false`

```typescript
export const USE_MOCK_DATA = false;
```

3. Đảm bảo backend server đang chạy
4. Run ứng dụng

### Testing Mode

Cho unit tests, bạn có thể mock config:

```typescript
// In your test file
jest.mock('@/api/common/config', () => ({
  USE_MOCK_DATA: true,
  MOCK_DELAY: 0, // No delay in tests
  simulateNetworkDelay: jest.fn().mockResolvedValue(undefined),
}));
```

## Helper Functions

### simulateNetworkDelay()

Function helper để simulate network delay.

```typescript
import { simulateNetworkDelay } from '@/api/common/config';

// Use default delay (MOCK_DELAY)
await simulateNetworkDelay();

// Use custom delay
await simulateNetworkDelay(1000); // 1 second
```

**Signature:**
```typescript
function simulateNetworkDelay(delay?: number): Promise<void>
```

**Parameters:**
- `delay` (optional): Delay duration in milliseconds. Defaults to `MOCK_DELAY`.

**Returns:** Promise that resolves after the delay.

## Best Practices

### 1. Development Workflow

```
Development Phase:
├── USE_MOCK_DATA = true
├── Focus on UI/UX
├── Test different scenarios
└── No backend dependency

Integration Phase:
├── USE_MOCK_DATA = false
├── Test with real backend
├── Fix API integration issues
└── Performance testing

Production:
├── USE_MOCK_DATA = false
├── Real API endpoints
└── Monitoring & logging
```

### 2. Testing Strategy

```typescript
// Test với mock data
describe('OrdersList with Mock Data', () => {
  beforeAll(() => {
    // Mock config được set tự động trong test environment
  });

  it('should load orders', async () => {
    const { result, waitFor } = renderHook(() => 
      useGetOrders({ variables: { page: 1, limit: 10 } })
    );

    await waitFor(() => result.current.isSuccess);
    
    expect(result.current.data?.data?.orders).toHaveLength(8);
  });
});
```

### 3. Feature Flags

Bạn có thể kết hợp với feature flags:

```typescript
// src/api/common/config.ts
import { ENV } from '@/lib/env';

export const USE_MOCK_DATA = 
  ENV.NODE_ENV === 'development' || 
  ENV.MOCK_API_ENABLED === 'true';
```

### 4. Debugging

```typescript
// Log khi sử dụng mock data
if (USE_MOCK_DATA) {
  console.log('[API] Using mock data');
  console.log('[API] Mock delay:', MOCK_DELAY, 'ms');
}
```

## Migration Guide

### Thêm mock data cho API mới

1. Tạo file `mock-[entity].ts`:

```typescript
// src/api/[entity]/mock-[entity].ts
import type { Entity } from './types';

export const MOCK_ENTITIES: Entity[] = [
  // Your mock data here
];

export function getMockEntities(params: any) {
  // Filter, sort, paginate logic
  return {
    success: true,
    data: {
      entities: [...],
      total: 0,
      page: 1,
      limit: 10,
      hasMore: false,
    },
  };
}

export function getMockEntity(id: string) {
  const entity = MOCK_ENTITIES.find(e => e.id === id);
  
  if (!entity) {
    return {
      success: false,
      data: null,
      message: 'Entity not found',
    };
  }

  return {
    success: true,
    data: entity,
  };
}
```

2. Update hook file:

```typescript
// src/api/[entity]/use-get-entities.tsx
import { USE_MOCK_DATA, simulateNetworkDelay } from '../common/config';
import { getMockEntities } from './mock-[entity]';

export const useGetEntities = createQuery({
  queryKey: ['entities'],
  fetcher: async (variables) => {
    // Return mock data if enabled
    if (USE_MOCK_DATA) {
      await simulateNetworkDelay();
      return getMockEntities(variables);
    }

    // Real API call
    return client.get('/entities', { params: variables });
  },
});
```

3. Export mock data trong index:

```typescript
// src/api/[entity]/index.tsx
export { MOCK_ENTITIES, getMockEntities } from './mock-[entity]';
```

4. Tạo documentation:
   - `README.md`: API docs
   - `MOCK_DATA_USAGE.md`: Mock data guide

## Troubleshooting

### Mock data không hoạt động

**Check:**
1. `USE_MOCK_DATA` có = `true` không?
2. Mock data có được import đúng không?
3. Mock functions có được gọi trong fetcher không?

### API calls bị lỗi khi switch sang real API

**Check:**
1. Backend server có đang chạy không?
2. API endpoints có đúng không?
3. Authentication tokens có valid không?
4. CORS có được config đúng không?

### Network delay quá lâu/quá ngắn

**Solution:**
Điều chỉnh `MOCK_DELAY` trong `config.ts`:
```typescript
export const MOCK_DELAY = 300; // Faster
// hoặc
export const MOCK_DELAY = 1500; // Slower
```

## Environment Variables

Bạn có thể control config qua environment variables:

```bash
# .env
MOCK_API_ENABLED=true
MOCK_API_DELAY=500
```

```typescript
// src/api/common/config.ts
import { ENV } from '@/lib/env';

export const USE_MOCK_DATA = ENV.MOCK_API_ENABLED === 'true';
export const MOCK_DELAY = parseInt(ENV.MOCK_API_DELAY || '500', 10);
```

## Conclusion

Global config giúp:
- ✅ Dễ dàng switch giữa mock data và real API
- ✅ Consistent behavior across tất cả API modules
- ✅ Dễ dàng test và develop mà không cần backend
- ✅ Flexible và scalable cho future APIs

Chỉ cần thay đổi 1 config duy nhất để control toàn bộ ứng dụng!

