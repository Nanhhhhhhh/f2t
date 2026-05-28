import type { Product } from '@/types';

// Mock data cho products
export const MOCK_PRODUCTS: Product[] = [
  // Products from Farm 1: Sunny Valley Organic Farm
  {
    id: 'prod-1',
    farmId: '1',
    name: 'Cà chua bi hữu cơ',
    description:
      'Cà chua bi tươi ngon, ngọt tự nhiên, trồng hoàn toàn hữu cơ. Phù hợp cho salad và ăn tươi.',
    category: 'vegetables',
    subcategory: 'tomatoes',
    pricePerUnit: 45000,
    unit: 'kg',
    availableQuantity: 150,
    minimumOrder: 1,
    status: 'available',
    images: [
      'https://images.unsplash.com/photo-1546470427-e26264d6d8b0?w=400',
      'https://images.unsplash.com/photo-1546470427-e26264d6d8b0?w=800',
    ],
    harvestDate: '2025-10-24T06:00:00Z',
    deliveryDate: '2025-10-25T08:00:00Z',
    estimatedShelfLife: 7,
    isOrganic: true,
    farmingMethods: ['organic', 'natural_pesticide'],
    qualityGrade: 'premium',
    freshnessLevel: 'same_day',
    seasonalAvailability: ['spring', 'summer', 'fall'],
    storageRequirements: 'room_temperature',
    packagingType: 'loose',
    tags: ['organic', 'fresh', 'local', 'pesticide_free'],
    nutritionalInfo: {
      calories: 18,
      protein: 0.9,
      carbs: 3.9,
      fat: 0.2,
      fiber: 1.2,
      vitamins: ['Vitamin C', 'Vitamin A', 'Vitamin K'],
    },
    storageInstructions: 'Bảo quản ở nhiệt độ phòng, tránh ánh nắng trực tiếp',
    allergenInfo: [],
    certifications: [
      {
        type: 'organic',
        certifyingBody: 'Vietnam Organic',
        certificateNumber: 'VO-2024-001-P1',
        validUntil: '2025-12-31',
      },
    ],
    createdAt: '2024-10-15T08:00:00Z',
    updatedAt: '2024-10-24T06:00:00Z',
  },
  {
    id: 'prod-2',
    farmId: '1',
    name: 'Xà lách xoong hữu cơ',
    description:
      'Xà lách xoong tươi mới, giòn ngọt, giàu vitamin. Lý tưởng cho salad và sandwich.',
    category: 'vegetables',
    subcategory: 'leafy_greens',
    pricePerUnit: 35000,
    unit: 'kg',
    availableQuantity: 80,
    minimumOrder: 1,
    status: 'available',
    images: [
      'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400',
    ],
    harvestDate: '2025-10-25T05:00:00Z',
    deliveryDate: '2025-10-25T08:00:00Z',
    estimatedShelfLife: 5,
    isOrganic: true,
    farmingMethods: ['organic', 'hydroponic'],
    qualityGrade: 'premium',
    freshnessLevel: 'same_day',
    seasonalAvailability: ['year_round'],
    storageRequirements: 'refrigerated',
    packagingType: 'bagged',
    tags: ['organic', 'fresh', 'leafy_greens', 'hydroponic'],
    nutritionalInfo: {
      calories: 15,
      protein: 1.4,
      carbs: 2.9,
      fat: 0.2,
      fiber: 1.3,
      vitamins: ['Vitamin A', 'Vitamin K', 'Folate'],
    },
    storageInstructions: 'Bảo quản trong ngăn mát tủ lạnh (0-4°C)',
    allergenInfo: [],
    certifications: [
      {
        type: 'organic',
        certifyingBody: 'Vietnam Organic',
        certificateNumber: 'VO-2024-001-P2',
        validUntil: '2025-12-31',
      },
    ],
    createdAt: '2024-10-10T08:00:00Z',
    updatedAt: '2024-10-25T05:00:00Z',
  },

  // Products from Farm 2: Green Meadows Farm
  {
    id: 'prod-3',
    farmId: '2',
    name: 'Xoài cát Hòa Lộc',
    description:
      'Xoài cát Hòa Lộc ngọt đậm, thơm nức mũi, múi mềm. Sản phẩm đặc sản của vùng Tiền Giang.',
    category: 'fruits',
    subcategory: 'tropical',
    pricePerUnit: 85000,
    unit: 'kg',
    availableQuantity: 200,
    minimumOrder: 1,
    status: 'available',
    images: [
      'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=400',
    ],
    harvestDate: '2025-10-23T06:00:00Z',
    deliveryDate: '2025-10-25T10:00:00Z',
    estimatedShelfLife: 10,
    isOrganic: false,
    farmingMethods: ['conventional', 'vietgap'],
    qualityGrade: 'premium',
    freshnessLevel: 'next_day',
    seasonalAvailability: ['spring', 'summer'],
    storageRequirements: 'room_temperature',
    packagingType: 'boxed',
    tags: ['fresh', 'tropical', 'sweet', 'vietnamese_specialty'],
    nutritionalInfo: {
      calories: 60,
      protein: 0.8,
      carbs: 15,
      fat: 0.4,
      fiber: 1.6,
      vitamins: ['Vitamin C', 'Vitamin A', 'Vitamin E'],
    },
    storageInstructions:
      'Bảo quản nơi khô ráo, thoáng mát. Cho vào tủ lạnh khi chín',
    allergenInfo: [],
    certifications: [],
    createdAt: '2024-10-01T09:00:00Z',
    updatedAt: '2024-10-23T06:00:00Z',
  },
  {
    id: 'prod-4',
    farmId: '2',
    name: 'Thanh long ruột đỏ',
    description:
      'Thanh long ruột đỏ tươi ngon, ngọt mát, giàu chất chống oxi hóa. Trái to, đều.',
    category: 'fruits',
    subcategory: 'tropical',
    pricePerUnit: 42000,
    unit: 'kg',
    availableQuantity: 300,
    minimumOrder: 1,
    status: 'available',
    images: [
      'https://images.unsplash.com/photo-1617112848923-cc2234396691?w=400',
    ],
    harvestDate: '2025-10-24T07:00:00Z',
    deliveryDate: '2025-10-25T10:00:00Z',
    estimatedShelfLife: 12,
    isOrganic: false,
    farmingMethods: ['conventional'],
    qualityGrade: 'standard',
    freshnessLevel: 'next_day',
    seasonalAvailability: ['year_round'],
    storageRequirements: 'room_temperature',
    packagingType: 'loose',
    tags: ['fresh', 'tropical', 'antioxidant'],
    nutritionalInfo: {
      calories: 60,
      protein: 1.2,
      carbs: 13,
      fat: 0.4,
      fiber: 3,
      vitamins: ['Vitamin C', 'Iron'],
    },
    storageInstructions: 'Bảo quản ở nhiệt độ phòng, tránh ánh nắng',
    allergenInfo: [],
    certifications: [],
    createdAt: '2024-09-15T09:00:00Z',
    updatedAt: '2024-10-24T07:00:00Z',
  },

  // Products from Farm 3: Happy Harvest Farm
  {
    id: 'prod-5',
    farmId: '3',
    name: 'Rau cải ngọt',
    description:
      'Rau cải ngọt tươi non, giòn ngọt, không thuốc trừ sâu. Thu hoạch mỗi ngày.',
    category: 'vegetables',
    subcategory: 'leafy_greens',
    pricePerUnit: 25000,
    unit: 'kg',
    availableQuantity: 100,
    minimumOrder: 1,
    status: 'available',
    images: [
      'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400',
    ],
    harvestDate: '2025-10-25T05:30:00Z',
    deliveryDate: '2025-10-25T08:00:00Z',
    estimatedShelfLife: 4,
    isOrganic: true,
    farmingMethods: ['organic', 'natural_pesticide'],
    qualityGrade: 'premium',
    freshnessLevel: 'same_day',
    seasonalAvailability: ['year_round'],
    storageRequirements: 'refrigerated',
    packagingType: 'bunch',
    tags: ['organic', 'fresh', 'leafy_greens', 'daily_harvest'],
    nutritionalInfo: {
      calories: 13,
      protein: 1.5,
      carbs: 2.2,
      fat: 0.2,
      fiber: 1,
      vitamins: ['Vitamin A', 'Vitamin C', 'Calcium'],
    },
    storageInstructions:
      'Ngâm chân rau trong nước hoặc bảo quản trong túi kín ở ngăn mát tủ lạnh',
    allergenInfo: [],
    certifications: [
      {
        type: 'organic',
        certifyingBody: 'GlobalGAP Vietnam',
        certificateNumber: 'GG-2024-003-P1',
        validUntil: '2025-06-30',
      },
    ],
    createdAt: '2024-10-20T07:00:00Z',
    updatedAt: '2024-10-25T05:30:00Z',
  },
  {
    id: 'prod-6',
    farmId: '3',
    name: 'Rau muống hữu cơ',
    description:
      'Rau muống tươi giòn, bổ dưỡng, trồng theo tiêu chuẩn hữu cơ. Lá xanh đậm, thân giòn.',
    category: 'vegetables',
    subcategory: 'leafy_greens',
    pricePerUnit: 20000,
    unit: 'kg',
    availableQuantity: 120,
    minimumOrder: 1,
    status: 'available',
    images: [
      'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400',
    ],
    harvestDate: '2025-10-25T06:00:00Z',
    deliveryDate: '2025-10-25T09:00:00Z',
    estimatedShelfLife: 3,
    isOrganic: true,
    farmingMethods: ['organic', 'water_spinach'],
    qualityGrade: 'standard',
    freshnessLevel: 'same_day',
    seasonalAvailability: ['year_round'],
    storageRequirements: 'refrigerated',
    packagingType: 'bunch',
    tags: ['organic', 'fresh', 'leafy_greens', 'vietnamese_favorite'],
    nutritionalInfo: {
      calories: 19,
      protein: 2.6,
      carbs: 3.1,
      fat: 0.2,
      fiber: 2.1,
      vitamins: ['Vitamin A', 'Vitamin C', 'Iron'],
    },
    storageInstructions: 'Ngâm trong nước hoặc bảo quản trong ngăn mát tủ lạnh',
    allergenInfo: [],
    certifications: [
      {
        type: 'organic',
        certifyingBody: 'GlobalGAP Vietnam',
        certificateNumber: 'GG-2024-003-P2',
        validUntil: '2025-06-30',
      },
    ],
    createdAt: '2024-10-18T07:00:00Z',
    updatedAt: '2024-10-25T06:00:00Z',
  },

  // Products from Farm 4: Fresh Fields Farm
  {
    id: 'prod-7',
    farmId: '4',
    name: 'Cà rót tím',
    description:
      'Cà rót tím tươi, mềm mịn, phù hợp cho nhiều món ăn. Trồng theo tiêu chuẩn VietGAP.',
    category: 'vegetables',
    subcategory: 'eggplants',
    pricePerUnit: 30000,
    unit: 'kg',
    availableQuantity: 90,
    minimumOrder: 1,
    status: 'available',
    images: [
      'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400',
    ],
    harvestDate: '2025-10-24T06:00:00Z',
    deliveryDate: '2025-10-25T10:00:00Z',
    estimatedShelfLife: 8,
    isOrganic: false,
    farmingMethods: ['vietgap', 'integrated_pest_management'],
    qualityGrade: 'standard',
    freshnessLevel: 'next_day',
    seasonalAvailability: ['year_round'],
    storageRequirements: 'room_temperature',
    packagingType: 'bag',
    tags: ['fresh', 'vietgap', 'versatile'],
    nutritionalInfo: {
      calories: 25,
      protein: 1,
      carbs: 6,
      fat: 0.2,
      fiber: 3,
      vitamins: ['Vitamin C', 'Vitamin K', 'Folate'],
    },
    storageInstructions: 'Bảo quản ở nhiệt độ phòng, tránh ẩm ướt',
    allergenInfo: [],
    certifications: [],
    createdAt: '2024-10-12T08:00:00Z',
    updatedAt: '2024-10-24T06:00:00Z',
  },
  {
    id: 'prod-8',
    farmId: '4',
    name: 'Ớt hiểm',
    description:
      'Ớt hiểm cay nồng, thơm đặc trưng, dùng làm gia vị hoặc chế biến tương ớt.',
    category: 'vegetables',
    subcategory: 'peppers',
    pricePerUnit: 55000,
    unit: 'kg',
    availableQuantity: 40,
    minimumOrder: 1,
    status: 'available',
    images: [
      'https://images.unsplash.com/photo-1583137890898-c7b500638fab?w=400',
    ],
    harvestDate: '2025-10-23T07:00:00Z',
    deliveryDate: '2025-10-25T10:00:00Z',
    estimatedShelfLife: 10,
    isOrganic: false,
    farmingMethods: ['vietgap'],
    qualityGrade: 'premium',
    freshnessLevel: 'next_day',
    seasonalAvailability: ['year_round'],
    storageRequirements: 'refrigerated',
    packagingType: 'bag',
    tags: ['fresh', 'spicy', 'vietnamese_cuisine'],
    nutritionalInfo: {
      calories: 40,
      protein: 2,
      carbs: 9,
      fat: 0.4,
      fiber: 1.5,
      vitamins: ['Vitamin C', 'Vitamin A', 'Capsaicin'],
    },
    storageInstructions: 'Bảo quản trong túi kín ở ngăn mát tủ lạnh',
    allergenInfo: [],
    certifications: [],
    createdAt: '2024-10-08T08:00:00Z',
    updatedAt: '2024-10-23T07:00:00Z',
  },

  // Products from Farm 5: Organic Paradise
  {
    id: 'prod-9',
    farmId: '5',
    name: 'Dưa leo hữu cơ',
    description:
      'Dưa leo hữu cơ giòn ngọt, mát lạnh, không hóa chất. Lý tưởng cho salad và làm đẹp.',
    category: 'vegetables',
    subcategory: 'cucumbers',
    pricePerUnit: 38000,
    unit: 'kg',
    availableQuantity: 70,
    minimumOrder: 1,
    status: 'available',
    images: [
      'https://images.unsplash.com/photo-1589927986089-35812388d1f4?w=400',
    ],
    harvestDate: '2025-10-24T06:30:00Z',
    deliveryDate: '2025-10-25T09:00:00Z',
    estimatedShelfLife: 7,
    isOrganic: true,
    farmingMethods: ['organic', 'usda_certified'],
    qualityGrade: 'premium',
    freshnessLevel: 'same_day',
    seasonalAvailability: ['spring', 'summer', 'fall'],
    storageRequirements: 'refrigerated',
    packagingType: 'loose',
    tags: ['organic', 'fresh', 'hydrating', 'usda_certified'],
    nutritionalInfo: {
      calories: 16,
      protein: 0.7,
      carbs: 3.6,
      fat: 0.1,
      fiber: 0.5,
      vitamins: ['Vitamin K', 'Vitamin C', 'Potassium'],
    },
    storageInstructions: 'Bảo quản trong ngăn mát tủ lạnh, tránh đông lạnh',
    allergenInfo: [],
    certifications: [
      {
        type: 'organic',
        certifyingBody: 'USDA Organic',
        certificateNumber: 'USDA-2024-005-P1',
        validUntil: '2026-03-31',
      },
    ],
    createdAt: '2024-10-16T08:00:00Z',
    updatedAt: '2024-10-24T06:30:00Z',
  },
  {
    id: 'prod-10',
    farmId: '5',
    name: 'Cải kale hữu cơ',
    description:
      'Cải kale siêu thực phẩm, giàu dinh dưỡng, trồng hoàn toàn hữu cơ. Lý tưởng cho sinh tố và salad.',
    category: 'vegetables',
    subcategory: 'leafy_greens',
    pricePerUnit: 65000,
    unit: 'kg',
    availableQuantity: 50,
    minimumOrder: 1,
    status: 'available',
    images: [
      'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=400',
    ],
    harvestDate: '2025-10-25T05:00:00Z',
    deliveryDate: '2025-10-25T08:00:00Z',
    estimatedShelfLife: 6,
    isOrganic: true,
    farmingMethods: ['organic', 'superfood', 'usda_certified'],
    qualityGrade: 'premium',
    freshnessLevel: 'same_day',
    seasonalAvailability: ['fall', 'winter', 'spring'],
    storageRequirements: 'refrigerated',
    packagingType: 'bunch',
    tags: ['organic', 'superfood', 'nutrient_dense', 'usda_certified'],
    nutritionalInfo: {
      calories: 49,
      protein: 4.3,
      carbs: 8.8,
      fat: 0.9,
      fiber: 3.6,
      vitamins: ['Vitamin A', 'Vitamin C', 'Vitamin K', 'Calcium', 'Iron'],
    },
    storageInstructions: 'Bảo quản trong túi kín ở ngăn mát tủ lạnh',
    allergenInfo: [],
    certifications: [
      {
        type: 'organic',
        certifyingBody: 'USDA Organic',
        certificateNumber: 'USDA-2024-005-P2',
        validUntil: '2026-03-31',
      },
    ],
    createdAt: '2024-10-14T08:00:00Z',
    updatedAt: '2024-10-25T05:00:00Z',
  },

  // Products from Farm 6: Nature's Best Farm
  {
    id: 'prod-11',
    farmId: '6',
    name: 'Bí đỏ Nhật Bản',
    description:
      'Bí đỏ Nhật Bản ngọt bùi, thịt dày, giàu vitamin A. Phù hợp làm súp, bánh và nhiều món khác.',
    category: 'vegetables',
    subcategory: 'squash',
    pricePerUnit: 32000,
    unit: 'kg',
    availableQuantity: 180,
    minimumOrder: 1,
    status: 'available',
    images: [
      'https://images.unsplash.com/photo-1570586437263-ab629fccc818?w=400',
    ],
    harvestDate: '2025-10-20T07:00:00Z',
    deliveryDate: '2025-10-26T10:00:00Z',
    estimatedShelfLife: 30,
    isOrganic: false,
    farmingMethods: ['conventional', 'traditional'],
    qualityGrade: 'premium',
    freshnessLevel: 'within_week',
    seasonalAvailability: ['fall', 'winter'],
    storageRequirements: 'room_temperature',
    packagingType: 'loose',
    tags: ['fresh', 'seasonal', 'versatile', 'japanese_variety'],
    nutritionalInfo: {
      calories: 26,
      protein: 1,
      carbs: 6.5,
      fat: 0.1,
      fiber: 0.5,
      vitamins: ['Vitamin A', 'Vitamin C', 'Potassium'],
    },
    storageInstructions:
      'Bảo quản nơi khô ráo, thoáng mát, tránh ánh nắng trực tiếp',
    allergenInfo: [],
    certifications: [],
    createdAt: '2024-10-05T08:00:00Z',
    updatedAt: '2024-10-20T07:00:00Z',
  },
  {
    id: 'prod-12',
    farmId: '6',
    name: 'Rau thơm tổng hợp',
    description:
      'Combo rau thơm đa dạng: húng quế, rau mùi, ngò gai, húng lủi. Tươi mới mỗi ngày.',
    category: 'herbs',
    subcategory: 'mixed_herbs',
    pricePerUnit: 15000,
    unit: 'bunch',
    availableQuantity: 60,
    minimumOrder: 1,
    status: 'available',
    images: [
      'https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=400',
    ],
    harvestDate: '2025-10-25T06:00:00Z',
    deliveryDate: '2025-10-25T09:00:00Z',
    estimatedShelfLife: 4,
    isOrganic: false,
    farmingMethods: ['conventional', 'natural'],
    qualityGrade: 'standard',
    freshnessLevel: 'same_day',
    seasonalAvailability: ['year_round'],
    storageRequirements: 'refrigerated',
    packagingType: 'bunch',
    tags: ['fresh', 'herbs', 'aromatic', 'vietnamese_cuisine'],
    nutritionalInfo: {
      calories: 23,
      protein: 2.3,
      carbs: 3.7,
      fat: 0.5,
      fiber: 2,
      vitamins: ['Vitamin A', 'Vitamin C', 'Iron'],
    },
    storageInstructions:
      'Ngâm chân rau trong nước hoặc bọc ẩm trong ngăn mát tủ lạnh',
    allergenInfo: [],
    certifications: [],
    createdAt: '2024-10-22T08:00:00Z',
    updatedAt: '2024-10-25T06:00:00Z',
  },

  // Additional Featured Products
  {
    id: 'prod-13',
    farmId: '1',
    name: 'Cà rốt Đà Lạt hữu cơ',
    description:
      'Cà rốt Đà Lạt hữu cơ ngọt tự nhiên, giòn, giàu beta-carotene. Trái to đều, màu cam đậm.',
    category: 'vegetables',
    subcategory: 'root_vegetables',
    pricePerUnit: 42000,
    unit: 'kg',
    availableQuantity: 110,
    minimumOrder: 1,
    status: 'available',
    images: [
      'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400',
    ],
    harvestDate: '2025-10-23T06:00:00Z',
    deliveryDate: '2025-10-25T08:00:00Z',
    estimatedShelfLife: 14,
    isOrganic: true,
    farmingMethods: ['organic', 'highland'],
    qualityGrade: 'premium',
    freshnessLevel: 'next_day',
    seasonalAvailability: ['year_round'],
    storageRequirements: 'refrigerated',
    packagingType: 'bag',
    tags: ['organic', 'fresh', 'dalat_specialty', 'beta_carotene'],
    nutritionalInfo: {
      calories: 41,
      protein: 0.9,
      carbs: 9.6,
      fat: 0.2,
      fiber: 2.8,
      vitamins: ['Vitamin A', 'Vitamin K', 'Potassium'],
    },
    storageInstructions:
      'Bảo quản trong ngăn mát tủ lạnh, có thể cất trong túi nhựa',
    allergenInfo: [],
    certifications: [
      {
        type: 'organic',
        certifyingBody: 'Vietnam Organic',
        certificateNumber: 'VO-2024-001-P3',
        validUntil: '2025-12-31',
      },
    ],
    createdAt: '2024-10-08T08:00:00Z',
    updatedAt: '2024-10-23T06:00:00Z',
  },
  {
    id: 'prod-14',
    farmId: '3',
    name: 'Bông cải xanh hữu cơ',
    description:
      'Bông cải xanh hữu cơ tươi non, giàu chất chống oxy hóa và vitamin. Siêu thực phẩm cho sức khỏe.',
    category: 'vegetables',
    subcategory: 'cruciferous',
    pricePerUnit: 58000,
    unit: 'kg',
    availableQuantity: 65,
    minimumOrder: 1,
    status: 'available',
    images: [
      'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=400',
    ],
    harvestDate: '2025-10-24T06:00:00Z',
    deliveryDate: '2025-10-25T08:00:00Z',
    estimatedShelfLife: 7,
    isOrganic: true,
    farmingMethods: ['organic', 'superfood'],
    qualityGrade: 'premium',
    freshnessLevel: 'same_day',
    seasonalAvailability: ['fall', 'winter', 'spring'],
    storageRequirements: 'refrigerated',
    packagingType: 'loose',
    tags: ['organic', 'superfood', 'nutrient_dense', 'antioxidant'],
    nutritionalInfo: {
      calories: 34,
      protein: 2.8,
      carbs: 6.6,
      fat: 0.4,
      fiber: 2.6,
      vitamins: ['Vitamin C', 'Vitamin K', 'Folate', 'Iron'],
    },
    storageInstructions: 'Bảo quản trong túi thủng lỗ ở ngăn mát tủ lạnh',
    allergenInfo: [],
    certifications: [
      {
        type: 'organic',
        certifyingBody: 'GlobalGAP Vietnam',
        certificateNumber: 'GG-2024-003-P3',
        validUntil: '2025-06-30',
      },
    ],
    createdAt: '2024-10-11T08:00:00Z',
    updatedAt: '2024-10-24T06:00:00Z',
  },
  {
    id: 'prod-15',
    farmId: '5',
    name: 'Dâu tây Đà Lạt hữu cơ',
    description:
      'Dâu tây Đà Lạt hữu cơ ngọt thơm, màu đỏ tươi, trái to mọng nước. Sản phẩm cao cấp.',
    category: 'fruits',
    subcategory: 'berries',
    pricePerUnit: 180000,
    unit: 'kg',
    availableQuantity: 30,
    minimumOrder: 1,
    status: 'available',
    images: [
      'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400',
    ],
    harvestDate: '2025-10-24T05:00:00Z',
    deliveryDate: '2025-10-25T08:00:00Z',
    estimatedShelfLife: 3,
    isOrganic: true,
    farmingMethods: ['organic', 'usda_certified', 'highland'],
    qualityGrade: 'premium',
    freshnessLevel: 'same_day',
    seasonalAvailability: ['winter', 'spring'],
    storageRequirements: 'refrigerated',
    packagingType: 'boxed',
    tags: [
      'organic',
      'premium',
      'dalat_specialty',
      'berries',
      'usda_certified',
    ],
    nutritionalInfo: {
      calories: 32,
      protein: 0.7,
      carbs: 7.7,
      fat: 0.3,
      fiber: 2,
      vitamins: ['Vitamin C', 'Manganese', 'Folate'],
    },
    storageInstructions:
      'Bảo quản trong ngăn mát tủ lạnh, dùng trong vòng 2-3 ngày',
    allergenInfo: [],
    certifications: [
      {
        type: 'organic',
        certifyingBody: 'USDA Organic',
        certificateNumber: 'USDA-2024-005-P3',
        validUntil: '2026-03-31',
      },
    ],
    createdAt: '2024-10-19T08:00:00Z',
    updatedAt: '2024-10-24T05:00:00Z',
  },
];

// Featured products - Sản phẩm nổi bật
export const FEATURED_PRODUCT_IDS = [
  'prod-1', // Cà chua bi hữu cơ
  'prod-3', // Xoài cát Hòa Lộc
  'prod-10', // Cải kale hữu cơ
  'prod-15', // Dâu tây Đà Lạt hữu cơ
  'prod-9', // Dưa leo hữu cơ
  'prod-14', // Bông cải xanh hữu cơ
];

export function getFeaturedProducts(): Product[] {
  return MOCK_PRODUCTS.filter((product) =>
    FEATURED_PRODUCT_IDS.includes(product.id)
  );
}

// Function để lấy mock products với pagination và filtering
export function getMockProducts(params: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  farmId?: string;
  minPrice?: number;
  maxPrice?: number;
  organicOnly?: boolean;
  inSeason?: boolean;
  inStock?: boolean;
  sortBy?: 'name' | 'price' | 'harvestDate' | 'createdAt' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}) {
  const {
    page = 1,
    limit = 20,
    search = '',
    category,
    farmId,
    minPrice,
    maxPrice,
    organicOnly = false,
    inSeason = false,
    inStock = true,
    sortBy = 'name',
    sortOrder = 'asc',
  } = params;

  let filteredProducts = [...MOCK_PRODUCTS];

  // Filter by farmId
  if (farmId) {
    filteredProducts = filteredProducts.filter((p) => p.farmId === farmId);
  }

  // Filter by category
  if (category && category !== 'all') {
    filteredProducts = filteredProducts.filter((p) => p.category === category);
  }

  // Filter by search
  if (search) {
    const searchLower = search.toLowerCase();
    filteredProducts = filteredProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower) ||
        p.tags.some((tag) => tag.toLowerCase().includes(searchLower))
    );
  }

  // Filter by price range
  if (minPrice !== undefined) {
    filteredProducts = filteredProducts.filter(
      (p) => p.pricePerUnit >= minPrice
    );
  }
  if (maxPrice !== undefined) {
    filteredProducts = filteredProducts.filter(
      (p) => p.pricePerUnit <= maxPrice
    );
  }

  // Filter by organic
  if (organicOnly) {
    filteredProducts = filteredProducts.filter((p) => p.isOrganic);
  }

  // Filter by stock
  if (inStock) {
    filteredProducts = filteredProducts.filter(
      (p) => p.status === 'available' && p.availableQuantity > 0
    );
  }

  // Sort products
  filteredProducts.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'price':
        comparison = a.pricePerUnit - b.pricePerUnit;
        break;
      case 'harvestDate':
        comparison =
          new Date(a.harvestDate).getTime() - new Date(b.harvestDate).getTime();
        break;
      case 'createdAt':
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'popularity':
        // Mock popularity based on available quantity (lower = more popular)
        comparison = b.availableQuantity - a.availableQuantity;
        break;
      default:
        comparison = 0;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  return {
    success: true,
    data: {
      products: paginatedProducts,
      total: filteredProducts.length,
      page,
      limit,
      hasMore: endIndex < filteredProducts.length,
    },
  };
}

// Function để lấy 1 product theo ID
export function getMockProduct(id: string) {
  const product = MOCK_PRODUCTS.find((p) => p.id === id);

  if (!product) {
    return {
      success: false,
      data: null,
      message: 'Product not found',
    };
  }

  return {
    success: true,
    data: product,
  };
}
