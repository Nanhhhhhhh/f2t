import { IsNumber, Min, Max, IsString, IsIn } from 'class-validator';

export class SubmitFreshnessDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  score!: number;

  @IsString()
  @IsIn(['leafy', 'root', 'fruit', 'herbs', 'mushrooms', 'grains', 'dairy', 'eggs', 'honey', 'other'])
  category!: string;
}
