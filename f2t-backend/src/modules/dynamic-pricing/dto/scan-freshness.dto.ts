import { IsString, IsNotEmpty } from 'class-validator';

export class ScanFreshnessDto {
  @IsString()
  @IsNotEmpty()
  image_b64!: string;

  @IsString()
  @IsNotEmpty()
  category!: string;
}
