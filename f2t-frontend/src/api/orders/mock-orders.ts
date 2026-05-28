import type { Order, OrdersResponse } from './types';

// Mock data cho orders - Cập nhật để chỉ sử dụng 'cash' và 'stripe'
export const MOCK_ORDERS: Order[] = [
  {
    id: 'order-1',
    orderNumber: 'ORD-2025-001',
    customerId: 'user-1',
    customerName: 'Nguyễn Văn A',
    customerEmail: 'nguyenvana@example.com',
    customerPhone: '0901234567',

    items: [
      {
        id: 'item-1',
        productId: 'prod-1',
        productName: 'Cà chua bi hữu cơ',
        productImage:
          'https://images.unsplash.com/photo-1546470427-e26264d6d8b0?w=400',
        quantity: 2,
        unit: 'kg',
        pricePerUnit: 45000,
        totalPrice: 90000,
        farmId: '1',
        farmName: 'Sunny Valley Organic Farm',
      },
      {
        id: 'item-2',
        productId: 'prod-2',
        productName: 'Xà lách xoong hữu cơ',
        productImage:
          'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400',
        quantity: 1,
        unit: 'kg',
        pricePerUnit: 35000,
        totalPrice: 35000,
        farmId: '1',
        farmName: 'Sunny Valley Organic Farm',
      },
    ],
    totalItems: 2,
    subtotal: 125000,
    deliveryFee: 25000,
    tax: 15000,
    total: 165000,
    currency: 'VND',

    status: 'delivered',
    paymentStatus: 'paid',
    paymentMethod: 'stripe',
    deliveryMethod: 'delivery',

    shippingAddress: {
      id: 'addr-2',
      type: 'shipped',
      firstName: 'Nguyễn',
      lastName: 'Văn A',
      addressLine1: '123 Đường Nguyễn Huệ',
      addressLine2: 'Phường Bến Nghé, Quận 1',
      city: 'Hồ Chí Minh',
      state: 'Hồ Chí Minh',
      postalCode: '700000',
      country: 'Vietnam',
      phoneNumber: '0901234567',
      isDefault: true,
    },

    deliveryDate: '2025-10-22',
    deliveryTimeSlot: '14:00 - 16:00',
    deliveryInstructions: 'Gọi điện trước khi giao hàng',
    estimatedDeliveryTime: '2025-10-22T15:00:00Z',
    actualDeliveryTime: '2025-10-22T14:45:00Z',

    timeline: [
      {
        id: 'timeline-1',
        status: 'pending',
        timestamp: '2025-10-20T10:00:00Z',
        description: 'Đơn hàng đã được tạo',
        updatedBy: 'customer',
      },
      {
        id: 'timeline-2',
        status: 'confirmed',
        timestamp: '2025-10-20T10:30:00Z',
        description: 'Đơn hàng đã được xác nhận bởi trang trại',
        updatedBy: 'farm',
      },
      {
        id: 'timeline-3',
        status: 'preparing',
        timestamp: '2025-10-22T08:00:00Z',
        description: 'Đang chuẩn bị đơn hàng',
        updatedBy: 'farm',
      },
      {
        id: 'timeline-4',
        status: 'shipped',
        timestamp: '2025-10-22T13:00:00Z',
        description: 'Đơn hàng đang được giao',
        location: 'Đang di chuyển đến địa chỉ giao hàng',
        updatedBy: 'delivery',
      },
      {
        id: 'timeline-5',
        status: 'delivered',
        timestamp: '2025-10-22T14:45:00Z',
        description: 'Đơn hàng đã được giao thành công',
        location: '123 Đường Nguyễn Huệ, Quận 1, Hồ Chí Minh',
        updatedBy: 'delivery',
      },
    ],
    trackingNumber: 'TRK-2025-001',
    carrierName: 'Giao Hàng Nhanh',

    createdAt: '2025-10-20T10:00:00Z',
    updatedAt: '2025-10-22T14:45:00Z',
    confirmedAt: '2025-10-20T10:30:00Z',
    shippedAt: '2025-10-22T13:00:00Z',
    deliveredAt: '2025-10-22T14:45:00Z',

    notes: 'Khách hàng yêu cầu giao hàng trong giờ hành chính',
  },
  {
    id: 'order-2',
    orderNumber: 'ORD-2025-002',
    customerId: 'user-1',
    customerName: 'Nguyễn Văn A',
    customerEmail: 'nguyenvana@example.com',
    customerPhone: '0901234567',

    items: [
      {
        id: 'item-3',
        productId: 'prod-5',
        productName: 'Xoài cát Hòa Lộc',
        productImage:
          'https://images.unsplash.com/photo-1553279768-865429fa0078?w=400',
        quantity: 3,
        unit: 'kg',
        pricePerUnit: 65000,
        totalPrice: 195000,
        farmId: '2',
        farmName: 'Green Meadows Farm',
      },
    ],
    totalItems: 1,
    subtotal: 195000,
    deliveryFee: 30000,
    tax: 22500,
    total: 247500,
    currency: 'VND',

    status: 'shipped',
    paymentStatus: 'paid',
    paymentMethod: 'stripe',
    deliveryMethod: 'delivery',

    shippingAddress: {
      id: 'addr-4',
      type: 'shipped',
      firstName: 'Nguyễn',
      lastName: 'Văn A',
      addressLine1: '456 Đường Lê Lợi',
      addressLine2: 'Phường Bến Thành, Quận 1',
      city: 'Hồ Chí Minh',
      state: 'Hồ Chí Minh',
      postalCode: '700000',
      country: 'Vietnam',
      phoneNumber: '0901234567',
      isDefault: false,
    },

    deliveryDate: '2025-10-25',
    deliveryTimeSlot: '09:00 - 11:00',
    estimatedDeliveryTime: '2025-10-25T10:00:00Z',

    timeline: [
      {
        id: 'timeline-6',
        status: 'pending',
        timestamp: '2025-10-24T09:00:00Z',
        description: 'Đơn hàng đã được tạo',
        updatedBy: 'customer',
      },
      {
        id: 'timeline-7',
        status: 'confirmed',
        timestamp: '2025-10-24T09:15:00Z',
        description: 'Đơn hàng đã được xác nhận',
        updatedBy: 'farm',
      },
      {
        id: 'timeline-8',
        status: 'preparing',
        timestamp: '2025-10-25T07:00:00Z',
        description: 'Đang chuẩn bị đơn hàng',
        updatedBy: 'farm',
      },
      {
        id: 'timeline-9',
        status: 'shipped',
        timestamp: '2025-10-25T08:30:00Z',
        description: 'Đơn hàng đang được giao',
        location: 'Đang trên đường giao hàng',
        updatedBy: 'delivery',
      },
    ],
    trackingNumber: 'TRK-2025-002',
    carrierName: 'Giao Hàng Tiết Kiệm',

    createdAt: '2025-10-24T09:00:00Z',
    updatedAt: '2025-10-25T08:30:00Z',
    confirmedAt: '2025-10-24T09:15:00Z',
    shippedAt: '2025-10-25T08:30:00Z',

    specialInstructions: 'Chọn trái xoài chín vừa',
  },
  {
    id: 'order-3',
    orderNumber: 'ORD-2025-003',
    customerId: 'user-1',
    customerName: 'Nguyễn Văn A',
    customerEmail: 'nguyenvana@example.com',
    customerPhone: '0901234567',

    items: [
      {
        id: 'item-4',
        productId: 'prod-9',
        productName: 'Rau cải xanh hữu cơ',
        productImage:
          'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=400',
        quantity: 2,
        unit: 'kg',
        pricePerUnit: 30000,
        totalPrice: 60000,
        farmId: '3',
        farmName: 'Happy Harvest Farm',
      },
      {
        id: 'item-5',
        productId: 'prod-10',
        productName: 'Rau muống hữu cơ',
        productImage:
          'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400',
        quantity: 1,
        unit: 'kg',
        pricePerUnit: 25000,
        totalPrice: 25000,
        farmId: '3',
        farmName: 'Happy Harvest Farm',
      },
    ],
    totalItems: 2,
    subtotal: 85000,
    deliveryFee: 20000,
    tax: 10500,
    total: 115500,
    currency: 'VND',

    status: 'preparing',
    paymentStatus: 'pending',
    paymentMethod: 'cash',
    deliveryMethod: 'delivery',

    shippingAddress: {
      id: 'addr-6',
      type: 'shipped',
      firstName: 'Nguyễn',
      lastName: 'Văn A',
      addressLine1: '789 Đường Võ Văn Tần',
      addressLine2: 'Phường Võ Thị Sáu, Quận 3',
      city: 'Hồ Chí Minh',
      state: 'Hồ Chí Minh',
      postalCode: '700000',
      country: 'Vietnam',
      phoneNumber: '0901234567',
      isDefault: true,
    },

    deliveryDate: '2025-10-26',
    deliveryTimeSlot: '07:00 - 09:00',
    estimatedDeliveryTime: '2025-10-26T08:00:00Z',

    timeline: [
      {
        id: 'timeline-10',
        status: 'pending',
        timestamp: '2025-10-25T14:00:00Z',
        description: 'Đơn hàng đã được tạo',
        updatedBy: 'customer',
      },
      {
        id: 'timeline-11',
        status: 'confirmed',
        timestamp: '2025-10-25T14:20:00Z',
        description: 'Đơn hàng đã được xác nhận',
        updatedBy: 'farm',
      },
      {
        id: 'timeline-12',
        status: 'preparing',
        timestamp: '2025-10-25T16:00:00Z',
        description: 'Đang chuẩn bị đơn hàng',
        notes: 'Rau sẽ được thu hoạch vào sáng ngày mai',
        updatedBy: 'farm',
      },
    ],

    createdAt: '2025-10-25T14:00:00Z',
    updatedAt: '2025-10-25T16:00:00Z',
    confirmedAt: '2025-10-25T14:20:00Z',

    deliveryInstructions: 'Giao hàng sớm vào buổi sáng',
  },
  {
    id: 'order-4',
    orderNumber: 'ORD-2025-004',
    customerId: 'user-1',
    customerName: 'Nguyễn Văn A',
    customerEmail: 'nguyenvana@example.com',
    customerPhone: '0901234567',

    items: [
      {
        id: 'item-6',
        productId: 'prod-15',
        productName: 'Đu đủ Đại Loan',
        productImage:
          'https://images.unsplash.com/photo-1617112848923-cc2234396a8d?w=400',
        quantity: 2,
        unit: 'kg',
        pricePerUnit: 35000,
        totalPrice: 70000,
        farmId: '2',
        farmName: 'Green Meadows Farm',
      },
    ],
    totalItems: 1,
    subtotal: 70000,
    deliveryFee: 30000,
    tax: 10000,
    total: 110000,
    currency: 'VND',

    status: 'confirmed',
    paymentStatus: 'paid',
    paymentMethod: 'stripe',
    deliveryMethod: 'delivery',

    shippingAddress: {
      id: 'addr-8',
      type: 'shipped',
      firstName: 'Nguyễn',
      lastName: 'Văn A',
      addressLine1: '123 Đường Nguyễn Huệ',
      addressLine2: 'Phường Bến Nghé, Quận 1',
      city: 'Hồ Chí Minh',
      state: 'Hồ Chí Minh',
      postalCode: '700000',
      country: 'Vietnam',
      phoneNumber: '0901234567',
      isDefault: true,
    },

    deliveryDate: '2025-10-27',
    deliveryTimeSlot: '10:00 - 12:00',
    estimatedDeliveryTime: '2025-10-27T11:00:00Z',

    timeline: [
      {
        id: 'timeline-13',
        status: 'pending',
        timestamp: '2025-10-25T15:30:00Z',
        description: 'Đơn hàng đã được tạo',
        updatedBy: 'customer',
      },
      {
        id: 'timeline-14',
        status: 'confirmed',
        timestamp: '2025-10-25T16:00:00Z',
        description: 'Đơn hàng đã được xác nhận',
        notes: 'Đu đủ sẽ được chọn lựa kỹ càng',
        updatedBy: 'farm',
      },
    ],

    createdAt: '2025-10-25T15:30:00Z',
    updatedAt: '2025-10-25T16:00:00Z',
    confirmedAt: '2025-10-25T16:00:00Z',
  },
  {
    id: 'order-5',
    orderNumber: 'ORD-2025-005',
    customerId: 'user-1',
    customerName: 'Nguyễn Văn A',
    customerEmail: 'nguyenvana@example.com',
    customerPhone: '0901234567',

    items: [
      {
        id: 'item-7',
        productId: 'prod-3',
        productName: 'Cà rót tím hữu cơ',
        productImage:
          'https://images.unsplash.com/photo-1659261200833-ec8761558af7?w=400',
        quantity: 1.5,
        unit: 'kg',
        pricePerUnit: 40000,
        totalPrice: 60000,
        farmId: '1',
        farmName: 'Sunny Valley Organic Farm',
      },
      {
        id: 'item-8',
        productId: 'prod-4',
        productName: 'Ớt chuông đỏ hữu cơ',
        productImage:
          'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400',
        quantity: 1,
        unit: 'kg',
        pricePerUnit: 55000,
        totalPrice: 55000,
        farmId: '1',
        farmName: 'Sunny Valley Organic Farm',
      },
    ],
    totalItems: 2,
    subtotal: 115000,
    deliveryFee: 25000,
    tax: 14000,
    total: 154000,
    currency: 'VND',

    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: 'stripe',
    deliveryMethod: 'delivery',

    shippingAddress: {
      id: 'addr-10',
      type: 'shipped',
      firstName: 'Nguyễn',
      lastName: 'Văn A',
      addressLine1: '123 Đường Nguyễn Huệ',
      addressLine2: 'Phường Bến Nghé, Quận 1',
      city: 'Hồ Chí Minh',
      state: 'Hồ Chí Minh',
      postalCode: '700000',
      country: 'Vietnam',
      phoneNumber: '0901234567',
      isDefault: true,
    },

    deliveryDate: '2025-10-28',
    deliveryTimeSlot: '14:00 - 16:00',
    estimatedDeliveryTime: '2025-10-28T15:00:00Z',

    timeline: [
      {
        id: 'timeline-15',
        status: 'pending',
        timestamp: '2025-10-25T17:00:00Z',
        description: 'Đơn hàng đã được tạo và đang chờ xác nhận',
        updatedBy: 'customer',
      },
    ],

    createdAt: '2025-10-25T17:00:00Z',
    updatedAt: '2025-10-25T17:00:00Z',

    notes: 'Vui lòng xác nhận đơn hàng sớm',
  },
  {
    id: 'order-6',
    orderNumber: 'ORD-2025-006',
    customerId: 'user-1',
    customerName: 'Nguyễn Văn A',
    customerEmail: 'nguyenvana@example.com',
    customerPhone: '0901234567',

    items: [
      {
        id: 'item-9',
        productId: 'prod-20',
        productName: 'Dưa chuột baby hữu cơ',
        productImage:
          'https://images.unsplash.com/photo-1589927986089-35812378d785?w=400',
        quantity: 2,
        unit: 'kg',
        pricePerUnit: 38000,
        totalPrice: 76000,
        farmId: '5',
        farmName: 'Organic Paradise',
      },
    ],
    totalItems: 1,
    subtotal: 76000,
    deliveryFee: 35000,
    tax: 11100,
    total: 122100,
    currency: 'VND',

    status: 'cancelled',
    paymentStatus: 'refunded',
    paymentMethod: 'stripe',
    deliveryMethod: 'delivery',

    shippingAddress: {
      id: 'addr-12',
      type: 'shipped',
      firstName: 'Nguyễn',
      lastName: 'Văn A',
      addressLine1: '456 Đường Lê Lợi',
      addressLine2: 'Phường Bến Thành, Quận 1',
      city: 'Hồ Chí Minh',
      state: 'Hồ Chí Minh',
      postalCode: '700000',
      country: 'Vietnam',
      phoneNumber: '0901234567',
      isDefault: false,
    },

    timeline: [
      {
        id: 'timeline-16',
        status: 'pending',
        timestamp: '2025-10-23T10:00:00Z',
        description: 'Đơn hàng đã được tạo',
        updatedBy: 'customer',
      },
      {
        id: 'timeline-17',
        status: 'confirmed',
        timestamp: '2025-10-23T10:30:00Z',
        description: 'Đơn hàng đã được xác nhận',
        updatedBy: 'farm',
      },
      {
        id: 'timeline-18',
        status: 'cancelled',
        timestamp: '2025-10-23T15:00:00Z',
        description: 'Đơn hàng đã bị hủy',
        notes: 'Khách hàng thay đổi ý định',
        updatedBy: 'customer',
      },
    ],

    createdAt: '2025-10-23T10:00:00Z',
    updatedAt: '2025-10-23T15:00:00Z',
    confirmedAt: '2025-10-23T10:30:00Z',
    cancelledAt: '2025-10-23T15:00:00Z',

    refundAmount: 122100,
    refundReason: 'Khách hàng yêu cầu hủy đơn',
  },
  {
    id: 'order-7',
    orderNumber: 'ORD-2025-007',
    customerId: 'user-1',
    customerName: 'Nguyễn Văn A',
    customerEmail: 'nguyenvana@example.com',
    customerPhone: '0901234567',

    items: [
      {
        id: 'item-10',
        productId: 'prod-25',
        productName: 'Bí đỏ Nhật Bản',
        productImage:
          'https://images.unsplash.com/photo-1570040821635-732e60c60b9d?w=400',
        quantity: 3,
        unit: 'kg',
        pricePerUnit: 42000,
        totalPrice: 126000,
        farmId: '6',
        farmName: "Nature's Best Farm",
      },
    ],
    totalItems: 1,
    subtotal: 126000,
    deliveryFee: 28000,
    tax: 15400,
    total: 169400,
    currency: 'VND',

    status: 'ready_for_pickup',
    paymentStatus: 'paid',
    paymentMethod: 'cash',
    deliveryMethod: 'pickup',

    shippingAddress: {
      id: 'addr-14',
      type: 'shipped',
      firstName: 'Nguyễn',
      lastName: 'Văn A',
      addressLine1: '888 Đường Thiên Nhiên, Quận 7',
      city: 'Hồ Chí Minh',
      state: 'Hồ Chí Minh',
      postalCode: '700000',
      country: 'Vietnam',
      phoneNumber: '0901234567',
      isDefault: true,
    },

    deliveryDate: '2025-10-26',
    deliveryTimeSlot: '08:00 - 20:00',
    deliveryInstructions: 'Khách hàng sẽ đến lấy hàng tại trang trại',

    timeline: [
      {
        id: 'timeline-19',
        status: 'pending',
        timestamp: '2025-10-24T16:00:00Z',
        description: 'Đơn hàng đã được tạo',
        updatedBy: 'customer',
      },
      {
        id: 'timeline-20',
        status: 'confirmed',
        timestamp: '2025-10-24T16:30:00Z',
        description: 'Đơn hàng đã được xác nhận',
        updatedBy: 'farm',
      },
      {
        id: 'timeline-21',
        status: 'preparing',
        timestamp: '2025-10-25T08:00:00Z',
        description: 'Đang chuẩn bị đơn hàng',
        updatedBy: 'farm',
      },
      {
        id: 'timeline-22',
        status: 'ready_for_pickup',
        timestamp: '2025-10-25T14:00:00Z',
        description: 'Đơn hàng đã sẵn sàng để lấy',
        location: '888 Đường Thiên Nhiên, Quận 7, Hồ Chí Minh',
        notes: 'Vui lòng đến lấy hàng trong giờ làm việc',
        updatedBy: 'farm',
      },
    ],

    createdAt: '2025-10-24T16:00:00Z',
    updatedAt: '2025-10-25T14:00:00Z',
    confirmedAt: '2025-10-24T16:30:00Z',

    specialInstructions: 'Tự đến trang trại lấy hàng',
  },
  {
    id: 'order-8',
    orderNumber: 'ORD-2025-008',
    customerId: 'user-1',
    customerName: 'Nguyễn Văn A',
    customerEmail: 'nguyenvana@example.com',
    customerPhone: '0901234567',

    items: [
      {
        id: 'item-11',
        productId: 'prod-11',
        productName: 'Dưa hấu không hạt',
        productImage:
          'https://images.unsplash.com/photo-1587049352846-4a222e784442?w=400',
        quantity: 5,
        unit: 'kg',
        pricePerUnit: 28000,
        totalPrice: 140000,
        farmId: '2',
        farmName: 'Green Meadows Farm',
      },
      {
        id: 'item-12',
        productId: 'prod-12',
        productName: 'Bưởi da xanh',
        productImage:
          'https://images.unsplash.com/photo-1574856344991-aaa31b6f4ce3?w=400',
        quantity: 2,
        unit: 'kg',
        pricePerUnit: 45000,
        totalPrice: 90000,
        farmId: '2',
        farmName: 'Green Meadows Farm',
      },
    ],
    totalItems: 2,
    subtotal: 230000,
    deliveryFee: 30000,
    tax: 26000,
    total: 286000,
    currency: 'VND',

    status: 'delivered',
    paymentStatus: 'paid',
    paymentMethod: 'stripe',
    deliveryMethod: 'delivery',

    shippingAddress: {
      id: 'addr-16',
      type: 'shipped',
      firstName: 'Nguyễn',
      lastName: 'Văn A',
      addressLine1: '123 Đường Nguyễn Huệ',
      addressLine2: 'Phường Bến Nghé, Quận 1',
      city: 'Hồ Chí Minh',
      state: 'Hồ Chí Minh',
      postalCode: '700000',
      country: 'Vietnam',
      phoneNumber: '0901234567',
      isDefault: true,
    },

    deliveryDate: '2025-10-18',
    deliveryTimeSlot: '15:00 - 17:00',
    estimatedDeliveryTime: '2025-10-18T16:00:00Z',
    actualDeliveryTime: '2025-10-18T15:30:00Z',

    timeline: [
      {
        id: 'timeline-23',
        status: 'pending',
        timestamp: '2025-10-17T10:00:00Z',
        description: 'Đơn hàng đã được tạo',
        updatedBy: 'customer',
      },
      {
        id: 'timeline-24',
        status: 'confirmed',
        timestamp: '2025-10-17T10:30:00Z',
        description: 'Đơn hàng đã được xác nhận',
        updatedBy: 'farm',
      },
      {
        id: 'timeline-25',
        status: 'preparing',
        timestamp: '2025-10-18T09:00:00Z',
        description: 'Đang chuẩn bị đơn hàng',
        updatedBy: 'farm',
      },
      {
        id: 'timeline-26',
        status: 'shipped',
        timestamp: '2025-10-18T14:00:00Z',
        description: 'Đơn hàng đang được giao',
        updatedBy: 'delivery',
      },
      {
        id: 'timeline-27',
        status: 'delivered',
        timestamp: '2025-10-18T15:30:00Z',
        description: 'Đơn hàng đã được giao thành công',
        location: '123 Đường Nguyễn Huệ, Quận 1, Hồ Chí Minh',
        updatedBy: 'delivery',
      },
    ],
    trackingNumber: 'TRK-2025-008',
    carrierName: 'Ninja Van',

    createdAt: '2025-10-17T10:00:00Z',
    updatedAt: '2025-10-18T15:30:00Z',
    confirmedAt: '2025-10-17T10:30:00Z',
    shippedAt: '2025-10-18T14:00:00Z',
    deliveredAt: '2025-10-18T15:30:00Z',
  },
];

// Function để lấy mock orders với pagination và filter
export function getMockOrders(params: {
  page?: number;
  limit?: number;
  status?: string;
  paymentStatus?: string;
  farmId?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'total' | 'status';
  sortOrder?: 'asc' | 'desc';
}): OrdersResponse {
  const {
    page = 1,
    limit = 10,
    status,
    paymentStatus,
    farmId,
    customerId,
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = params;

  // Filter orders
  let filteredOrders = [...MOCK_ORDERS];

  // Filter by status
  if (status) {
    filteredOrders = filteredOrders.filter((order) => order.status === status);
  }

  // Filter by payment status
  if (paymentStatus) {
    filteredOrders = filteredOrders.filter(
      (order) => order.paymentStatus === paymentStatus
    );
  }

  // Filter by farmId (check if any item in order is from this farm)
  if (farmId) {
    filteredOrders = filteredOrders.filter((order) =>
      order.items.some((item) => item.farmId === farmId)
    );
  }

  // Filter by customerId
  if (customerId) {
    filteredOrders = filteredOrders.filter(
      (order) => order.customerId === customerId
    );
  }

  // Filter by date range
  if (startDate) {
    filteredOrders = filteredOrders.filter(
      (order) => new Date(order.createdAt) >= new Date(startDate)
    );
  }

  if (endDate) {
    filteredOrders = filteredOrders.filter(
      (order) => new Date(order.createdAt) <= new Date(endDate)
    );
  }

  // Sort orders
  filteredOrders.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'createdAt':
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'updatedAt':
        comparison =
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
      case 'total':
        comparison = a.total - b.total;
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
      default:
        comparison = 0;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  return {
    success: true,
    data: {
      orders: paginatedOrders,
      total: filteredOrders.length,
      page,
      limit,
      hasMore: endIndex < filteredOrders.length,
    },
  };
}

// Function để lấy 1 order theo ID
export function getMockOrder(id: string) {
  const order = MOCK_ORDERS.find((o) => o.id === id);

  if (!order) {
    return {
      success: false,
      data: null,
      message: 'Order not found',
    };
  }

  return {
    success: true,
    data: order,
  };
}
