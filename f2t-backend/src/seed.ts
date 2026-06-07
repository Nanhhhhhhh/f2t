import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './modules/users/users.service';
import { FarmsService } from './modules/farms/farms.service';
import { ProductsService } from './modules/products/products.service';
import * as bcrypt from 'bcrypt';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const usersService = app.get(UsersService);
  const farmsService = app.get(FarmsService);
  const productsService = app.get(ProductsService);


  // Create Consumer
  let consumer = await (usersService as any).userModel.findOne({
    email: 'consumer@example.com',
  });
  const hashedPassword = await bcrypt.hash('password123', 10);
  if (!consumer) {
    consumer = await (usersService as any).userModel.create({
      email: 'consumer@example.com',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '0123456789',
      role: 'consumer',
      status: 'active',
      location: {
        coordinates: { latitude: 10.762622, longitude: 106.660172 },
        address: {
          street: '123 Nguyen Hue',
          city: 'Ho Chi Minh City',
          state: 'HCMC',
          zipCode: '70000',
          country: 'Vietnam',
        },
      },
    });
  } else {
  }

  // Create Farm Owner
  let farmOwner = await (usersService as any).userModel.findOne({
    email: 'farm@example.com',
  });
  if (!farmOwner) {
    farmOwner = await (usersService as any).userModel.create({
      email: 'farm@example.com',
      password: hashedPassword,
      firstName: 'Farmer',
      lastName: 'Joe',
      phoneNumber: '0987654321',
      role: 'farm',
      status: 'active',
      location: {
        coordinates: { latitude: 10.823099, longitude: 106.629664 },
        address: {
          street: '456 Farm Road',
          city: 'Ho Chi Minh City',
          state: 'HCMC',
          zipCode: '70000',
          country: 'Vietnam',
        },
      },
    });
  } else {
  }

  // Create Farm
  let farm = await (farmsService as any).farmModel.findOne({
    name: 'Green Valley Farm',
  });
  if (!farm) {
    farm = await farmsService.create(farmOwner._id.toString(), {
      name: 'Green Valley Farm',
      description: 'Fresh organic vegetables from the highlands of Da Lat.',
      contactEmail: 'contact@greenvalley.com',
      contactPhone: '02633123456',
      bannerImageUrl:
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef',
      profileImageUrl:
        'https://images.unsplash.com/photo-1589923188900-85dae523342b',
      coordinates: { latitude: 10.823099, longitude: 106.629664 },
      address: {
        street: '456 Farm Road',
        city: 'Da Lat',
        state: 'Lam Dong',
        zipCode: '67000',
        country: 'Vietnam',
      },
      isActive: true,
      deliveryMethods: ['pickup', 'farm_delivery'],
    } as any);
  } else {
  }

  // Create Products
  const products = [
    {
      name: 'Organic Carrots',
      description: 'Sweet and crunchy organic carrots.',
      pricePerUnit: 25000,
      unit: 'kg',
      category: 'root',
      images: ['https://images.unsplash.com/photo-1598170845058-32b9d6a5da37'],
      availableQuantity: 50,
      isOrganic: true,
      status: 'available',
    },
    {
      name: 'Fresh Strawberries',
      description: 'Juicy red strawberries picked daily.',
      pricePerUnit: 120000,
      unit: 'box',
      category: 'fruit',
      images: ['https://images.unsplash.com/photo-1464960144737-299f0b5d862e'],
      availableQuantity: 20,
      isOrganic: true,
      status: 'available',
    },
    {
      name: 'Highland Cabbage',
      description: 'Large, crisp cabbage heads.',
      pricePerUnit: 15000,
      unit: 'kg',
      category: 'leafy',
      images: ['https://images.unsplash.com/photo-1550142414-05748f683e60'],
      availableQuantity: 100,
      isOrganic: false,
      status: 'available',
    },
  ];

  for (const product of products) {
    await productsService.create(farmOwner._id.toString(), {
      ...product,
      farmId: farm._id.toString(),
    } as any);
  }

  await app.close();
}

seed().catch((err) => {
  if (err.errInfo && err.errInfo.details) {
  }
  process.exit(1);
});
