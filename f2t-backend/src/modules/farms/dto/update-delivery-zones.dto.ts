import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';

export class UpdateDeliveryZonesDto {
  // Mỗi zone là object đầy đủ ({ id, name, area:{center,radius,name}, deliveryFee,
  // estimatedDeliveryTime, ... }) — lưu nguyên để trang farm đọc lại zone.area.radius.
  @ApiProperty({ type: [Object] })
  @IsArray()
  zones!: Record<string, unknown>[];
}
