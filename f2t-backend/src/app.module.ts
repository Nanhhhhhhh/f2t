import { DynamicPricingModule } from "./modules/dynamic-pricing/dynamic-pricing.module";
import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { DynamicPricingInterceptor } from './common/interceptors/dynamic-pricing.interceptor';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { FarmsModule } from './modules/farms/farms.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PostsModule } from './modules/posts/posts.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { AdminModule } from './modules/admin/admin.module';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from './common/redis/redis.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000,
        limit: 200,
      },
    ]),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        MONGODB_URI: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
        JWT_EXPIRATION: Joi.string().default('1h'),
        JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'staging', 'test')
          .default('development'),
        STRIPE_SECRET_KEY: Joi.string().optional(),
        STRIPE_WEBHOOK_SECRET: Joi.string().optional(),
        STRIPE_CURRENCY: Joi.string().optional().default('vnd'),
        GHN_API_URL: Joi.string().optional(),
        GHN_TOKEN: Joi.string().optional(),
        GHN_SHOP_ID: Joi.string().optional(),
        GHN_SERVICE_ID: Joi.number().optional().default(53321),
        UPLOAD_BASE_URL: Joi.string().optional(),
        PRICING_SIDECAR_URL: Joi.string().optional().default("http://localhost:8000"),
        PRICING_MODE: Joi.string().valid("shadow", "advisory").default("shadow"),
        PRICING_CRON_SCHEDULE: Joi.string().optional().default("0 * * * *"),
        PRICING_SUGGESTION_TTL_HOURS: Joi.number().optional().default(1),
        REDIS_URL: Joi.string().optional().default('redis://localhost:6379'),
      }),
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    FarmsModule,
    ProductsModule,
    OrdersModule,
    PostsModule,
    NotificationsModule,
    UploadsModule,
    PaymentsModule,
    DeliveryModule,
    AdminModule,
    DynamicPricingModule,
    RedisModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: DynamicPricingInterceptor,
    },
  ],
})
export class AppModule {}
