import type { Farm } from '@/types';

// Mock data cho farms
export const MOCK_FARMS: Farm[] = [
  {
    id: '1',
    ownerId: 'owner-1',
    name: 'Sunny Valley Organic Farm',
    description:
      'Chuyên cung cấp rau củ quả hữu cơ tươi ngon, được trồng theo phương pháp canh tác tự nhiên. Chúng tôi cam kết không sử dụng hóa chất và thuốc trừ sâu.',
    location: {
      coordinates: {
        latitude: 10.8231,
        longitude: 106.6297,
      },
      address: {
        street: '123 Đường Nông Nghiệp',
        city: 'Hồ Chí Minh',
        zipCode: '700000',
        country: 'Vietnam',
        district: 'Quận 9',
        formattedAddress: '123 Đường Nông Nghiệp, Quận 9, Hồ Chí Minh',
      },
      farmingArea: 5.5,
      organicCertified: true,
      certificationDetails: {
        certifyingBody: 'Vietnam Organic',
        certificateNumber: 'VO-2024-001',
        validUntil: '2025-12-31',
      },
    },
    contactEmail: 'contact@sunnyvalley.vn',
    contactPhone: '0901234567',
    deliveryMethods: ['both'],
    deliveryZones: [
      {
        id: 'zone-1',
        farmId: '1',
        name: 'Khu vực nội thành',
        area: {
          center: { latitude: 10.8231, longitude: 106.6297 },
          radius: 10,
          name: 'Inner City',
        },
        deliveryFee: 25000,
        estimatedDeliveryTime: 2,
        isActive: true,
        workingDays: [1, 2, 3, 4, 5, 6],
        workingHours: {
          start: '08:00',
          end: '18:00',
        },
      },
    ],
    businessHours: {
      monday: { isOpen: true, openTime: '07:00', closeTime: '18:00' },
      tuesday: { isOpen: true, openTime: '07:00', closeTime: '18:00' },
      wednesday: { isOpen: true, openTime: '07:00', closeTime: '18:00' },
      thursday: { isOpen: true, openTime: '07:00', closeTime: '18:00' },
      friday: { isOpen: true, openTime: '07:00', closeTime: '18:00' },
      saturday: { isOpen: true, openTime: '07:00', closeTime: '17:00' },
      sunday: { isOpen: false, openTime: '00:00', closeTime: '00:00' },
    },
    isActive: true,
    verificationStatus: 'verified',
    profileImageUrl:
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400',
    bannerImageUrl:
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-10-20T10:30:00Z',
  },
  {
    id: '2',
    ownerId: 'owner-2',
    name: 'Green Meadows Farm',
    description:
      'Trang trại chuyên cung cấp trái cây nhiệt đới tươi ngon, được thu hoạch đúng độ chín. Sản phẩm đa dạng từ xoài, sầu riêng đến thanh long.',
    location: {
      coordinates: {
        latitude: 10.7769,
        longitude: 106.7009,
      },
      address: {
        street: '456 Đường Trái Cây',
        city: 'Hồ Chí Minh',
        zipCode: '700000',
        country: 'Vietnam',
        district: 'Quận 2',
        formattedAddress: '456 Đường Trái Cây, Quận 2, Hồ Chí Minh',
      },
      farmingArea: 8.2,
      organicCertified: false,
    },
    contactEmail: 'info@greenmeadows.vn',
    contactPhone: '0912345678',
    deliveryMethods: ['farm_delivery'],
    deliveryZones: [
      {
        id: 'zone-2',
        farmId: '2',
        name: 'Khu vực phía Đông',
        area: {
          center: { latitude: 10.7769, longitude: 106.7009 },
          radius: 15,
          name: 'East Area',
        },
        deliveryFee: 30000,
        estimatedDeliveryTime: 3,
        isActive: true,
        workingDays: [1, 2, 3, 4, 5],
        workingHours: {
          start: '09:00',
          end: '17:00',
        },
      },
    ],
    businessHours: {
      monday: { isOpen: true, openTime: '08:00', closeTime: '17:00' },
      tuesday: { isOpen: true, openTime: '08:00', closeTime: '17:00' },
      wednesday: { isOpen: true, openTime: '08:00', closeTime: '17:00' },
      thursday: { isOpen: true, openTime: '08:00', closeTime: '17:00' },
      friday: { isOpen: true, openTime: '08:00', closeTime: '17:00' },
      saturday: { isOpen: true, openTime: '08:00', closeTime: '16:00' },
      sunday: { isOpen: true, openTime: '08:00', closeTime: '12:00' },
    },
    isActive: true,
    verificationStatus: 'verified',
    profileImageUrl:
      'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400',
    bannerImageUrl:
      'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800',
    createdAt: '2024-02-10T09:00:00Z',
    updatedAt: '2024-10-18T15:20:00Z',
  },
  {
    id: '3',
    ownerId: 'owner-3',
    name: 'Happy Harvest Farm',
    description:
      'Chúng tôi chuyên trồng rau xanh sạch, an toàn cho sức khỏe. Sản phẩm được thu hoạch hàng ngày và giao tận nhà trong vòng 24 giờ.',
    location: {
      coordinates: {
        latitude: 10.8142,
        longitude: 106.6438,
      },
      address: {
        street: '789 Đường Xanh',
        city: 'Hồ Chí Minh',
        zipCode: '700000',
        country: 'Vietnam',
        district: 'Thủ Đức',
        formattedAddress: '789 Đường Xanh, Thủ Đức, Hồ Chí Minh',
      },
      farmingArea: 3.5,
      organicCertified: true,
      certificationDetails: {
        certifyingBody: 'GlobalGAP Vietnam',
        certificateNumber: 'GG-2024-003',
        validUntil: '2025-06-30',
      },
    },
    contactEmail: 'hello@happyharvest.vn',
    contactPhone: '0923456789',
    deliveryMethods: ['both'],
    deliveryZones: [
      {
        id: 'zone-3',
        farmId: '3',
        name: 'Khu vực Thủ Đức',
        area: {
          center: { latitude: 10.8142, longitude: 106.6438 },
          radius: 12,
          name: 'Thu Duc Area',
        },
        deliveryFee: 20000,
        estimatedDeliveryTime: 2,
        isActive: true,
        workingDays: [1, 2, 3, 4, 5, 6, 0],
        workingHours: {
          start: '06:00',
          end: '20:00',
        },
      },
    ],
    businessHours: {
      monday: { isOpen: true, openTime: '06:00', closeTime: '19:00' },
      tuesday: { isOpen: true, openTime: '06:00', closeTime: '19:00' },
      wednesday: { isOpen: true, openTime: '06:00', closeTime: '19:00' },
      thursday: { isOpen: true, openTime: '06:00', closeTime: '19:00' },
      friday: { isOpen: true, openTime: '06:00', closeTime: '19:00' },
      saturday: { isOpen: true, openTime: '06:00', closeTime: '18:00' },
      sunday: { isOpen: true, openTime: '07:00', closeTime: '17:00' },
    },
    isActive: true,
    verificationStatus: 'verified',
    profileImageUrl:
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400',
    bannerImageUrl:
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800',
    createdAt: '2024-03-05T07:30:00Z',
    updatedAt: '2024-10-22T11:45:00Z',
  },
  {
    id: '4',
    ownerId: 'owner-4',
    name: 'Fresh Fields Farm',
    description:
      'Trang trại sản xuất rau củ sạch theo tiêu chuẩn VietGAP. Chúng tôi tự hào cung cấp sản phẩm tươi mới nhất với giá cả phải chăng.',
    location: {
      coordinates: {
        latitude: 10.7542,
        longitude: 106.6867,
      },
      address: {
        street: '321 Đường Tươi Mát',
        city: 'Hồ Chí Minh',
        zipCode: '700000',
        country: 'Vietnam',
        district: 'Quận 1',
        formattedAddress: '321 Đường Tươi Mát, Quận 1, Hồ Chí Minh',
      },
      farmingArea: 4.8,
      organicCertified: false,
    },
    contactEmail: 'contact@freshfields.vn',
    contactPhone: '0934567890',
    deliveryMethods: ['pickup'],
    deliveryZones: [],
    businessHours: {
      monday: { isOpen: true, openTime: '07:00', closeTime: '18:00' },
      tuesday: { isOpen: true, openTime: '07:00', closeTime: '18:00' },
      wednesday: { isOpen: true, openTime: '07:00', closeTime: '18:00' },
      thursday: { isOpen: true, openTime: '07:00', closeTime: '18:00' },
      friday: { isOpen: true, openTime: '07:00', closeTime: '18:00' },
      saturday: { isOpen: true, openTime: '07:00', closeTime: '17:00' },
      sunday: { isOpen: false, openTime: '00:00', closeTime: '00:00' },
    },
    isActive: true,
    verificationStatus: 'verified',
    profileImageUrl:
      'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400',
    bannerImageUrl:
      'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800',
    createdAt: '2024-04-12T08:15:00Z',
    updatedAt: '2024-10-19T14:30:00Z',
  },
  {
    id: '5',
    ownerId: 'owner-5',
    name: 'Organic Paradise',
    description:
      'Thiên đường rau hữu cơ với đa dạng loại rau củ quả được trồng theo phương pháp sinh học. Cam kết 100% không hóa chất, an toàn tuyệt đối.',
    location: {
      coordinates: {
        latitude: 10.8456,
        longitude: 106.6234,
      },
      address: {
        street: '555 Đường Hữu Cơ',
        city: 'Hồ Chí Minh',
        zipCode: '700000',
        country: 'Vietnam',
        district: 'Bình Thạnh',
        formattedAddress: '555 Đường Hữu Cơ, Bình Thạnh, Hồ Chí Minh',
      },
      farmingArea: 6.7,
      organicCertified: true,
      certificationDetails: {
        certifyingBody: 'USDA Organic',
        certificateNumber: 'USDA-2024-005',
        validUntil: '2026-03-31',
      },
    },
    contactEmail: 'info@organicparadise.vn',
    contactPhone: '0945678901',
    deliveryMethods: ['both'],
    deliveryZones: [
      {
        id: 'zone-5',
        farmId: '5',
        name: 'Toàn thành phố',
        area: {
          center: { latitude: 10.8456, longitude: 106.6234 },
          radius: 20,
          name: 'City Wide',
        },
        deliveryFee: 35000,
        estimatedDeliveryTime: 4,
        isActive: true,
        workingDays: [1, 2, 3, 4, 5, 6],
        workingHours: {
          start: '08:00',
          end: '19:00',
        },
      },
    ],
    businessHours: {
      monday: { isOpen: true, openTime: '07:00', closeTime: '19:00' },
      tuesday: { isOpen: true, openTime: '07:00', closeTime: '19:00' },
      wednesday: { isOpen: true, openTime: '07:00', closeTime: '19:00' },
      thursday: { isOpen: true, openTime: '07:00', closeTime: '19:00' },
      friday: { isOpen: true, openTime: '07:00', closeTime: '19:00' },
      saturday: { isOpen: true, openTime: '07:00', closeTime: '18:00' },
      sunday: { isOpen: true, openTime: '08:00', closeTime: '17:00' },
    },
    isActive: true,
    verificationStatus: 'verified',
    profileImageUrl:
      'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=400',
    bannerImageUrl:
      'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=800',
    createdAt: '2024-05-20T09:45:00Z',
    updatedAt: '2024-10-21T16:00:00Z',
  },
  {
    id: '6',
    ownerId: 'owner-6',
    name: "Nature's Best Farm",
    description:
      'Trang trại gia đình với hơn 20 năm kinh nghiệm trồng trọt. Chuyên cung cấp rau củ theo mùa, đảm bảo chất lượng và hương vị tự nhiên.',
    location: {
      coordinates: {
        latitude: 10.7312,
        longitude: 106.7123,
      },
      address: {
        street: '888 Đường Thiên Nhiên',
        city: 'Hồ Chí Minh',
        zipCode: '700000',
        country: 'Vietnam',
        district: 'Quận 7',
        formattedAddress: '888 Đường Thiên Nhiên, Quận 7, Hồ Chí Minh',
      },
      farmingArea: 7.3,
      organicCertified: false,
    },
    contactEmail: 'hello@naturesbest.vn',
    contactPhone: '0956789012',
    deliveryMethods: ['both'],
    deliveryZones: [
      {
        id: 'zone-6',
        farmId: '6',
        name: 'Khu vực phía Nam',
        area: {
          center: { latitude: 10.7312, longitude: 106.7123 },
          radius: 15,
          name: 'South Area',
        },
        deliveryFee: 28000,
        estimatedDeliveryTime: 3,
        isActive: true,
        workingDays: [1, 2, 3, 4, 5],
        workingHours: {
          start: '08:00',
          end: '18:00',
        },
      },
    ],
    businessHours: {
      monday: { isOpen: true, openTime: '06:30', closeTime: '18:30' },
      tuesday: { isOpen: true, openTime: '06:30', closeTime: '18:30' },
      wednesday: { isOpen: true, openTime: '06:30', closeTime: '18:30' },
      thursday: { isOpen: true, openTime: '06:30', closeTime: '18:30' },
      friday: { isOpen: true, openTime: '06:30', closeTime: '18:30' },
      saturday: { isOpen: true, openTime: '06:30', closeTime: '17:00' },
      sunday: { isOpen: false, openTime: '00:00', closeTime: '00:00' },
    },
    isActive: true,
    verificationStatus: 'verified',
    profileImageUrl:
      'https://images.unsplash.com/photo-1495107334309-fcf20504a5ab?w=400',
    bannerImageUrl:
      'https://images.unsplash.com/photo-1495107334309-fcf20504a5ab?w=800',
    createdAt: '2024-06-08T10:00:00Z',
    updatedAt: '2024-10-20T12:15:00Z',
  },
];

// Function để lấy mock farms với pagination
export function getMockFarms(params: {
  page?: number;
  limit?: number;
  search?: string;
  deliveryMethod?: 'pickup' | 'farm_delivery' | 'both';
  location?: { latitude: number; longitude: number; radius: number };
  sortBy?: 'name' | 'createdAt' | 'distance';
  sortOrder?: 'asc' | 'desc';
  isActive?: boolean;
}) {
  const {
    page = 1,
    limit = 20,
    search = '',
    deliveryMethod,
    location,
    sortBy = 'name',
    sortOrder = 'asc',
    isActive = true,
  } = params;

  // Filter farms
  let filteredFarms = [...MOCK_FARMS];

  // Filter by active status
  if (isActive !== undefined) {
    filteredFarms = filteredFarms.filter((farm) => farm.isActive === isActive);
  }

  // Filter by search
  if (search) {
    const searchLower = search.toLowerCase();
    filteredFarms = filteredFarms.filter(
      (farm) =>
        farm.name.toLowerCase().includes(searchLower) ||
        farm.description.toLowerCase().includes(searchLower) ||
        farm.location.address.city.toLowerCase().includes(searchLower)
    );
  }

  // Filter by delivery method
  if (deliveryMethod && deliveryMethod !== 'both') {
    filteredFarms = filteredFarms.filter((farm) =>
      farm.deliveryMethods.includes(deliveryMethod)
    );
  }

  // Filter by location (simple distance calculation)
  if (location) {
    filteredFarms = filteredFarms.map((farm) => {
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        farm.location.coordinates.latitude,
        farm.location.coordinates.longitude
      );
      return { ...farm, distance };
    });

    // Filter by radius
    filteredFarms = filteredFarms.filter(
      (farm: Farm & { distance?: number }) =>
        (farm.distance ?? 0) <= location.radius
    );
  }

  // Sort farms
  filteredFarms.sort(
    (a: Farm & { distance?: number }, b: Farm & { distance?: number }) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'createdAt':
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'distance':
          if (a.distance !== undefined && b.distance !== undefined) {
            comparison = a.distance - b.distance;
          }
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    }
  );

  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedFarms = filteredFarms.slice(startIndex, endIndex);

  return {
    success: true,
    data: {
      farms: paginatedFarms,
      total: filteredFarms.length,
      page,
      limit,
      hasMore: endIndex < filteredFarms.length,
    },
  };
}

// Helper function để tính khoảng cách giữa 2 điểm (Haversine formula)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// Function để lấy 1 farm theo ID
export function getMockFarm(id: string) {
  const farm = MOCK_FARMS.find((f) => f.id === id);

  if (!farm) {
    return {
      success: false,
      data: null,
      message: 'Farm not found',
    };
  }

  return {
    success: true,
    data: farm,
  };
}
