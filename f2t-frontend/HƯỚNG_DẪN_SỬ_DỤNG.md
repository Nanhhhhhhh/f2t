# Hướng Dẫn Sử Dụng Mock Data

## 🎯 Tóm tắt

Đã tạo mock data cho orders và cấu hình global `USE_MOCK_DATA` để điều khiển tất cả API modules trong ứng dụng.

## 🚀 Bật/Tắt Mock Data

### Cách bật Mock Data (Development)

Mở file `src/api/common/config.ts` và set:

```typescript
export const USE_MOCK_DATA = true;
```

**Kết quả:** Tất cả API (orders, products, farms) sẽ sử dụng mock data.

### Cách tắt Mock Data (Production)

Mở file `src/api/common/config.ts` và set:

```typescript
export const USE_MOCK_DATA = false;
```

**Kết quả:** Tất cả API sẽ gọi đến real backend.

## 📦 Mock Data có sẵn

### Orders (8 đơn hàng mẫu)
- 1 đơn đã giao (delivered) 
- 1 đơn đang giao (out_for_delivery)
- 1 đơn đang chuẩn bị (preparing)
- 1 đơn đã xác nhận (confirmed)
- 1 đơn chờ xác nhận (pending)
- 1 đơn đã hủy (cancelled)
- 1 đơn sẵn sàng lấy (ready_for_pickup)
- 1 đơn đã giao (delivered - historical)

### Products (30+ sản phẩm)
- Rau củ hữu cơ
- Trái cây tươi
- Từ nhiều farms khác nhau

### Farms (6 trang trại)
- Ở các vị trí khác nhau tại TP.HCM
- Có certifications và delivery zones

## 🧪 Test Mock Data

### Test 1: Xem Orders từ Profile

1. Run app: `npm start`
2. Vào tab **Profile**
3. Click **"View Orders"** trong Quick Actions
4. ✅ Sẽ thấy 8 orders với các trạng thái khác nhau

### Test 2: Filter Orders

1. Vào Orders screen
2. Thử các filters: All, Pending, Confirmed, Preparing, Shipping, Delivered, Cancelled
3. ✅ Sẽ thấy orders được filter đúng

### Test 3: Search Orders

1. Nhập search query (vd: "xoài", "rau")
2. ✅ Sẽ thấy results được filter theo search

### Test 4: Sort Orders

1. Click nút sort (arrow up/down)
2. ✅ Orders sẽ sort theo thứ tự ascending/descending

## ⚙️ Tùy chỉnh Network Delay

Trong `src/api/common/config.ts`:

```typescript
// Mạng nhanh
export const MOCK_DELAY = 100;

// Mạng trung bình (mặc định)
export const MOCK_DELAY = 500;

// Mạng chậm
export const MOCK_DELAY = 2000;
```

## 📊 Thống kê Mock Data

### Orders
- **Total:** 8 orders
- **Pending:** 1
- **Confirmed:** 1  
- **Preparing:** 1
- **Out for Delivery:** 1
- **Delivered:** 2
- **Cancelled:** 1
- **Ready for Pickup:** 1

### Payment Methods
- Credit Card (4 orders)
- Digital Wallet (2 orders)
- Bank Transfer (1 order)
- Cash on Delivery (2 orders)

### Delivery Methods
- Delivery (7 orders)
- Pickup (1 order)

## 🔧 APIs có Mock Data

✅ **Orders API**
- `useGetOrders()` - Danh sách orders
- `useGetOrdersInfinite()` - Infinite scroll
- `useGetOrder(id)` - Chi tiết order

✅ **Products API**
- `useGetProducts()` - Danh sách products
- `useGetProductsInfinite()` - Infinite scroll
- `useGetProduct(id)` - Chi tiết product

✅ **Farms API**
- `useGetFarms()` - Danh sách farms
- `useGetFarm(id)` - Chi tiết farm

## 📚 Documentation

### Chi tiết hơn, xem:

1. **`src/api/common/CONFIG_GUIDE.md`**
   - Hướng dẫn đầy đủ về global config
   - Migration guide
   - Best practices

2. **`src/api/orders/README.md`**
   - API documentation
   - Available hooks
   - Examples

3. **`src/api/orders/MOCK_DATA_USAGE.md`**
   - Chi tiết mock data structure
   - Usage examples
   - Testing strategies

4. **`CHANGES_SUMMARY.md`**
   - Tóm tắt tất cả thay đổi
   - File structure
   - Migration guide

## ❓ Troubleshooting

### Mock data không hiển thị?

**Kiểm tra:**
1. File `src/api/common/config.ts` có `USE_MOCK_DATA = true`?
2. Đã restart app chưa?
3. Console có error gì không?

### Muốn thêm mock data mới?

Xem hướng dẫn trong `src/api/common/CONFIG_GUIDE.md` section "Migration cho APIs khác"

### Switch sang Real API?

1. Set `USE_MOCK_DATA = false` trong `src/api/common/config.ts`
2. Đảm bảo backend server đang chạy
3. Restart app

## ✨ Features

- ✅ Single config để control tất cả APIs
- ✅ Realistic mock data với full details
- ✅ Network delay simulation
- ✅ Support filters, sorting, search
- ✅ No backend dependency cho development
- ✅ Easy to switch giữa mock và real API

## 🎉 Ready to Use!

Mock data đã sẵn sàng! Chỉ cần:

1. Ensure `USE_MOCK_DATA = true` trong `src/api/common/config.ts`
2. Run app: `npm start`
3. Navigate to Profile → View Orders
4. Enjoy testing! 🚀

---

**Note:** Khi deploy production, nhớ set `USE_MOCK_DATA = false`!

