# Mock Data - Hướng dẫn sử dụng nhanh

## 🚀 Quick Start

### 1. Xem danh sách farms

```typescript
import { useGetFarms } from '@/api/farms';

function FarmListScreen() {
  const { data, isLoading } = useGetFarms({
    variables: {
      limit: 10,
      sortBy: 'name',
      sortOrder: 'asc',
    }
  });

  const farms = data?.pages?.flatMap(page => page.data?.farms || []) || [];
  
  return (
    <View>
      {farms.map(farm => (
        <Text key={farm.id}>{farm.name}</Text>
      ))}
    </View>
  );
}
```

### 2. Xem chi tiết farm

```typescript
import { useGetFarm } from '@/api/farms';

function FarmDetailScreen({ farmId }: { farmId: string }) {
  const { data, isLoading } = useGetFarm({
    variables: { id: farmId }
  });

  const farm = data?.data;
  
  if (!farm) return <Text>Loading...</Text>;
  
  return (
    <View>
      <Text>{farm.name}</Text>
      <Text>{farm.description}</Text>
      <Text>{farm.contactEmail}</Text>
      <Text>{farm.contactPhone}</Text>
    </View>
  );
}
```

## 🎯 Available Farm IDs

Sử dụng các ID sau để test farm profile:

| ID | Farm Name | District | Organic | Delivery |
|----|-----------|----------|---------|----------|
| `1` | Sunny Valley Organic Farm | Quận 9 | ✅ | Pickup & Delivery |
| `2` | Green Meadows Farm | Quận 2 | ❌ | Delivery Only |
| `3` | Happy Harvest Farm | Thủ Đức | ✅ | Pickup & Delivery |
| `4` | Fresh Fields Farm | Quận 1 | ❌ | Pickup Only |
| `5` | Organic Paradise | Bình Thạnh | ✅ | Pickup & Delivery |
| `6` | Nature's Best Farm | Quận 7 | ❌ | Pickup & Delivery |

## 🧪 Testing Scenarios

### Scenario 1: Navigate đến farm profile
```typescript
// Trong component
router.push('/farms/1'); // Xem Sunny Valley Organic Farm
router.push('/farms/2'); // Xem Green Meadows Farm
```

### Scenario 2: Test với farm không tồn tại
```typescript
router.push('/farms/999'); // Sẽ hiển thị "Farm Not Found"
```

### Scenario 3: Search farms
```typescript
const { data } = useGetFarms({
  variables: {
    search: 'organic', // Tìm farms có từ "organic"
    limit: 10,
  }
});
// Kết quả: farms có ID 1, 3, 5
```

### Scenario 4: Filter theo delivery method
```typescript
const { data } = useGetFarms({
  variables: {
    deliveryMethod: 'pickup', // Chỉ lấy farms có pickup
    limit: 10,
  }
});
// Kết quả: farm ID 4 (Fresh Fields Farm)
```

### Scenario 5: Filter theo location
```typescript
const { data } = useGetFarms({
  variables: {
    location: {
      latitude: 10.8231,
      longitude: 106.6297,
      radius: 10, // 10km radius
    },
    sortBy: 'distance',
    limit: 10,
  }
});
// Kết quả: farms gần nhất trước
```

## 📱 UI Testing Flow

### Flow 1: Discovery → Profile → Products
1. Mở màn hình Discover Farms (`/farms`)
2. Nhấn vào 1 farm card
3. Xem farm profile (`/farms/[id]`)
4. Nhấn "View Products"
5. Xem danh sách products của farm (`/farms/[id]/products`)

### Flow 2: Search → Profile → Contact
1. Mở màn hình Discover Farms (`/farms`)
2. Search "organic" trong search bar
3. Nhấn vào "Sunny Valley Organic Farm"
4. Xem thông tin chi tiết
5. Nhấn "Contact" để liên hệ farm

### Flow 3: Filter → Profile → Directions
1. Mở màn hình Discover Farms (`/farms`)
2. Filter theo delivery method "Pickup"
3. Nhấn vào "Fresh Fields Farm"
4. Nhấn "Get Directions" để xem chỉ đường

## 🔧 Dev Tools

### Console test trong browser/React Native debugger

```javascript
// Import functions
import { getMockFarm, getMockFarms, MOCK_FARMS } from '@/api/farms';

// Lấy tất cả farms
console.log('All farms:', MOCK_FARMS);

// Lấy 1 farm
console.log('Farm 1:', getMockFarm('1'));

// Search farms
console.log('Organic farms:', getMockFarms({
  search: 'organic',
  page: 1,
  limit: 10,
}));
```

## 💡 Tips

1. **Thay đổi mock data**: Chỉnh sửa `src/api/farms/mock-farms.ts`
2. **Bật/tắt mock mode**: Đổi `USE_MOCK_DATA` trong `use-get-farms.tsx` và `use-get-farm.tsx`
3. **Test error states**: Dùng farm ID không tồn tại (e.g., '999')
4. **Test loading states**: Mock data có delay 300-500ms để simulate API call

