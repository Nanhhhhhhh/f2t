import { IsArray, IsBoolean, IsNumber } from 'class-validator';

export class PaginationResponseDto<T> {
  @IsArray()
  items!: T[];

  @IsNumber()
  total!: number;

  @IsNumber()
  page!: number;

  @IsNumber()
  limit!: number;

  @IsBoolean()
  hasMore!: boolean;

  constructor(items: T[], total: number, page: number, limit: number) {
    this.items = items;
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.hasMore = page * limit < total;
  }
}
