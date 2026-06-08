import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RecommendationsService } from './recommendations.service';
import { CrossSellQueryDto } from './dto/cross-sell.dto';

@ApiTags('recommendations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly service: RecommendationsService) {}

  @Get('cross-sell')
  @ApiOperation({ summary: 'Sản phẩm "thường mua kèm" theo nội dung giỏ hàng (cross-sell)' })
  @ApiResponse({ status: 200, description: 'Danh sách sản phẩm gợi ý' })
  async crossSell(@Query() query: CrossSellQueryDto) {
    const ids = (query.productIds ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!ids.length) return [];
    return this.service.getCrossSell(ids, query.limit ?? 6);
  }
}
