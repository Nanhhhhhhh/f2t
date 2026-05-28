# Farm API - Mock Data

## Giới thiệu

File này chứa mock data cho farms để phát triển và testing ứng dụng mà không cần kết nối tới API thật.

## Sử dụng Mock Data

### Bật/Tắt Mock Mode

Mock mode được bật/tắt trong 2 files:

**1. Danh sách farms (`use-get-farms.tsx`):**
```typescript
// Set to true to use mock data, false to use real API
const USE_MOCK_DATA = true;
```

**2. Chi tiết farm (`use-get-farm.tsx`):**
```typescript
// Set to true to use mock data, false to use real API
const USE_MOCK_DATA = true;
```

- Đặt `USE_MOCK_DATA = true` để sử dụng mock data
- Đặt `USE_MOCK_DATA = false` để sử dụng API thật

### Mock Data Có Sẵn

Mock data hiện tại bao gồm **6 farms** với đầy đủ thông tin:

1. **Sunny Valley Organic Farm** (Quận 9) - Rau hữu cơ
2. **Green Meadows Farm** (Quận 2) - Trái cây nhiệt đới
3. **Happy Harvest Farm** (Thủ Đức) - Rau xanh sạch
4. **Fresh Fields Farm** (Quận 1) - Rau củ VietGAP
5. **Organic Paradise** (Bình Thạnh) - Rau hữu cơ cao cấp
6. **Nature's Best Farm** (Quận 7) - Rau củ theo mùa

### Tính năng Mock Data

Mock data hỗ trợ đầy đủ các tính năng:

- ✅ Pagination (phân trang)
- ✅ Search (tìm kiếm theo tên, mô tả, địa chỉ)
- ✅ Filter theo delivery method (pickup/delivery/both)
- ✅ Filter theo location và radius (khoảng cách)
- ✅ Sort theo name, createdAt, hoặc distance
- ✅ Filter theo active status

### Sử dụng trực tiếp Mock Data

Nếu bạn muốn sử dụng mock data trực tiếp trong component hoặc test:

```typescript
import { MOCK_FARMS, getMockFarms, getMockFarm } from '@/api/farms';

// Sử dụng toàn bộ mock farms
const allFarms = MOCK_FARMS;

// Lấy danh sách farms với filtering và pagination
const result = getMockFarms({
  page: 1,
  limit: 10,
  search: 'organic',
  deliveryMethod: 'both',
  location: {
    latitude: 10.8231,
    longitude: 106.6297,
    radius: 20,
  },
  sortBy: 'distance',
  sortOrder: 'asc',
});

// Lấy chi tiết 1 farm theo ID
const farmDetail = getMockFarm('1'); // Returns Sunny Valley Organic Farm
```

## Thêm Mock Data

Để thêm farm mới vào mock data, chỉnh sửa file `mock-farms.ts` và thêm object mới vào array `MOCK_FARMS`:

```typescript
{
  id: '7',
  ownerId: 'owner-7',
  name: 'Your Farm Name',
  description: 'Farm description...',
  // ... các fields khác
}
```

## Xem Farm Profile

Để xem chi tiết farm profile, bạn có thể sử dụng các farm ID sau:

- `1` - Sunny Valley Organic Farm
- `2` - Green Meadows Farm
- `3` - Happy Harvest Farm
- `4` - Fresh Fields Farm
- `5` - Organic Paradise
- `6` - Nature's Best Farm

Ví dụ trong app: Navigate đến `/farms/1` để xem Sunny Valley Organic Farm.

## Lưu ý

- Mock data cho danh sách farms simulate network delay 500ms
- Mock data cho chi tiết farm simulate network delay 300ms
- Khi chuyển sang production, nhớ đặt `USE_MOCK_DATA = false` trong cả 2 files để sử dụng API thật
- Mock data được lưu trong memory nên sẽ reset mỗi khi reload app

