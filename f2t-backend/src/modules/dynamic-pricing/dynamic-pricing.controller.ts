import { Controller, Post, Get, Patch, Param, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@modules/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@common/decorators/current-user.decorator";
import { AdminGuard } from "@modules/admin/guards/admin.guard";
import { DynamicPricingService } from "./dynamic-pricing.service";
import { PricingTickCron } from "./pricing-tick.cron";
import { SubmitFreshnessDto } from "./dto/submit-freshness.dto";
import { ScanFreshnessDto } from "./dto/scan-freshness.dto";

@ApiTags("dynamic-pricing")
@ApiBearerAuth()
@Controller("dynamic-pricing")
@UseGuards(JwtAuthGuard)
export class DynamicPricingController {
  constructor(
    private readonly service: DynamicPricingService,
    private readonly pricingTick: PricingTickCron,
  ) {}

  @Post("freshness/:productId")
  @ApiOperation({ summary: "Submit a manual freshness score for a product" })
  @ApiResponse({ status: 200, description: "Freshness updated successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async submitFreshness(
    @Param("productId") productId: string,
    @Body() dto: SubmitFreshnessDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.submitFreshness(productId, dto.score, user.userId);
  }

  @Post("freshness/:productId/scan")
  @ApiOperation({ summary: "Classify freshness from a product photo (CoreML) and auto-submit the score" })
  @ApiResponse({ status: 200, description: "Image classified and freshness score submitted" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async scanFreshness(
    @Param("productId") productId: string,
    @Body() dto: ScanFreshnessDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.classifyFreshnessImage(productId, dto.image_b64, dto.category, user.userId);
  }

  @Get("suggestions")
  @ApiOperation({ summary: "Get pending price suggestions for my farms" })
  @ApiResponse({ status: 200, description: "Suggestions retrieved successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getSuggestions(@CurrentUser() user: { userId: string; role: string; email: string }) {
    return this.service.getSuggestionsForOwner(user.userId);
  }

  @Patch("suggestions/:id/accept")
  @ApiOperation({ summary: "Accept a price suggestion" })
  @ApiResponse({ status: 200, description: "Suggestion accepted" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async acceptSuggestion(@Param("id") id: string, @CurrentUser() user: { userId: string; role: string; email: string }) {
    return this.service.reviewSuggestion(id, user.userId, "accepted");
  }

  @Patch("suggestions/:id/reject")
  @ApiOperation({ summary: "Reject a price suggestion" })
  @ApiResponse({ status: 200, description: "Suggestion rejected" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async rejectSuggestion(@Param("id") id: string, @CurrentUser() user: { userId: string; role: string; email: string }) {
    return this.service.reviewSuggestion(id, user.userId, "rejected");
  }

  @Post("run-tick")
  @ApiOperation({ summary: "Manually trigger a pricing tick (dev/admin)" })
  @ApiResponse({ status: 200, description: "Tick executed" })
  @UseGuards(AdminGuard)
  async runTick() {
    await this.pricingTick.runTick();
    return { triggered: true };
  }

  @Get("shadow-report")
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: "Shadow mode KPI report (admin only)" })
  @ApiResponse({ status: 200, description: "Report retrieved successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getShadowReport() {
    return this.service.getShadowReport();
  }
}
