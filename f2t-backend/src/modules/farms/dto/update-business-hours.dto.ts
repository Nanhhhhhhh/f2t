import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:MM format

class DayHoursDto {
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'open must be in HH:MM format' })
  open?: string;

  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'close must be in HH:MM format' })
  close?: string;

  @IsOptional()
  closed?: boolean;
}

export class UpdateBusinessHoursDto {
  @ApiPropertyOptional() @IsOptional() monday?: DayHoursDto;
  @ApiPropertyOptional() @IsOptional() tuesday?: DayHoursDto;
  @ApiPropertyOptional() @IsOptional() wednesday?: DayHoursDto;
  @ApiPropertyOptional() @IsOptional() thursday?: DayHoursDto;
  @ApiPropertyOptional() @IsOptional() friday?: DayHoursDto;
  @ApiPropertyOptional() @IsOptional() saturday?: DayHoursDto;
  @ApiPropertyOptional() @IsOptional() sunday?: DayHoursDto;
}
