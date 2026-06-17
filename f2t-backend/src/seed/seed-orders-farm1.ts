import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../modules/users/schemas/user.schema';
import { Farm } from '../modules/farms/schemas/farm.schema';
import { Product } from '../modules/products/schemas/product.schema';
import { Order } from '../modules/orders/schemas/order.schema';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });


  try {
    const userModel = app.get<Model<User>>(getModelToken(User.name));
    const farmModel = app.get<Model<Farm>>(getModelToken(Farm.name));
    const productModel = app.get<Model<Product>>(getModelToken(Product.name));
    const orderModel = app.get<Model<Order>>(getModelToken(Order.name));

    // 1. Find the target farm user
    const farmUser = await userModel.findOne({ email: 'farm1@f2t.vn' });
    if (!farmUser) {
      process.exit(1);
    }

    // 2. Find the farm
    const farm = await farmModel.findOne({ ownerId: farmUser._id });
    if (!farm) {
      process.exit(1);
    }

    // 3. Find products for this farm
    const farmProducts = await productModel.find({ farmId: farm._id });
    if (farmProducts.length === 0) {
      process.exit(1);
    }

    // 4. Find consumer users
    const consumerUsers = await userModel.find({ role: 'consumer' });
    if (consumerUsers.length === 0) {
      process.exit(1);
    }

    // 5. Generate Orders
    
    const orderStatuses = [
      'pending',
      'confirmed',
      'preparing',
      'ready_for_pickup',
      'shipped',
      'delivered',
      'cancelled',
    ];
    
    const paymentMethods = ['cash', 'stripe'];
    const deliveryMethods = ['pickup', 'farm_delivery'];

    // Clear previous specific seed orders for this farm to avoid cluttering
    const cleared = await orderModel.deleteMany({ farmId: farm._id, _seeded: true });

    const now = new Date();
    const totalOrders = 30;

    for (let i = 0; i < totalOrders; i++) {
      const consumer = consumerUsers[i % consumerUsers.length];
      
      // Randomize number of items (1-4)
      const numItems = Math.floor(Math.random() * 4) + 1;
      const selectedProducts = [...farmProducts].sort(() => 0.5 - Math.random()).slice(0, numItems);
      
      const items = selectedProducts.map(p => {
        const qty = Math.floor(Math.random() * 5) + 1;
        return {
          productId: p._id as Types.ObjectId,
          productName: p.name,
          productImage: p.images[0] || 'https://via.placeholder.com/150',
          quantity: qty,
          pricePerUnit: p.pricePerUnit,
          unit: p.unit,
          totalPrice: p.pricePerUnit * qty,
          farmId: farm._id as Types.ObjectId,
          farmName: farm.name,
        };
      });

      const subtotal = items.reduce((acc, item) => acc + item.totalPrice, 0);
      const deliveryFee = 25000;
      const tax = Math.round(subtotal * 0.1); // 10% VAT — khớp OrdersService
      const total = subtotal + deliveryFee + tax;
      
      // Status cycling
      const status = orderStatuses[i % orderStatuses.length];
      
      // Random date in the last 90 days
      const daysAgo = Math.floor(Math.random() * 90);
      const orderDate = new Date(now.getTime() - (daysAgo + 2) * 24 * 60 * 60 * 1000); // at least 2 days old for realistic timeline
      
      const paymentMethod = paymentMethods[i % paymentMethods.length];
      const deliveryMethod = deliveryMethods[i % deliveryMethods.length];

      // Determine payment status
      let paymentStatus = 'paid';
      if (status === 'pending') paymentStatus = 'pending';
      if (status === 'cancelled') paymentStatus = 'refunded';

      const orderNumber = `ORD-${orderDate.getFullYear()}${(orderDate.getMonth() + 1).toString().padStart(2, '0')}${orderDate.getDate().toString().padStart(2, '0')}-${i.toString().padStart(4, '0')}`;

      // Tracking steps
      const trackingSteps = [
        {
          status: 'pending',
          description: 'Your order has been successfully placed and is awaiting confirmation from the farm.',
          timestamp: orderDate,
          location: 'System',
        },
        {
          status: 'confirmed',
          description: 'The farm has confirmed your order and is starting to prepare it.',
          timestamp: new Date(orderDate.getTime() + 2 * 60 * 60 * 1000),
          location: farm.name,
        },
        {
          status: 'preparing',
          description: 'Your products are being harvested and packed with care.',
          timestamp: new Date(orderDate.getTime() + 5 * 60 * 60 * 1000),
          location: farm.name,
        }
      ];

      if (deliveryMethod === 'pickup') {
        trackingSteps.push({
          status: 'ready_for_pickup',
          description: 'Your order is ready to be picked up at the farm.',
          timestamp: new Date(orderDate.getTime() + 24 * 60 * 60 * 1000),
          location: farm.name,
        });
      } else {
        trackingSteps.push({
          status: 'shipped',
          description: 'Your order has been handed over to the delivery partner.',
          timestamp: new Date(orderDate.getTime() + 25 * 60 * 60 * 1000),
          location: 'Ho Chi Minh City Delivery Hub',
        });
        trackingSteps.push({
          status: 'delivered',
          description: 'Your order has been delivered successfully.',
          timestamp: new Date(orderDate.getTime() + 48 * 60 * 60 * 1000),
          location: consumer.location.address.street,
        });
      }

      // Timeline
      const timeline = trackingSteps.map((step, index) => ({
        status: step.status,
        timestamp: step.timestamp,
        message: step.description,
        updatedBy: index === 0 ? 'customer' : 'farm',
      }));

      await orderModel.create({
        orderNumber,
        customerId: consumer._id,
        farmId: farm._id,
        items,
        totalItems: items.reduce((acc, item) => acc + item.quantity, 0),
        subtotal,
        deliveryFee,
        tax,
        total,
        currency: 'VND',
        status,
        paymentStatus,
        paymentMethod,
        stripeSessionId: `cs_test_${Math.random().toString(36).substring(7)}`,
        stripePaymentIntentId: `pi_${Math.random().toString(36).substring(7)}`,
        paymentTransactionId: paymentMethod === 'stripe' ? `txn_${Math.random().toString(36).substring(7)}` : `CASH-${Date.now()}-${i}`,
        paymentUrl: 'https://checkout.stripe.com/pay/test_' + Math.random().toString(36).substring(7),
        paidAt: new Date(orderDate.getTime() + 30 * 60 * 1000),
        deliveryMethod,
        shippingAddress: {
          street: consumer.location.address.street,
          city: consumer.location.address.city,
          state: consumer.location.address.state,
          zipCode: consumer.location.address.zipCode,
          country: consumer.location.address.country,
        },
        deliveryDate: new Date(orderDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        deliveryTimeSlot: '08:00 - 10:00',
        deliveryInstructions: 'Giao hàng sau giờ hành chính, vui lòng gọi trước.',
        specialInstructions: 'Đóng gói kỹ, tránh dập nát rau.',
        discountCode: 'FRESH2024',
        ghnOrderCode: `GHN${Math.random().toString().substring(2, 12)}`,
        trackingCode: `TRACK${Math.random().toString().substring(2, 10)}`,
        estimatedDeliveryDate: new Date(orderDate.getTime() + 3 * 24 * 60 * 60 * 1000),
        driverLocation: {
          latitude: consumer.location.coordinates.latitude - 0.005,
          longitude: consumer.location.coordinates.longitude - 0.005,
          updatedAt: new Date(),
        },
        trackingSteps,
        timeline,
        notes: `Seed order ${i + 1} for farm1@f2t.vn. All fields filled.`,
        createdAt: orderDate,
        updatedAt: new Date(),
        _seeded: true,
      });
    }

  } catch (error) {
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
