import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  IsBoolean,
  Min,
  Max,
  IsInt,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

class NutritionalInfoDto {
  @IsOptional() @IsNumber() calories?: number;
  @IsOptional() @IsNumber() protein?: number;
  @IsOptional() @IsNumber() carbs?: number;
  @IsOptional() @IsNumber() fat?: number;
  @IsOptional() @IsNumber() fiber?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) vitamins?: string[];
}

export class CreateProductDto {
  @ApiProperty() @IsString() @IsNotEmpty() farmId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiProperty() @IsString() @IsNotEmpty() description!: string;
  @ApiProperty({
    enum: [
      'leafy',
      'root',
      'fruit',
      'herbs',
      'mushrooms',
      'grains',
      'dairy',
      'eggs',
      'honey',
      'other',
    ],
  })
  @IsEnum([
    'leafy',
    'root',
    'fruit',
    'herbs',
    'mushrooms',
    'grains',
    'dairy',
    'eggs',
    'honey',
    'other',
  ])
  category!: string;

  @IsOptional() @IsString() subcategory?: string;

  @ApiProperty() @IsNumber() @Min(0) @IsOptional() pricePerUnit?: number;
  @ApiProperty() @IsNumber() @Min(0) @IsOptional() price?: number;

  @ApiProperty({ enum: ['kg', 'g', 'piece', 'bunch', 'box', 'bag', 'liter'] })
  @IsEnum(['kg', 'g', 'piece', 'bunch', 'box', 'bag', 'liter'])
  unit!: string;

  @ApiProperty() @IsNumber() @Min(0) @IsOptional() availableQuantity?: number;
  @ApiProperty() @IsNumber() @Min(0) @IsOptional() stockQuantity?: number;

  @ApiProperty() @IsNumber() @Min(1) minimumOrder!: number;
  @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];
  
  @IsOptional() @IsString() harvestDate?: string;
  @IsOptional() @IsString() deliveryDate?: string;
  @IsOptional() @IsNumber() @Min(1) estimatedShelfLife?: number;

  @IsOptional() @IsBoolean() isOrganic?: boolean;
  @IsOptional() @IsBoolean() organicCertified?: boolean;
  
  @IsOptional() @IsArray() @IsString({ each: true }) farmingMethods?: string[];
  @IsOptional() @IsString() qualityGrade?: string;
  @IsOptional() @IsString() freshnessLevel?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) seasonalAvailability?: string[];
  
  @IsOptional() @IsString() storageRequirements?: string;
  @IsOptional() @IsString() storageInstructions?: string;
  @IsOptional() @IsString() packagingType?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) allergenInfo?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];

  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional()
  @ValidateNested()
  @Type(() => NutritionalInfoDto)
  nutritionalInfo?: NutritionalInfoDto;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @IsOptional()
  @IsEnum(['available', 'sold_out', 'unavailable', 'seasonal'])
  status?: string;
}

export class GetProductsFilterDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  farmId?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxPrice?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  organicOnly?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  inSeason?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  inStock?: boolean;

  @IsOptional()
  @IsString()
  @IsEnum(['name', 'price', 'pricePerUnit', 'createdAt', 'availableQuantity'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  @IsEnum(['asc', 'desc'])
  sortOrder?: string = 'desc';

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @IsOptional()
  @Type(() => Number)
  radius?: number;
}
