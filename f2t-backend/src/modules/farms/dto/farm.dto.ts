import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsNumber,
  IsBoolean,
  ValidateNested,
  IsInt,
  Min,
  Max,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';

class CoordinatesDto {
  @ApiProperty()
  @IsNumber()
  latitude!: number;

  @ApiProperty()
  @IsNumber()
  longitude!: number;
}

export class AddressDto {
  @ApiProperty() @IsString() street!: string;
  @ApiProperty() @IsString() city!: string;
  @ApiProperty() @IsString() zipCode!: string;
  @ApiProperty() @IsString() country!: string;
}

export class CreateFarmDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiProperty() @IsString() @IsNotEmpty() description!: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates!: CoordinatesDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;

  @ApiProperty() @IsEmail() contactEmail!: string;
  @ApiProperty() @IsString() contactPhone!: string;

  @ApiProperty({ enum: ['pickup', 'farm_delivery', 'both'], isArray: true })
  @IsArray()
  @IsEnum(['pickup', 'farm_delivery', 'both'], { each: true })
  deliveryMethods!: string[];

  @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() farmingArea?: number;
}

export class UpdateFarmDto extends PartialType(CreateFarmDto) {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @IsString()
  logoUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @IsString()
  coverImageUrl?: string;
}

export class RestockScheduleItemDto {
  @ApiProperty({ example: 'vegetables' })
  @IsString()
  category!: string;

  @ApiProperty({ example: 4, minimum: 1, maximum: 30 })
  @IsInt()
  @Min(1)
  @Max(30)
  intervalDays!: number;
}

export class UpdateRestockScheduleDto {
  @ApiProperty({ type: [RestockScheduleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RestockScheduleItemDto)
  schedule!: RestockScheduleItemDto[];
}

export class GetFarmsFilterDto {
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
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  radius?: number; // in km

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsOptional()
  @IsString()
  deliveryMethod?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['name', 'createdAt', 'distance'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  @IsEnum(['asc', 'desc'])
  sortOrder?: string = 'desc';
}
