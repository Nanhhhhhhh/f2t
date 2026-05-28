import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import {
  Notification,
  NotificationSchema,
} from './schemas/notification.schema';
import {
  NotificationPreferences,
  NotificationPreferencesSchema,
} from './schemas/notification-preferences.schema';
import { UsersModule } from '../users/users.module';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { Farm, FarmSchema } from '../farms/schemas/farm.schema';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      {
        name: NotificationPreferences.name,
        schema: NotificationPreferencesSchema,
      },
      { name: Product.name, schema: ProductSchema },
      { name: Farm.name, schema: FarmSchema },
    ]),
    forwardRef(() => UsersModule),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
