import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { FarmsService, FarmStats } from './farms.service';
import {
  CreateFarmDto,
  UpdateFarmDto,
  GetFarmsFilterDto,
  UpdateRestockScheduleDto,
} from './dto/farm.dto';
import { UpdateDeliveryZonesDto } from './dto/update-delivery-zones.dto';
import { UpdateBusinessHoursDto } from './dto/update-business-hours.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FarmDocument } from "./schemas/farm.schema";

interface RequestUser {
  userId: string;
  role: string;
  email: string;
}

@ApiTags('farms')
@Controller('farms')
export class FarmsController {
  constructor(private readonly farmsService: FarmsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all farms' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'latitude', required: false, type: Number })
  @ApiQuery({ name: 'longitude', required: false, type: Number })
  @ApiQuery({ name: 'radius', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'deliveryMethod', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String, enum: ['name', 'createdAt', 'distance'] })
  @ApiQuery({ name: 'sortOrder', required: false, type: String, enum: ['asc', 'desc'] })
  async findAll(@Query() filterDto: GetFarmsFilterDto): Promise<{ items: FarmDocument[]; total: number; page: number; limit: number; hasMore: boolean; }> {
    const result = await this.farmsService.findAll(filterDto);
    return {
      items: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      hasMore: result.hasMore,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get farm by id' })
  async findOne(@Param('id') id: string): Promise<FarmDocument> {
    return this.farmsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('farm')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new farm' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() createFarmDto: CreateFarmDto,
  ): Promise<FarmDocument> {
    return this.farmsService.create(user.userId, createFarmDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('farm')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update farm profile' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() updateFarmDto: UpdateFarmDto,
  ): Promise<FarmDocument> {
    return this.farmsService.update(id, user.userId, updateFarmDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('farm')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete farm' })
  async delete(@Param('id') id: string, @CurrentUser() user: RequestUser): Promise<{ message: string; }> {
    await this.farmsService.delete(id, user.userId);
    return { message: 'Farm deleted successfully' };
  }

  @Put(':id/delivery-zones')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('farm')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update delivery zones' })
  async updateDeliveryZones(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateDeliveryZonesDto,
  ): Promise<FarmDocument> {
    return this.farmsService.updateDeliveryZones(id, user.userId, dto.zones);
  }

  @Put(':id/business-hours')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('farm')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update business hours' })
  async updateBusinessHours(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateBusinessHoursDto,
  ): Promise<FarmDocument> {
    return this.farmsService.updateBusinessHours(id, user.userId, dto);
  }

  @Get(':id/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('farm')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get farm analytics' })
  async getAnalytics(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<FarmStats> {
    return this.farmsService.getAnalytics(id, user.userId);
  }

  @Patch('me/restock-schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('farm')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set restock schedule per category for my farm' })
  @ApiResponse({ status: 200, description: 'Schedule updated' })
  @ApiResponse({ status: 404, description: 'Farm not found' })
  async updateRestockSchedule(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateRestockScheduleDto,
  ): Promise<FarmDocument> {
    return this.farmsService.updateRestockSchedule(user.userId, dto.schedule);
  }
}
