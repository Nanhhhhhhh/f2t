import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FarmsService } from './farms.service';
import { FarmsController } from './farms.controller';
import { Farm, FarmSchema } from './schemas/farm.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Farm.name, schema: FarmSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [FarmsController],
  providers: [FarmsService],
  exports: [FarmsService, MongooseModule],
})
export class FarmsModule {}
