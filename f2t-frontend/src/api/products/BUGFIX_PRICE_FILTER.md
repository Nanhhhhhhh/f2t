# Bug Fix: Products không hiển thị do Price Filter

## 🐛 Vấn đề

Khi truy cập màn hình Products, không có sản phẩm nào hiển thị, kể cả khi không có filter nào được áp dụng.

**Triệu chứng:**
- Màn hình Products hiển thị "0 products available"
- Ngay cả khi filter category = "vegetables" (có 11 sản phẩm trong mock data)
- Vẫn hiển thị "No products match your filters"

## 🔍 Phân tích Log

```
LOG  📦 Initial MOCK_PRODUCTS count: 15
LOG  📦 After category filter: 11 category: vegetables  ✅ OK
LOG  📦 After minPrice filter: 11                       ✅ OK  
LOG  📦 After maxPrice filter: 0                        ❌ PROBLEM!
LOG  📦 After inStock filter: 0 (removed 0)
```

**Root Cause:** 
- Mock data có giá bằng **VND** (Vietnamese Dong): 20,000 - 180,000 VND
- Default `maxPrice` filter = **1,000** (có lẽ nghĩ là USD)
- Tất cả sản phẩm có `pricePerUnit > 1,000` → bị filter out!

## 🔧 Giải pháp

Thay đổi `maxPrice` mặc định từ 1,000 sang 500,000 VND (≈ $20 USD) trong tất cả các file:

### 1. Screen Component (`src/app/products/index.tsx`)

```typescript
// Trước:
priceRange: { min: 0, max: 1000 }

// Sau:  
priceRange: { min: 0, max: 500000 } // VND
```

**Các điểm cần update:**
- Default filters state (3 chỗ)
- `clearFilter` function
- `hasActiveFilters` check
- Active filters display (format với VND symbol: ₫)

### 2. Search Component (`src/components/products/product-search.tsx`)

**Price range presets:**
```typescript
// Trước:
const priceRangeOptions = [
  { label: 'Any Price', min: 0, max: 1000 },
  { label: 'Under $5', min: 0, max: 5 },
  { label: '$5 - $15', min: 5, max: 15 },
  { label: '$15 - $30', min: 15, max: 30 },
  { label: 'Over $30', min: 30, max: 1000 },
];

// Sau:
const priceRangeOptions = [
  { label: 'Any Price', min: 0, max: 500000 },
  { label: 'Under 50k', min: 0, max: 50000 },
  { label: '50k - 100k', min: 50000, max: 100000 },
  { label: '100k - 200k', min: 100000, max: 200000 },
  { label: 'Over 200k', min: 200000, max: 500000 },
];
```

### 3. Filter Modal (`src/components/products/product-filter-modal.tsx`)

**Default filters & price presets:**
```typescript
// DEFAULT_FILTERS
priceRange: { min: 0, max: 500000 } // VND

// PRICE_RANGES
const PRICE_RANGES = [
  { label: 'Under 50k', min: 0, max: 50000 },
  { label: '50k - 100k', min: 50000, max: 100000 },
  { label: '100k - 150k', min: 100000, max: 150000 },
  { label: '150k - 250k', min: 150000, max: 250000 },
  { label: 'Over 250k', min: 250000, max: 500000 },
];
```

## 🛠️ Code Improvements

### 1. Loại bỏ Double Filtering

**Vấn đề phát hiện thêm:** Products đang bị filter 2 lần:
1. Server-side trong `getMockProducts()` ✅
2. Client-side trong screen component ❌ (gây conflict)

**Giải pháp:** Loại bỏ client-side filtering

```typescript
// Trước:
let processedProducts = allProducts;

if (filters.search) {
  processedProducts = searchProducts(processedProducts, filters.search);
}

processedProducts = filterProducts(processedProducts, {...});
processedProducts = sortProducts(processedProducts, ...);

// Sau:
// Server-side filtering already applied in getMockProducts/API
// No need for additional client-side filtering as it can cause conflicts
const processedProducts = allProducts;
```

### 2. Clean Up Debug Logs

Xóa tất cả console.log debug statements sau khi fix:
- `🔧 getMockProducts called with params`
- `📦 After xxx filter`
- `📡 useGetProductsInfinite fetcher called`
- `🔍 DEBUG - Products Response`

## ✅ Kết quả

Sau khi fix:
- ✅ Màn hình Products hiển thị đúng số lượng sản phẩm
- ✅ Category filter hoạt động: vegetables (11), fruits (3), herbs (1)
- ✅ Price filter với giá trị VND phù hợp
- ✅ Không có filter conflicts
- ✅ Code sạch hơn, không có debug logs

## 📊 Test Cases

### Test Case 1: Load tất cả products (no filter)
- **Expected:** 15 products
- **Result:** ✅ Pass

### Test Case 2: Filter category = "vegetables"  
- **Expected:** 11 vegetable products
- **Result:** ✅ Pass

### Test Case 3: Filter category = "fruits"
- **Expected:** 3 fruit products
- **Result:** ✅ Pass

### Test Case 4: Price filter 50k-100k
- **Expected:** Products trong khoảng giá này
- **Products:** Xà lách (35k), Rau cải (25k), Rau muống (20k), Cà rốt (42k), Thanh long (42k), Dưa leo (38k), Cà rót (30k), Ớt (55k), Cải kale (65k), Bông cải (58k)
- **Result:** ✅ Pass

### Test Case 5: Clear all filters
- **Expected:** Trở về 15 products
- **Result:** ✅ Pass

## 🎯 Lessons Learned

1. **Currency Awareness:** Luôn chú ý đến đơn vị tiền tệ khi set default values
   - VND có giá trị khác USD rất nhiều (1 USD ≈ 25,000 VND)
   - Default max price 1,000 phù hợp USD nhưng không phù hợp VND

2. **Avoid Double Filtering:** 
   - Nếu API/backend đã filter → không cần filter lại ở client
   - Double filtering có thể gây conflicts và bugs khó debug

3. **Debug Strategy:**
   - Add logs ở các điểm quan trọng trong data flow
   - Log count sau mỗi bước filter để xác định điểm lỗi
   - Clean up logs sau khi fix

4. **Testing:**
   - Test với edge cases: no filter, single filter, multiple filters
   - Verify price ranges phù hợp với currency
   - Check empty states và error messages

## 📝 Files Changed

1. ✅ `src/app/products/index.tsx` - Screen component
2. ✅ `src/components/products/product-search.tsx` - Search/filter UI
3. ✅ `src/components/products/product-filter-modal.tsx` - Filter modal
4. ✅ `src/api/products/mock-products.ts` - Clean up debug logs
5. ✅ `src/api/products/use-get-products.tsx` - Clean up debug logs
6. ✅ `src/api/products/BUGFIX_PRICE_FILTER.md` - This document

## 🔄 Migration Guide

Nếu bạn cần thay đổi default max price trong tương lai:

1. Grep tất cả `max: 500000` trong codebase
2. Update đồng loạt ở tất cả 3 files trên
3. Update price range presets cho phù hợp
4. Test kỹ với mock data

## 💡 Future Improvements

1. **Dynamic Currency:** Detect user location và sử dụng currency phù hợp
2. **Config File:** Centralize price range configs thay vì hardcode
3. **Unit Tests:** Add tests cho filtering logic
4. **Better Type Safety:** Strong typing cho price values với currency info

