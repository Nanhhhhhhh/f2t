import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  IsNumberString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendEmailVerificationDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

export class VerifyEmailDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNumberString()
  @Length(6, 6)
  verificationCode!: string;
}

export class SendPhoneVerificationDto {
  @ApiProperty({ example: '0901234567' })
  @IsString()
  @IsNotEmpty()
  phoneNumber!: string;
}

export class VerifyPhoneDto {
  @ApiProperty({ example: '0901234567' })
  @IsString()
  @IsNotEmpty()
  phoneNumber!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNumberString()
  @Length(6, 6)
  verificationCode!: string;
}
