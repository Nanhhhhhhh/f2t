import { IsString, IsIn } from 'class-validator';

export class ReviewSuggestionDto {
  @IsString()
  @IsIn(['accepted', 'rejected'])
  decision!: 'accepted' | 'rejected';
}
