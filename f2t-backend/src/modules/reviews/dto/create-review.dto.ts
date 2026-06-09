import { IsArray, IsInt, IsMongoId, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty()
  @IsMongoId()
  productId!: string;

  @ApiProperty()
  @IsMongoId()
  orderId!: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @MaxLength(500)
  comment!: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  photos?: string[];
}
