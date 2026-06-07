import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from '../modules/users/schemas/user.schema';
import { Farm } from '../modules/farms/schemas/farm.schema';
import { Product } from '../modules/products/schemas/product.schema';
import { Order } from '../modules/orders/schemas/order.schema';
import { Post } from '../modules/posts/schemas/post.schema';
import { Notification } from '../modules/notifications/schemas/notification.schema';
import { NotificationPreferences } from '../modules/notifications/schemas/notification-preferences.schema';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });


  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'production') {
    process.exit(1);
  }

  try {
    const userModel = app.get<Model<User>>(getModelToken(User.name));
    const farmModel = app.get<Model<Farm>>(getModelToken(Farm.name));
    const productModel = app.get<Model<Product>>(getModelToken(Product.name));
    const orderModel = app.get<Model<Order>>(getModelToken(Order.name));
    const postModel = app.get<Model<Post>>(getModelToken(Post.name));
    const notificationModel = app.get<Model<Notification>>(
      getModelToken(Notification.name),
    );
    const prefsModel = app.get<Model<NotificationPreferences>>(
      getModelToken(NotificationPreferences.name),
    );

    // 1. Clean previous seed data
    const models: Model<any>[] = [
      userModel,
      farmModel,
      productModel,
      orderModel,
      postModel,
      notificationModel,
      prefsModel,
    ];
    let totalCleared = 0;
    for (const model of models) {
      const res = await model.deleteMany({ _seeded: true });
      totalCleared += res.deletedCount;
    }

    const SEED_PASSWORD = 'SeedPass123!';
    const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 10);

    // 2. Seed Users
    const farmUsers = [];
    for (let i = 1; i <= 3; i++) {
      const user = await userModel.create({
        email: `farm${i}@f2t.vn`,
        password: hashedPassword,
        firstName: ['Nguyễn', 'Trần', 'Lê'][i - 1],
        lastName: ['Văn Thắng', 'Thị Mai', 'Quốc Việt'][i - 1],
        phoneNumber: `090${i}234567`,
        role: 'farm',
        status: 'active',
        location: {
          coordinates: {
            latitude: 21.0285 + i * 0.01,
            longitude: 105.8542 + i * 0.01,
          },
          address: {
            street: `${123 + i} Phố Cổ`,
            city: 'Hà Nội',
            state: 'Hà Nội',
            zipCode: '100000',
            country: 'Việt Nam',
          },
        },
        _seeded: true,
      });
      farmUsers.push(user);
    }

    const consumerUsers = [];
    for (let i = 1; i <= 5; i++) {
      const user = await userModel.create({
        email: `consumer${i}@f2t.vn`,
        password: hashedPassword,
        firstName: ['Phạm', 'Hoàng', 'Đỗ', 'Bùi', 'Vũ'][i - 1],
        lastName: ['Thanh Hải', 'Minh Tuấn', 'Thu Thảo', 'Gia Bảo', 'Lan Anh'][
          i - 1
        ],
        phoneNumber: `091${i}234567`,
        role: 'consumer',
        status: 'active',
        location: {
          coordinates: {
            latitude: 10.7 + i * 0.05,
            longitude: 106.6 + i * 0.05,
          },
          address: {
            street: `${456 + i} Lê Lợi`,
            city: 'Hồ Chí Minh',
            state: 'TP.HCM',
            zipCode: '70000',
            country: 'Việt Nam',
          },
        },
        _seeded: true,
      });
      consumerUsers.push(user);
    }

    const suspendedUser = await userModel.create({
      email: 'suspended@f2t.vn',
      password: hashedPassword,
      firstName: 'Trương',
      lastName: 'Vô Kỵ',
      phoneNumber: '0999999999',
      role: 'consumer',
      status: 'suspended',
      location: {
        coordinates: { latitude: 10.8, longitude: 106.8 },
        address: {
          street: '999 Độc Lập',
          city: 'Hồ Chí Minh',
          state: 'TP.HCM',
          zipCode: '70000',
          country: 'Việt Nam',
        },
      },
      _seeded: true,
    });

        .slice(0, 3)
        .join(', ')} ...`,
    );

    // 3. Seed Farms
    const farmNames = [
      'Nông Trại Xanh',
      'Vườn Hữu Cơ Phú Mỹ',
      'Trang Trại Đà Lạt',
    ];
    const farms = [];
    for (let i = 0; i < 3; i++) {
      const farm = await farmModel.create({
        ownerId: farmUsers[i]._id,
        name: farmNames[i],
        description: `Trang trại ${farmNames[i]} chuyên cung cấp nông sản sạch, đạt tiêu chuẩn hữu cơ quốc tế. Chúng tôi cam kết chất lượng tốt nhất từ vùng đất ${['Đà Lạt', 'Long An', 'Củ Chi'][i]}.`,
        location: {
          type: 'Point',
          coordinates: [
            farmUsers[i].location.coordinates.longitude,
            farmUsers[i].location.coordinates.latitude,
          ],
        },
        address: farmUsers[i].location.address,
        contactEmail: `contact@${farmNames[i].toLowerCase().replace(/\s/g, '')}.vn`,
        contactPhone: `028${i}7654321`,
        deliveryMethods: i === 2 ? ['pickup'] : ['pickup', 'farm_delivery'],
        deliveryZones: [
          {
            id: 'z1',
            name: 'Quận 1',
            area: {
              center: [
                farmUsers[i].location.coordinates.longitude,
                farmUsers[i].location.coordinates.latitude,
              ],
              radius: 10,
            },
            deliveryFee: 20000,
            estimatedDeliveryTime: 2,
            isActive: true,
            workingDays: [1, 2, 3, 4, 5, 6],
            workingHours: { start: '08:00', end: '17:00' },
          },
        ],
        businessHours: {
          monday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
          tuesday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
          wednesday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
          thursday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
          friday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
          saturday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
          sunday: { isOpen: i === 0, openTime: '09:00', closeTime: '12:00' },
        },
        isActive: i !== 2,
        _seeded: true,
      });
      farms.push(farm);
    }
    farms.forEach((f) =>

    // 4. Seed Products
    const categories = ['leafy', 'fruit', 'herbs', 'dairy'];
    const products = [];
    const productNames = [
      [
        'Cà Chua Bi',
        'Xà Lách Mỹ',
        'Cà Rốt Đà Lạt',
        'Bông Cải Xanh',
        'Khoai Tây',
      ],
      ['Xoài Cát Hòa Lộc', 'Bưởi Năm Roi', 'Thanh Long', 'Dưa Hấu', 'Chuối Sứ'],
      ['Bạc Hà', 'Húng Quế', 'Ngò Rí', 'Tía Tô', 'Diếp Cá'],
    ];

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 5; j++) {
        const prod = await productModel.create({
          farmId: farms[i]._id,
          name: productNames[i][j],
          description: `Sản phẩm ${productNames[i][j]} tươi sạch, được thu hoạch trực tiếp tại ${farms[i].name}. Đảm bảo không hóa chất độc hại.`,
          category: categories[i % categories.length],
          pricePerUnit: (j + 1) * 20000,
          unit: ['kg', 'bunch', 'piece', 'box'][j % 4],
          availableQuantity: 50 + j * 10,
          minimumOrder: 1,
          status: j === 4 ? 'unavailable' : 'available',
          images: [
            `https://images.unsplash.com/photo-${1500000000000 + i * 100 + j}`,
          ],
          harvestDate: new Date().toISOString(),
          deliveryDate: new Date(Date.now() + 86400000).toISOString(),
          estimatedShelfLife: 7,
          isOrganic: j % 2 === 0,
          farmingMethods: ['Hữu cơ', 'VietGAP'],
          seasonalAvailability: ['Xuân', 'Hè'],
          tags: [categories[i % categories.length], 'tươi sạch'],
          nutritionalInfo: { calories: 50, protein: 2, carbs: 10, fat: 0 },
          _seeded: true,
        });
        products.push(prod);
      }
    }

    // 5. Seed Orders
    const orderStatuses = [
      'pending',
      'confirmed',
      'preparing',
      'ready_for_pickup',
      'shipped',
      'delivered',
      'cancelled',
    ];
    const paymentStatuses = ['pending', 'paid', 'failed', 'refunded'];

    for (let i = 0; i < 8; i++) {
      const consumer = consumerUsers[i % 5];
      const farm = farms[i % 3];
      const farmProds = products.filter(
        (p) => String(p.farmId) === String(farm._id),
      );

      const items = [
        {
          productId: farmProds[0]._id,
          productName: farmProds[0].name,
          productImage: farmProds[0].images[0],
          quantity: 2,
          pricePerUnit: farmProds[0].pricePerUnit,
          unit: farmProds[0].unit,
          totalPrice: farmProds[0].pricePerUnit * 2,
          farmId: farm._id,
          farmName: farm.name,
        },
        {
          productId: farmProds[1]._id,
          productName: farmProds[1].name,
          productImage: farmProds[1].images[0],
          quantity: 1,
          pricePerUnit: farmProds[1].pricePerUnit,
          unit: farmProds[1].unit,
          totalPrice: farmProds[1].pricePerUnit * 1,
          farmId: farm._id,
          farmName: farm.name,
        },
      ];

      const subtotal = items.reduce((acc, item) => acc + item.totalPrice, 0);
      const deliveryFee = 25000;
      const tax = subtotal * 0.1;
      const total = subtotal + tax + deliveryFee;
      const status = orderStatuses[i % orderStatuses.length] as any;

      await orderModel.create({
        orderNumber: `ORD-SEED-${Date.now()}-${i}`,
        customerId: consumer._id,
        farmId: farm._id,
        items,
        totalItems: 3,
        subtotal,
        deliveryFee,
        tax,
        total,
        currency: 'VND',
        status,
        paymentStatus: paymentStatuses[i % paymentStatuses.length],
        paymentMethod: i % 2 === 0 ? 'cash' : 'stripe',
        deliveryMethod: 'farm_delivery',
        shippingAddress: {
          street: consumer.location.address.street,
          city: consumer.location.address.city,
          state: consumer.location.address.state,
          zipCode: consumer.location.address.zipCode,
          country: consumer.location.address.country,
        },
        timeline: [
          {
            status: 'pending',
            timestamp: new Date(),
            message: 'Order placed',
            updatedBy: String(consumer._id),
          },
          {
            status: status,
            timestamp: new Date(),
            message: `Status updated to ${status}`,
            updatedBy: String(farm.ownerId),
          },
        ],
        _seeded: true,
      });
    }

    // 6. Seed Posts
    const postTitles = [
      'Mùa thu hoạch cà chua mới',
      'Giảm giá 20% cho đơn hàng đầu tiên',
      'Hướng dẫn bảo quản rau củ tươi lâu',
      'Nông trại chúng tôi đạt chứng nhận VietGAP',
      'Lịch giao hàng dịp lễ 30/4',
    ];
    for (let i = 0; i < 5; i++) {
      await postModel.create({
        authorId: farmUsers[i % 3]._id,
        authorRole: 'farm',
        farmId: farms[i % 3]._id,
        title: postTitles[i],
        body: `Chào các bạn, ${farms[i % 3].name} xin thông báo: ${postTitles[i]}. Chúng tôi luôn cố gắng mang lại sản phẩm tốt nhất cho cộng đồng.`,
        media: [
          {
            url: `https://images.unsplash.com/photo-${1500000000000 + i}`,
            type: 'image',
          },
        ],
        _seeded: true,
      });
    }

    // 7. Seed Notifications
    const users = [...farmUsers, ...consumerUsers, suspendedUser];
    for (const user of users) {
      await notificationModel.create({
        userId: user._id,
        type: 'order_placed',
        title: 'Đơn hàng mới',
        message: 'Bạn đã đặt hàng thành công!',
        isRead: true,
        _seeded: true,
      });
      await notificationModel.create({
        userId: user._id,
        type: 'system',
        title: 'Chào mừng',
        message: `Chào mừng ${user.firstName} đến với F2T!`,
        isRead: false,
        _seeded: true,
      });
    }

    // 8. Seed Admin
    const ADMIN_PASSWORD = "AdminF2T2026!";
    const hashedAdminPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await userModel.create({
      email: "admin@f2t.com",
      password: hashedAdminPassword,
      firstName: "Admin",
      lastName: "F2T",
      phoneNumber: "0000000000",
      role: "admin",
      status: "active",
      emailVerified: true,
      location: {
        coordinates: { latitude: 10.762622, longitude: 106.660172 },
        address: {
          street: "123 Admin Street",
          city: "Ho Chi Minh City",
          state: "HCMC",
          zipCode: "700000",
          country: "Vietnam",
        },
      },
      _seeded: true,
    });

  } catch (error) {
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
