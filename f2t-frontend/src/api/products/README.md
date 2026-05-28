# Product API - Mock Data

## Giới thiệu

File này chứa mock data cho products (sản phẩm) để phát triển và testing ứng dụng mà không cần kết nối tới API thật.

## Sử dụng Mock Data

### Bật/Tắt Mock Mode

Mock mode được bật/tắt trong 2 files:

**1. Danh sách products (`use-get-products.tsx`):**
```typescript
// Set to true to use mock data, false to use real API
const USE_MOCK_DATA = true;
```

**2. Chi tiết product (`use-get-product.tsx`):**
```typescript
// Set to true to use mock data, false to use real API
const USE_MOCK_DATA = true;
```

- Đặt `USE_MOCK_DATA = true` để sử dụng mock data
- Đặt `USE_MOCK_DATA = false` để sử dụng API thật

### Mock Data Có Sẵn

Mock data hiện tại bao gồm **15 products** với đầy đủ thông tin:

#### Rau củ (Vegetables)
1. **Cà chua bi hữu cơ** - Farm 1 (Sunny Valley) - 45,000đ/kg
2. **Xà lách xoong hữu cơ** - Farm 1 (Sunny Valley) - 35,000đ/kg
3. **Rau cải ngọt** - Farm 3 (Happy Harvest) - 25,000đ/kg
4. **Rau muống hữu cơ** - Farm 3 (Happy Harvest) - 20,000đ/kg
5. **Cà rót tím** - Farm 4 (Fresh Fields) - 30,000đ/kg
6. **Ớt hiểm** - Farm 4 (Fresh Fields) - 55,000đ/kg
7. **Dưa leo hữu cơ** - Farm 5 (Organic Paradise) - 38,000đ/kg
8. **Cải kale hữu cơ** - Farm 5 (Organic Paradise) - 65,000đ/kg
9. **Bí đỏ Nhật Bản** - Farm 6 (Nature's Best) - 32,000đ/kg
10. **Cà rốt Đà Lạt hữu cơ** - Farm 1 (Sunny Valley) - 42,000đ/kg
11. **Bông cải xanh hữu cơ** - Farm 3 (Happy Harvest) - 58,000đ/kg

#### Trái cây (Fruits)
12. **Xoài cát Hòa Lộc** - Farm 2 (Green Meadows) - 85,000đ/kg
13. **Thanh long ruột đỏ** - Farm 2 (Green Meadows) - 42,000đ/kg
14. **Dâu tây Đà Lạt hữu cơ** - Farm 5 (Organic Paradise) - 180,000đ/kg

#### Rau thơm (Herbs)
15. **Rau thơm tổng hợp** - Farm 6 (Nature's Best) - 15,000đ/bunch

### Featured Products (Sản phẩm nổi bật)

Có **6 featured products** được chọn lọc:
- Cà chua bi hữu cơ
- Xoài cát Hòa Lộc
- Cải kale hữu cơ
- Dâu tây Đà Lạt hữu cơ
- Dưa leo hữu cơ
- Bông cải xanh hữu cơ

### Tính năng Mock Data

Mock data hỗ trợ đầy đủ các tính năng:

- ✅ Pagination (phân trang)
- ✅ Search (tìm kiếm theo tên, mô tả, tags)
- ✅ Filter theo category (vegetables, fruits, herbs)
- ✅ Filter theo farmId (sản phẩm của farm cụ thể)
- ✅ Filter theo price range (khoảng giá)
- ✅ Filter theo organicOnly (chỉ hữu cơ)
- ✅ Filter theo inStock (còn hàng)
- ✅ Sort theo name, price, harvestDate, createdAt, popularity
- ✅ Featured products (sản phẩm nổi bật)

### Sử dụng trực tiếp Mock Data

Nếu bạn muốn sử dụng mock data trực tiếp trong component hoặc test:

```typescript
import { 
  MOCK_PRODUCTS, 
  getFeaturedProducts,
  getMockProducts, 
  getMockProduct 
} from '@/api/products';

// Lấy toàn bộ mock products
const allProducts = MOCK_PRODUCTS;

// Lấy featured products
const featuredProducts = getFeaturedProducts();

// Lấy danh sách products với filtering và pagination
const result = getMockProducts({
  page: 1,
  limit: 10,
  search: 'cà',
  category: 'vegetables',
  organicOnly: true,
  minPrice: 20000,
  maxPrice: 50000,
  sortBy: 'price',
  sortOrder: 'asc',
});

// Lấy chi tiết 1 product theo ID
const productDetail = getMockProduct('prod-1'); // Returns Cà chua bi hữu cơ
```

## Product IDs Reference

Sử dụng các ID sau để test product detail:

| ID | Product Name | Farm | Category | Price | Organic |
|----|-------------|------|----------|-------|---------|
| `prod-1` | Cà chua bi hữu cơ | Sunny Valley | vegetables | 45,000đ | ✅ |
| `prod-2` | Xà lách xoong hữu cơ | Sunny Valley | vegetables | 35,000đ | ✅ |
| `prod-3` | Xoài cát Hòa Lộc | Green Meadows | fruits | 85,000đ | ❌ |
| `prod-4` | Thanh long ruột đỏ | Green Meadows | fruits | 42,000đ | ❌ |
| `prod-5` | Rau cải ngọt | Happy Harvest | vegetables | 25,000đ | ✅ |
| `prod-6` | Rau muống hữu cơ | Happy Harvest | vegetables | 20,000đ | ✅ |
| `prod-7` | Cà rót tím | Fresh Fields | vegetables | 30,000đ | ❌ |
| `prod-8` | Ớt hiểm | Fresh Fields | vegetables | 55,000đ | ❌ |
| `prod-9` | Dưa leo hữu cơ | Organic Paradise | vegetables | 38,000đ | ✅ |
| `prod-10` | Cải kale hữu cơ | Organic Paradise | vegetables | 65,000đ | ✅ |
| `prod-11` | Bí đỏ Nhật Bản | Nature's Best | vegetables | 32,000đ | ❌ |
| `prod-12` | Rau thơm tổng hợp | Nature's Best | herbs | 15,000đ | ❌ |
| `prod-13` | Cà rốt Đà Lạt hữu cơ | Sunny Valley | vegetables | 42,000đ | ✅ |
| `prod-14` | Bông cải xanh hữu cơ | Happy Harvest | vegetables | 58,000đ | ✅ |
| `prod-15` | Dâu tây Đà Lạt hữu cơ | Organic Paradise | fruits | 180,000đ | ✅ |

## Testing Scenarios

### Scenario 1: Xem featured products
```typescript
import { getFeaturedProducts } from '@/api/products';

const featured = getFeaturedProducts();
// Returns 6 featured products
```

### Scenario 2: Filter sản phẩm hữu cơ
```typescript
const { data } = useGetProducts({
  variables: {
    organicOnly: true,
    limit: 10,
  }
});
// Kết quả: 9 organic products
```

### Scenario 3: Filter theo farm
```typescript
const { data } = useGetProducts({
  variables: {
    farmId: '1', // Sunny Valley Organic Farm
    limit: 10,
  }
});
// Kết quả: 3 products từ Sunny Valley
```

### Scenario 4: Search products
```typescript
const { data } = useGetProducts({
  variables: {
    search: 'hữu cơ',
    limit: 10,
  }
});
// Kết quả: tất cả products có từ "hữu cơ"
```

### Scenario 5: Filter theo price range
```typescript
const { data } = useGetProducts({
  variables: {
    minPrice: 30000,
    maxPrice: 60000,
    sortBy: 'price',
    sortOrder: 'asc',
    limit: 10,
  }
});
// Kết quả: products trong khoảng giá 30k-60k
```

### Scenario 6: Filter theo category
```typescript
const { data } = useGetProducts({
  variables: {
    category: 'fruits',
    limit: 10,
  }
});
// Kết quả: 3 fruit products
```

## Xem Product Detail

Để xem chi tiết product, navigate đến `/products/[id]`:

```typescript
// Ví dụ trong component
router.push('/products/prod-1'); // Xem Cà chua bi hữu cơ
router.push('/products/prod-3'); // Xem Xoài cát Hòa Lộc
router.push('/products/prod-15'); // Xem Dâu tây Đà Lạt
```

## Thêm Mock Data

Để thêm product mới vào mock data, chỉnh sửa file `mock-products.ts` và thêm object mới vào array `MOCK_PRODUCTS`:

```typescript
{
  id: 'prod-16',
  farmId: '1',
  name: 'Tên sản phẩm',
  description: 'Mô tả chi tiết...',
  category: 'vegetables',
  pricePerUnit: 50000,
  unit: 'kg',
  // ... các fields khác
}
```

## Lưu ý

- Mock data cho danh sách products simulate network delay 400ms
- Mock data cho chi tiết product simulate network delay 300ms
- Tất cả giá tiền theo đơn vị VNĐ
- Images sử dụng Unsplash placeholder URLs
- Khi chuyển sang production, nhớ đặt `USE_MOCK_DATA = false` trong cả 2 files để sử dụng API thật
- Mock data được lưu trong memory nên sẽ reset mỗi khi reload app

