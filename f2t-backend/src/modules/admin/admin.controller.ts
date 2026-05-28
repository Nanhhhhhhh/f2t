import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AdminService, AdminAnalyticsDto } from './admin.service';
import { AdminUsersQueryDto, AdminFarmsQueryDto, AdminOrdersQueryDto, AdminProductsQueryDto, BanUserDto, ChangeUserRoleDto, VerifyFarmDto } from './dto/admin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { UserDocument } from '../users/schemas/user.schema';
import { FarmDocument } from '../farms/schemas/farm.schema';
import { OrderDocument } from '../orders/schemas/order.schema';
import { ProductDocument } from '../products/schemas/product.schema';
import { PaginationResponseDto } from '../../common/dto/pagination-response.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  findAllUsers(@Query() query: AdminUsersQueryDto): Promise<PaginationResponseDto<UserDocument>> {
    return this.adminService.findAllUsers(query);
  }

  @Patch('users/:id/ban')
  banUser(
    @Param('id') id: string,
    @Body() dto: BanUserDto,
  ): Promise<{ id: string; isBanned: boolean }> {
    return this.adminService.banUser(id, dto.isBanned);
  }

  @Patch('users/:id/role')
  changeUserRole(
    @Param('id') id: string,
    @Body() dto: ChangeUserRoleDto,
  ): Promise<{ id: string; role: string }> {
    return this.adminService.changeUserRole(id, dto.role);
  }

  @Get('farms')
  findAllFarms(@Query() query: AdminFarmsQueryDto): Promise<PaginationResponseDto<FarmDocument>> {
    return this.adminService.findAllFarms(query);
  }

  @Patch('farms/:id/verify')
  verifyFarm(
    @Param('id') id: string,
    @Body() dto: VerifyFarmDto,
  ): Promise<{ id: string; verificationStatus: string; reason?: string }> {
    return this.adminService.verifyFarm(id, dto.verificationStatus, dto.reason);
  }

  @Get('orders')
  findAllOrders(@Query() query: AdminOrdersQueryDto): Promise<PaginationResponseDto<OrderDocument>> {
    return this.adminService.findAllOrders(query);
  }

  @Get('products')
  findAllProducts(@Query() query: AdminProductsQueryDto): Promise<PaginationResponseDto<ProductDocument>> {
    return this.adminService.findAllProducts(query);
  }

  @Get('analytics')
  getAnalytics(): Promise<AdminAnalyticsDto> {
    return this.adminService.getAnalytics();
  }
}
