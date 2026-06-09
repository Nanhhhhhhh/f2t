import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class FarmCoordinatesDto {
  @ApiProperty() @IsNumber() latitude!: number;
  @ApiProperty() @IsNumber() longitude!: number;
}

// Address shape gửi từ form farm-register (có thêm streetNumber/formattedAddress)
class FarmAddressDto {
  @ApiProperty() @IsString() street!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() streetNumber?: string;
  @ApiProperty() @IsString() city!: string;
  @ApiProperty() @IsString() zipCode!: string;
  @ApiProperty() @IsString() country!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() formattedAddress?: string;
}

class FarmRegisterLocationDto {
  @ApiProperty()
  @ValidateNested()
  @Type(() => FarmCoordinatesDto)
  coordinates!: FarmCoordinatesDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => FarmAddressDto)
  address!: FarmAddressDto;
}

class FarmInfoDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiProperty() @IsString() @IsNotEmpty() description!: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => FarmRegisterLocationDto)
  location!: FarmRegisterLocationDto;

  @ApiProperty() @IsEmail() contactEmail!: string;
  @ApiProperty() @IsString() contactPhone!: string;

  @ApiProperty({ enum: ['pickup', 'farm_delivery', 'both'], isArray: true })
  @IsArray()
  @IsEnum(['pickup', 'farm_delivery', 'both'], { each: true })
  deliveryMethods!: string[];

  @ApiPropertyOptional() @IsOptional() @IsNumber() deliveryRadius?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() deliveryFee?: number;
}

export class RegisterFarmDto {
  @ApiProperty({ example: 'farmer@example.com' }) @IsEmail() email!: string;
  @ApiProperty({ example: 'password123' }) @IsString() @MinLength(6) password!: string;
  @ApiProperty() @IsString() @IsNotEmpty() firstName!: string;
  @ApiProperty() @IsString() @IsNotEmpty() lastName!: string;
  @ApiProperty() @IsString() @IsNotEmpty() phoneNumber!: string;

  @ApiPropertyOptional({ enum: ['consumer', 'farm'], default: 'farm' })
  @IsOptional()
  @IsEnum(['consumer', 'farm'])
  role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => FarmRegisterLocationDto)
  location?: FarmRegisterLocationDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => FarmInfoDto)
  farmInfo!: FarmInfoDto;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() acceptTerms?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() businessLicense?: string;
}
