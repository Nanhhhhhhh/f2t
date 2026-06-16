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
import { Review } from '../modules/reviews/schemas/review.schema';
import { PriceOverride } from '../modules/dynamic-pricing/schemas/price-override.schema';

/* ──────────────────────────────────────────────────────────────────────────
 * F2T comprehensive demo seed.
 * Idempotent: every seeded doc carries `_seeded: true` and is wiped first
 * (reviews / price_overrides have no such flag, so those collections are
 * cleared wholesale — this script is dev/demo only and refuses to run in prod).
 * Credentials: farm/consumer = SeedPass123!  ·  admin@f2t.com = AdminF2T2026!
 * ────────────────────────────────────────────────────────────────────────── */

const SEED_PASSWORD = 'SeedPass123!';
const ADMIN_PASSWORD = 'AdminF2T2026!';

const log = (msg: string) => console.log(`  ✓ ${msg}`);
const daysAgoISO = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000);
const img = (seed: string) => `https://picsum.photos/seed/${seed}/600/400`;
const round = (n: number) => Math.round(n);

async function bootstrap() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to seed in production.');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const userModel = app.get<Model<User>>(getModelToken(User.name));
    const farmModel = app.get<Model<Farm>>(getModelToken(Farm.name));
    const productModel = app.get<Model<Product>>(getModelToken(Product.name));
    const orderModel = app.get<Model<Order>>(getModelToken(Order.name));
    const postModel = app.get<Model<Post>>(getModelToken(Post.name));
    const notificationModel = app.get<Model<Notification>>(getModelToken(Notification.name));
    const prefsModel = app.get<Model<NotificationPreferences>>(getModelToken(NotificationPreferences.name));
    const reviewModel = app.get<Model<Review>>(getModelToken(Review.name));
    const overrideModel = app.get<Model<PriceOverride>>(getModelToken(PriceOverride.name));

    console.log('\n🌱  F2T seed starting…\n');

    // ── 1. Clean previous data ──────────────────────────────────────────
    let cleared = 0;
    const wipeModels: Model<any>[] = [userModel, farmModel, productModel, orderModel, postModel, notificationModel, prefsModel];
    for (const m of wipeModels) {
      cleared += (await m.deleteMany({ _seeded: true })).deletedCount;
    }
    // reviews & price_overrides have no _seeded flag → demo-only collections, wipe all
    cleared += (await reviewModel.deleteMany({})).deletedCount;
    cleared += (await overrideModel.deleteMany({})).deletedCount;
    log(`cleared ${cleared} previous docs`);

    const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 10);
    const hashedAdmin = await bcrypt.hash(ADMIN_PASSWORD, 10);

    const userAddr = (street: string, city: string) => ({
      street,
      city,
      zipCode: '70000',
      country: 'Việt Nam',
    });

    // ── 2. Admin ────────────────────────────────────────────────────────
    const admin = await userModel.create({
      email: 'admin@f2t.com',
      password: hashedAdmin,
      firstName: 'Quản Trị',
      lastName: 'F2T',
      phoneNumber: '0900000000',
      role: 'admin',
      status: 'active',
      emailVerified: true,
      phoneVerified: true,
      location: { coordinates: { latitude: 10.7626, longitude: 106.6602 }, address: userAddr('1 Lê Duẩn', 'Hồ Chí Minh') },
      _seeded: true,
    });
    log('admin@f2t.com');

    // ── 3. Farm owners ──────────────────────────────────────────────────
    const farmOwnerSpecs = [
      { email: 'farm1@f2t.vn', firstName: 'Nguyễn Văn', lastName: 'Thắng', phone: '0911000001', lat: 11.9404, lng: 108.4583, street: '12 Trần Hưng Đạo', city: 'Đà Lạt' },
      { email: 'farm2@f2t.vn', firstName: 'Trần Thị', lastName: 'Mai', phone: '0911000002', lat: 10.5355, lng: 106.4137, street: '45 Hùng Vương', city: 'Long An' },
      { email: 'farm3@f2t.vn', firstName: 'Lê Quốc', lastName: 'Việt', phone: '0911000003', lat: 11.0089, lng: 106.513, street: '8 Tỉnh Lộ 8', city: 'Củ Chi, Hồ Chí Minh' },
      { email: 'farm4@f2t.vn', firstName: 'Phạm Thị', lastName: 'Hồng', phone: '0911000004', lat: 11.5753, lng: 108.0686, street: '90 Quốc Lộ 20', city: 'Lâm Đồng' },
    ];
    const farmUsers: any[] = [];
    for (const s of farmOwnerSpecs) {
      farmUsers.push(await userModel.create({
        email: s.email, password: hashedPassword, firstName: s.firstName, lastName: s.lastName,
        phoneNumber: s.phone, role: 'farm', status: 'active', emailVerified: true,
        avatarUrl: img(`owner-${s.email}`),
        location: { coordinates: { latitude: s.lat, longitude: s.lng }, address: userAddr(s.street, s.city) },
        _seeded: true,
      }));
    }
    log(`${farmUsers.length} farm owners`);

    // ── 4. Consumers (+ 1 suspended) ────────────────────────────────────
    const consumerSpecs = [
      { email: 'consumer1@f2t.vn', firstName: 'Phạm Thanh', lastName: 'Hải', phone: '0922000001' },
      { email: 'consumer2@f2t.vn', firstName: 'Hoàng Minh', lastName: 'Tuấn', phone: '0922000002' },
      { email: 'consumer3@f2t.vn', firstName: 'Đỗ Thị', lastName: 'Lan', phone: '0922000003' },
      { email: 'consumer4@f2t.vn', firstName: 'Vũ Đức', lastName: 'Anh', phone: '0922000004' },
      { email: 'consumer5@f2t.vn', firstName: 'Ngô Thị', lastName: 'Hương', phone: '0922000005' },
    ];
    const consumerUsers: any[] = [];
    for (let i = 0; i < consumerSpecs.length; i++) {
      const s = consumerSpecs[i];
      consumerUsers.push(await userModel.create({
        email: s.email, password: hashedPassword, firstName: s.firstName, lastName: s.lastName,
        phoneNumber: s.phone, role: 'consumer', status: 'active', emailVerified: true,
        avatarUrl: img(`user-${s.email}`),
        location: { coordinates: { latitude: 10.77 + i * 0.04, longitude: 106.66 + i * 0.04 }, address: userAddr(`${100 + i} Nguyễn Huệ`, 'Hồ Chí Minh') },
        _seeded: true,
      }));
    }
    const suspendedUser = await userModel.create({
      email: 'suspended@f2t.vn', password: hashedPassword, firstName: 'Trương', lastName: 'Vô Kỵ',
      phoneNumber: '0999999999', role: 'consumer', status: 'suspended', isBanned: true,
      location: { coordinates: { latitude: 10.8, longitude: 106.8 }, address: userAddr('999 Độc Lập', 'Hồ Chí Minh') },
      _seeded: true,
    });
    log(`${consumerUsers.length} consumers + 1 suspended`);

    // ── 5. Farms (3 verified, 1 pending for the admin-verify demo) ──────
    const businessHours = {
      monday: { isOpen: true, openTime: '07:00', closeTime: '17:00' },
      tuesday: { isOpen: true, openTime: '07:00', closeTime: '17:00' },
      wednesday: { isOpen: true, openTime: '07:00', closeTime: '17:00' },
      thursday: { isOpen: true, openTime: '07:00', closeTime: '17:00' },
      friday: { isOpen: true, openTime: '07:00', closeTime: '17:00' },
      saturday: { isOpen: true, openTime: '08:00', closeTime: '12:00' },
      sunday: { isOpen: false, openTime: '00:00', closeTime: '00:00' },
    };
    const farmSpecs = [
      { name: 'Nông Trại Xanh Đà Lạt', desc: 'Chuyên rau củ ôn đới canh tác hữu cơ trên cao nguyên Đà Lạt, đạt chuẩn VietGAP.', verification: 'verified' },
      { name: 'Vườn Trái Cây Phú Mỹ', desc: 'Trái cây nhiệt đới đặc sản miền Tây, thu hoạch và giao trong ngày.', verification: 'verified' },
      { name: 'Trang Trại Sạch Củ Chi', desc: 'Nông sản & thực phẩm sạch ven đô, từ rau củ tới trứng gà ta thả vườn.', verification: 'verified' },
      { name: 'Nông Sản Cao Nguyên Lâm Đồng', desc: 'Hợp tác xã mới gia nhập F2T, cung cấp nấm, sữa tươi và rau cao nguyên.', verification: 'pending' },
    ];
    const farms: any[] = [];
    for (let i = 0; i < farmSpecs.length; i++) {
      const s = farmSpecs[i];
      const owner = farmUsers[i];
      farms.push(await farmModel.create({
        ownerId: owner._id,
        name: s.name,
        description: s.desc,
        location: { type: 'Point', coordinates: [owner.location.coordinates.longitude, owner.location.coordinates.latitude] },
        address: { street: owner.location.address.street, city: owner.location.address.city, zipCode: '70000', country: 'Việt Nam' },
        contactEmail: owner.email,
        contactPhone: owner.phoneNumber,
        deliveryMethods: i % 2 === 0 ? ['both'] : ['farm_delivery'],
        businessHours,
        restockSchedule: [
          { category: 'leafy', intervalDays: 2 },
          { category: 'fruit', intervalDays: 5 },
          { category: 'root', intervalDays: 7 },
        ],
        isActive: true,
        verificationStatus: s.verification,
        logoUrl: img(`farm-logo-${i}`),
        coverImageUrl: img(`farm-cover-${i}`),
        profileImageUrl: img(`farm-logo-${i}`),
        bannerImageUrl: img(`farm-cover-${i}`),
        _seeded: true,
      }));
    }
    log(`${farms.length} farms (3 verified, 1 pending)`);

    // ── 6. Products ─────────────────────────────────────────────────────
    // farm: index · category aligned to the 4 RL categories + extras for cross-sell.
    const productSpecs = [
      // Farm 0 — Đà Lạt rau củ
      { farm: 0, name: 'Xà Lách Mỹ', category: 'leafy', unit: 'bunch', price: 18000, qty: 80, organic: true, shelf: 5, harvest: 1, status: 'available' },
      { farm: 0, name: 'Cải Bó Xôi', category: 'leafy', unit: 'bunch', price: 22000, qty: 6, organic: true, shelf: 4, harvest: 2, status: 'available' }, // low stock
      { farm: 0, name: 'Cà Rốt Đà Lạt', category: 'root', unit: 'kg', price: 28000, qty: 120, organic: false, shelf: 14, harvest: 3, status: 'available' },
      { farm: 0, name: 'Khoai Tây', category: 'root', unit: 'kg', price: 25000, qty: 150, organic: false, shelf: 21, harvest: 5, status: 'available' },
      { farm: 0, name: 'Húng Quế', category: 'herbs', unit: 'bunch', price: 12000, qty: 40, organic: true, shelf: 3, harvest: 1, status: 'available' },
      // Farm 1 — Long An trái cây
      { farm: 1, name: 'Xoài Cát Hòa Lộc', category: 'fruit', unit: 'kg', price: 65000, qty: 60, organic: false, shelf: 7, harvest: 2, status: 'available' },
      { farm: 1, name: 'Thanh Long Ruột Đỏ', category: 'fruit', unit: 'kg', price: 45000, qty: 90, organic: true, shelf: 9, harvest: 1, status: 'available' },
      { farm: 1, name: 'Dưa Hấu Không Hạt', category: 'fruit', unit: 'kg', price: 18000, qty: 0, organic: false, shelf: 10, harvest: 4, status: 'sold_out' }, // sold out
      { farm: 1, name: 'Rau Muống Nước', category: 'leafy', unit: 'bunch', price: 10000, qty: 70, organic: false, shelf: 3, harvest: 1, status: 'available' },
      { farm: 1, name: 'Mật Ong Rừng U Minh', category: 'honey', unit: 'liter', price: 250000, qty: 30, organic: true, shelf: 365, harvest: 20, status: 'available' },
      // Farm 2 — Củ Chi đa dạng
      { farm: 2, name: 'Chuối Sứ', category: 'fruit', unit: 'bunch', price: 35000, qty: 50, organic: true, shelf: 6, harvest: 2, status: 'available' },
      { farm: 2, name: 'Cam Sành', category: 'fruit', unit: 'kg', price: 40000, qty: 100, organic: false, shelf: 12, harvest: 3, status: 'available' },
      { farm: 2, name: 'Khoai Lang Mật', category: 'root', unit: 'kg', price: 30000, qty: 130, organic: true, shelf: 20, harvest: 6, status: 'available' },
      { farm: 2, name: 'Củ Cải Trắng', category: 'root', unit: 'kg', price: 16000, qty: 4, organic: false, shelf: 14, harvest: 5, status: 'available' }, // low stock
      { farm: 2, name: 'Trứng Gà Ta Thả Vườn', category: 'eggs', unit: 'box', price: 48000, qty: 200, organic: true, shelf: 21, harvest: 1, status: 'available' },
      { farm: 2, name: 'Ngò Rí', category: 'herbs', unit: 'bunch', price: 9000, qty: 55, organic: true, shelf: 3, harvest: 1, status: 'available' },
      { farm: 2, name: 'Tía Tô', category: 'herbs', unit: 'bunch', price: 11000, qty: 45, organic: true, shelf: 3, harvest: 2, status: 'available' },
      // Farm 3 — Lâm Đồng (pending)
      { farm: 3, name: 'Cải Ngọt', category: 'leafy', unit: 'bunch', price: 15000, qty: 60, organic: true, shelf: 4, harvest: 1, status: 'available' },
      { farm: 3, name: 'Bưởi Năm Roi', category: 'fruit', unit: 'piece', price: 35000, qty: 40, organic: false, shelf: 25, harvest: 8, status: 'available' },
      { farm: 3, name: 'Nấm Bào Ngư', category: 'mushrooms', unit: 'kg', price: 60000, qty: 35, organic: true, shelf: 5, harvest: 1, status: 'available' },
      { farm: 3, name: 'Sữa Tươi Thanh Trùng', category: 'dairy', unit: 'liter', price: 32000, qty: 80, organic: false, shelf: 7, harvest: 1, status: 'available' },
      { farm: 3, name: 'Bạc Hà', category: 'herbs', unit: 'bunch', price: 13000, qty: 30, organic: true, shelf: 3, harvest: 2, status: 'seasonal' },
    ];
    const products: any[] = [];
    for (const s of productSpecs) {
      const p = await productModel.create({
        farmId: farms[s.farm]._id,
        name: s.name,
        description: `${s.name} tươi sạch từ ${farms[s.farm].name}, thu hoạch ${s.harvest} ngày trước, không hóa chất độc hại. Cam kết chất lượng đạt chuẩn.`,
        category: s.category,
        pricePerUnit: s.price,
        unit: s.unit,
        availableQuantity: s.qty,
        minimumOrder: 1,
        status: s.status,
        images: [img(`prod-${s.name}`)],
        harvestDate: daysAgoISO(s.harvest),
        deliveryDate: daysFromNow(1).toISOString(),
        estimatedShelfLife: s.shelf,
        isOrganic: s.organic,
        farmingMethods: s.organic ? ['Hữu cơ', 'VietGAP'] : ['VietGAP'],
        qualityGrade: s.organic ? 'A+' : 'A',
        freshnessLevel: s.harvest <= 2 ? 'fresh' : s.harvest <= 5 ? 'good' : 'aging',
        seasonalAvailability: ['Quanh năm'],
        tags: [s.category, s.organic ? 'hữu cơ' : 'sạch', 'tươi'],
        nutritionalInfo: { calories: 45, protein: 2, carbs: 9, fat: 0, fiber: 2 },
        storageInstructions: 'Bảo quản nơi khô ráo, ngăn mát tủ lạnh.',
        packagingType: 'Túi giấy thân thiện môi trường',
        lastRestockedAt: new Date(),
        averageRating: 0,
        reviewCount: 0,
        _seeded: true,
      });
      (p as any).__farm = s.farm;
      products.push(p);
    }
    log(`${products.length} products across ${new Set(productSpecs.map((p) => p.category)).size} categories`);

    const farmProducts = (fi: number) => products.filter((p) => (p as any).__farm === fi);

    // ── 7. Orders (full lifecycle) ──────────────────────────────────────
    const orderPlan = [
      { c: 0, f: 0, items: [0, 2], status: 'delivered', method: 'farm_delivery', pay: 'stripe' },
      { c: 1, f: 1, items: [0, 1], status: 'delivered', method: 'farm_delivery', pay: 'stripe' },
      { c: 2, f: 2, items: [4, 1], status: 'delivered', method: 'farm_delivery', pay: 'cash' },
      { c: 3, f: 0, items: [3, 4], status: 'delivered', method: 'pickup', pay: 'cash' },
      { c: 4, f: 2, items: [0, 2, 4], status: 'delivered', method: 'farm_delivery', pay: 'stripe' },
      { c: 0, f: 1, items: [4], status: 'shipped', method: 'farm_delivery', pay: 'stripe' },
      { c: 1, f: 2, items: [5, 6], status: 'preparing', method: 'farm_delivery', pay: 'cash' },
      { c: 2, f: 0, items: [0, 1], status: 'confirmed', method: 'pickup', pay: 'cash' },
      { c: 3, f: 3, items: [2, 3], status: 'pending', method: 'farm_delivery', pay: 'cash' },
      { c: 4, f: 1, items: [0], status: 'ready_for_pickup', method: 'pickup', pay: 'stripe' },
      { c: 0, f: 2, items: [3], status: 'cancelled', method: 'farm_delivery', pay: 'cash' },
      { c: 1, f: 3, items: [0, 2], status: 'delivered', method: 'farm_delivery', pay: 'stripe' },
    ];
    const STEP_MSG: Record<string, string> = {
      pending: 'Đơn hàng đã được tạo, chờ nông trại xác nhận',
      confirmed: 'Nông trại đã xác nhận đơn hàng',
      preparing: 'Đang chuẩn bị & đóng gói nông sản',
      ready_for_pickup: 'Đơn đã sẵn sàng để lấy',
      shipped: 'Đơn hàng đang được giao',
      delivered: 'Giao hàng thành công',
      cancelled: 'Đơn hàng đã bị huỷ',
    };
    const flowOf = (status: string): string[] => {
      if (status === 'cancelled') return ['pending', 'cancelled'];
      const f = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'];
      const alt = ['pending', 'confirmed', 'preparing', 'ready_for_pickup'];
      const chain = status === 'ready_for_pickup' ? alt : f;
      return chain.slice(0, chain.indexOf(status) + 1);
    };
    const orders: any[] = [];
    let orderSeq = 0;
    for (const plan of orderPlan) {
      const consumer = consumerUsers[plan.c];
      const farm = farms[plan.f];
      const fps = farmProducts(plan.f);
      const items = plan.items.map((idx) => {
        const p = fps[idx % fps.length];
        const qty = 1 + (idx % 3);
        return {
          productId: p._id, productName: p.name, productImage: p.images[0],
          quantity: qty, pricePerUnit: p.pricePerUnit, unit: p.unit,
          totalPrice: p.pricePerUnit * qty, farmId: farm._id, farmName: farm.name,
        };
      });
      const subtotal = items.reduce((a, it) => a + it.totalPrice, 0);
      const deliveryFee = plan.method === 'pickup' ? 0 : 25000;
      const tax = round(subtotal * 0.08);
      const total = subtotal + deliveryFee + tax;
      const totalItems = items.reduce((a, it) => a + it.quantity, 0);

      const isPaid = ['delivered', 'shipped'].includes(plan.status) || (plan.pay === 'stripe' && !['pending', 'cancelled'].includes(plan.status));
      const paymentStatus = plan.status === 'cancelled' ? (plan.pay === 'stripe' ? 'refunded' : 'failed') : plan.status === 'pending' ? 'pending' : isPaid ? 'paid' : 'pending';

      const flow = flowOf(plan.status);
      const baseTime = Date.now() - (12 - orderSeq) * 86_400_000;
      const timeline = flow.map((st, k) => ({
        status: st, timestamp: new Date(baseTime + k * 3_600_000),
        message: STEP_MSG[st], updatedBy: st === 'pending' ? String(consumer._id) : String(farm.ownerId),
      }));
      const trackingSteps = flow.map((st, k) => ({
        status: st, description: STEP_MSG[st], timestamp: new Date(baseTime + k * 3_600_000), location: farm.address.city,
      }));

      const order = await orderModel.create({
        orderNumber: `ORD-${new Date(baseTime).toISOString().slice(0, 10).replace(/-/g, '')}-${String(++orderSeq).padStart(3, '0')}`,
        customerId: consumer._id, farmId: farm._id, items, totalItems,
        subtotal, deliveryFee, tax, total, currency: 'VND',
        status: plan.status, paymentStatus, paymentMethod: plan.pay,
        deliveryMethod: plan.method,
        ...(plan.pay === 'stripe' && paymentStatus === 'paid'
          ? { stripeSessionId: `cs_test_seed_${orderSeq}`, stripePaymentIntentId: `pi_test_seed_${orderSeq}`, paidAt: new Date(baseTime + 3_600_000) }
          : {}),
        ...(plan.method === 'farm_delivery' && ['shipped', 'delivered'].includes(plan.status)
          ? { ghnOrderCode: `GHN${100000 + orderSeq}`, trackingCode: `TRACK${100000 + orderSeq}`, estimatedDeliveryDate: daysFromNow(1) }
          : {}),
        shippingAddress: plan.method === 'pickup' ? undefined : {
          fullName: `${consumer.firstName} ${consumer.lastName}`,
          phone: consumer.phoneNumber,
          street: consumer.location.address.street,
          city: consumer.location.address.city,
          zipCode: consumer.location.address.zipCode,
          country: consumer.location.address.country,
        },
        deliveryDate: daysFromNow(1).toISOString().slice(0, 10),
        deliveryTimeSlot: '08:00 - 12:00',
        timeline, trackingSteps,
        _seeded: true,
      });
      (order as any).__plan = plan;
      orders.push(order);
    }
    log(`${orders.length} orders (delivered/shipped/preparing/confirmed/ready/pending/cancelled)`);

    // ── 8. Reviews (for delivered orders) + recompute product ratings ───
    const REVIEW_TEXTS = [
      'Rau củ rất tươi, giao nhanh, sẽ ủng hộ tiếp!',
      'Chất lượng tốt, đóng gói cẩn thận, giá hợp lý.',
      'Sản phẩm sạch đúng như mô tả, gia đình rất thích.',
      'Tươi ngon, nhưng giao hơi trễ một chút.',
      'Đáng đồng tiền, organic thật sự khác biệt.',
    ];
    const ratingsByProduct = new Map<string, number[]>();
    let reviewCount = 0;
    for (const order of orders) {
      if (order.status !== 'delivered') continue;
      const consumer = consumerUsers.find((u) => String(u._id) === String(order.customerId));
      for (let k = 0; k < Math.min(order.items.length, 2); k++) {
        const it = order.items[k];
        const rating = 4 + ((reviewCount + k) % 2); // 4 or 5
        await reviewModel.create({
          productId: it.productId, orderId: order._id, customerId: order.customerId,
          customerName: `${consumer.firstName} ${consumer.lastName}`,
          customerAvatarUrl: consumer.avatarUrl,
          rating, comment: REVIEW_TEXTS[reviewCount % REVIEW_TEXTS.length], photos: [],
        });
        const key = String(it.productId);
        ratingsByProduct.set(key, [...(ratingsByProduct.get(key) ?? []), rating]);
        reviewCount++;
      }
    }
    for (const [productId, ratings] of ratingsByProduct) {
      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      await productModel.updateOne({ _id: productId }, { averageRating: Math.round(avg * 10) / 10, reviewCount: ratings.length });
    }
    log(`${reviewCount} reviews across ${ratingsByProduct.size} products (ratings recomputed)`);

    // ── 9. Price-override suggestions (farm1 owner's pending review) ─────
    const tagFor = (score: number) => (score >= 0.8 ? 'fresh' : score >= 0.4 ? 'aging' : 'critical');
    const overrideSpecs = [
      { farm: 0, prod: 1, score: 0.45, delta: -12, mode: 'advisory', status: 'pending_review' }, // Cải Bó Xôi aging, low stock
      { farm: 0, prod: 2, score: 0.88, delta: 8, mode: 'advisory', status: 'pending_review' }, // Cà Rốt fresh, premium
      { farm: 0, prod: 4, score: 0.35, delta: -25, mode: 'advisory', status: 'pending_review' }, // Húng Quế critical
      { farm: 2, prod: 3, score: 0.4, delta: -18, mode: 'advisory', status: 'pending_review' }, // Củ Cải low stock
      { farm: 1, prod: 0, score: 0.9, delta: 10, mode: 'shadow', status: 'shadow' }, // Xoài shadow
    ];
    let overrideCount = 0;
    for (const s of overrideSpecs) {
      const p = farmProducts(s.farm)[s.prod];
      if (!p) continue;
      const target = round(p.pricePerUnit * (1 + s.delta / 100));
      await overrideModel.create({
        productId: p._id, farmId: farms[s.farm]._id, basePrice: p.pricePerUnit,
        targetPrice: target, deltaPct: s.delta, freshnessScore: s.score, freshnessTag: tagFor(s.score),
        safetyClipped: s.delta <= -20, mode: s.mode, status: s.status,
        computedAt: new Date(), expiresAt: daysFromNow(1),
      });
      overrideCount++;
    }
    log(`${overrideCount} price-override suggestions (4 pending_review for farm1, 1 shadow)`);

    // ── 10. Posts (community feed) ──────────────────────────────────────
    const postSpecs = [
      { f: 0, title: 'Mùa thu hoạch xà lách Đà Lạt', hashtags: ['dalat', 'rausach', 'huuco'] },
      { f: 1, title: 'Xoài Cát Hòa Lộc vào vụ — giao trong ngày', hashtags: ['traicay', 'xoaicat', 'mienTay'] },
      { f: 2, title: 'Trứng gà ta thả vườn — số lượng có hạn', hashtags: ['trungga', 'sach'] },
      { f: 3, title: 'Nông Sản Cao Nguyên chính thức gia nhập F2T', hashtags: ['f2t', 'lamdong'] },
      { f: 0, title: 'Mẹo bảo quản rau củ tươi lâu gấp đôi', hashtags: ['meovat', 'baoquan'] },
    ];
    let postCount = 0;
    for (const s of postSpecs) {
      const owner = farmUsers[s.f];
      await postModel.create({
        authorId: owner._id, authorRole: 'farm', farmId: farms[s.f]._id,
        title: s.title,
        body: `${farms[s.f].name} xin chia sẻ: ${s.title}. Chúng tôi luôn nỗ lực mang nông sản sạch, an toàn đến cộng đồng. Cảm ơn quý khách đã ủng hộ! 🌿`,
        media: [{ url: img(`post-${postCount}`), type: 'image' }],
        hashtags: s.hashtags,
        likesCount: 5 + postCount * 3,
        commentsCount: postCount % 3,
        comments: postCount % 3 > 0 ? [{
          authorId: consumerUsers[postCount % consumerUsers.length]._id,
          authorName: `${consumerUsers[postCount % consumerUsers.length].firstName} ${consumerUsers[postCount % consumerUsers.length].lastName}`,
          content: 'Sản phẩm bên mình tuyệt vời lắm!',
        }] : [],
        _seeded: true,
      });
      postCount++;
    }
    log(`${postCount} community posts`);

    // ── 11. Notifications ───────────────────────────────────────────────
    let notif = 0;
    const addNotif = async (userId: any, type: string, title: string, message: string, isRead: boolean, ref?: { id: string; type: string }) => {
      await notificationModel.create({ userId, type, title, message, isRead, referenceId: ref?.id, referenceType: ref?.type, pushSent: isRead, _seeded: true });
      notif++;
    };
    // consumers: order updates from their orders
    for (const order of orders) {
      const map: Record<string, { type: string; title: string; msg: string }> = {
        delivered: { type: 'order_delivered', title: 'Đơn đã giao', msg: `Đơn ${order.orderNumber} đã giao thành công.` },
        shipped: { type: 'order_shipped', title: 'Đơn đang giao', msg: `Đơn ${order.orderNumber} đang trên đường tới bạn.` },
        confirmed: { type: 'order_confirmed', title: 'Đơn đã xác nhận', msg: `Nông trại đã xác nhận đơn ${order.orderNumber}.` },
        cancelled: { type: 'order_cancelled', title: 'Đơn đã huỷ', msg: `Đơn ${order.orderNumber} đã bị huỷ.` },
      };
      const m = map[order.status];
      if (m) await addNotif(order.customerId, m.type, m.title, m.msg, order.status === 'delivered', { id: String(order._id), type: 'order' });
    }
    // farms: new order + low stock + price suggestion
    for (let fi = 0; fi < farms.length; fi++) {
      const ownerId = farms[fi].ownerId;
      const farmOrders = orders.filter((o) => String(o.farmId) === String(farms[fi]._id));
      if (farmOrders.length) await addNotif(ownerId, 'new_order', 'Đơn hàng mới', `Bạn có ${farmOrders.length} đơn hàng cần xử lý.`, false, { id: String(farmOrders[0]._id), type: 'order' });
      for (const p of farmProducts(fi).filter((p) => p.availableQuantity > 0 && p.availableQuantity <= 8)) {
        await addNotif(ownerId, 'low_stock', 'Sắp hết hàng', `"${p.name}" chỉ còn ${p.availableQuantity} ${p.unit}.`, false, { id: String(p._id), type: 'product' });
      }
    }
    // farm1 owner: price suggestion notice
    await addNotif(farmUsers[0]._id, 'price_suggestion', 'Gợi ý giá mới', 'Có 3 gợi ý điều chỉnh giá đang chờ bạn duyệt.', false);
    // welcome to everyone
    for (const u of [...farmUsers, ...consumerUsers]) {
      await addNotif(u._id, 'system', 'Chào mừng đến F2T', `Xin chào ${u.firstName}, chúc bạn mua sắm nông sản sạch vui vẻ!`, true);
    }
    log(`${notif} notifications`);

    // ── 12. Notification preferences (one per user) ─────────────────────
    let prefs = 0;
    for (const u of [admin, ...farmUsers, ...consumerUsers, suspendedUser]) {
      await prefsModel.create({
        userId: u._id,
        emailNotifications: true, smsNotifications: u.role !== 'consumer', pushNotifications: true,
        orderUpdates: true, promotions: u.role === 'consumer', newsletter: false,
        _seeded: true,
      });
      prefs++;
    }
    log(`${prefs} notification preferences`);

    // ── Summary ─────────────────────────────────────────────────────────
    console.log('\n✅  Seed complete:');
    console.log(`    users:        ${1 + farmUsers.length + consumerUsers.length + 1} (1 admin, ${farmUsers.length} farm, ${consumerUsers.length} consumer, 1 suspended)`);
    console.log(`    farms:        ${farms.length} (3 verified, 1 pending)`);
    console.log(`    products:     ${products.length}`);
    console.log(`    orders:       ${orders.length}`);
    console.log(`    reviews:      ${reviewCount}`);
    console.log(`    suggestions:  ${overrideCount}`);
    console.log(`    posts:        ${postCount}`);
    console.log(`    notifications:${notif}`);
    console.log('\n    Login → farm1@f2t.vn / SeedPass123!   ·   admin@f2t.com / AdminF2T2026!\n');
  } catch (error) {
    console.error('\n❌  Seed failed:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();
