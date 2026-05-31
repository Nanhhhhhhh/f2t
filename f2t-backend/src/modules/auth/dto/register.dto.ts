import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CoordinatesDto {
  @ApiProperty()
  latitude!: number;
  @ApiProperty()
  longitude!: number;
}

class AddressDto {
  @ApiProperty()
  @IsString()
  street!: string;
  @ApiProperty()
  @IsString()
  city!: string;
  @ApiProperty()
  @IsString()
  zipCode!: string;
  @ApiProperty()
  @IsString()
  country!: string;
}

class LocationDto {
  @ApiProperty()
  @IsObject()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates!: CoordinatesDto;

  @ApiProperty()
  @IsObject()
  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;
}

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ example: '0901234567' })
  @IsString()
  @IsNotEmpty()
  phoneNumber!: string;

  @ApiProperty({ enum: ['consumer', 'farm'], default: 'consumer' })
  @IsEnum(['consumer', 'farm'])
  role!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
