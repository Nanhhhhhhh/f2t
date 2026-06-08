import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CrossSellQueryDto {
  @ApiProperty({ description: 'Comma-separated productIds đang có trong giỏ' })
  @IsString()
  productIds!: string;

  @ApiPropertyOptional({ description: 'Số gợi ý tối đa', default: 6 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;
}
