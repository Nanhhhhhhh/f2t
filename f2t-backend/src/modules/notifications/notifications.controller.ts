import {
  Controller,
  Get,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsOptional, IsNumber, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationPreferencesDocument } from "./schemas/notification-preferences.schema";
import { NotificationDocument } from "./schemas/notification.schema";

class GetNotificationsQueryDto {
  @IsOptional() @IsNumber() @Type(() => Number) page?: number;
  @IsOptional() @IsNumber() @Type(() => Number) limit?: number;
  @IsOptional() @IsString() status?: string;
}

class UpdatePreferencesDto {
  @IsOptional() @IsBoolean() emailNotifications?: boolean;
  @IsOptional() @IsBoolean() smsNotifications?: boolean;
  @IsOptional() @IsBoolean() pushNotifications?: boolean;
  @IsOptional() @IsBoolean() orderUpdates?: boolean;
  @IsOptional() @IsBoolean() promotions?: boolean;
  @IsOptional() @IsBoolean() newsletter?: boolean;
}

interface RequestUser {
  userId: string;
  role: string;
  email: string;
}

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user notifications' })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query() query: GetNotificationsQueryDto,
  ): Promise<{
    items: NotificationDocument[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    unreadCount: number;
  }> {
    return this.notificationsService.findAll(user.userId, query);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for current user' })
  async markAllRead(@CurrentUser() user: RequestUser): Promise<{ success: boolean }> {
    await this.notificationsService.markAllRead(user.userId);
    return { success: true };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Param('id') id: string, @CurrentUser() user: RequestUser): Promise<NotificationDocument> {
    return this.notificationsService.markAsRead(id, user.userId);
  }

  // Keeping this for compatibility with frontend if needed, but updated to use markAllRead logic
  @Patch('user/:userId/read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for a user' })
  async markAllAsRead(
    @Param('userId') userId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<{ success: boolean; }> {
    if (user.userId !== userId) throw new UnauthorizedException('Unauthorized');
    await this.notificationsService.markAllRead(userId);
    return { success: true };
  }

  @Get('user/:userId/unread-count')
  @ApiOperation({ summary: 'Get unread notification count for a user' })
  async getUnreadCount(
    @Param('userId') userId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<{ count: number }> {
    if (user.userId !== userId) throw new UnauthorizedException('Unauthorized');
    const result = await this.notificationsService.findAll(userId, { limit: 0 });
    return { count: result.unreadCount };
  }

  @Get('preferences/:userId')
  @ApiOperation({ summary: 'Get notification preferences' })
  async getPreferences(
    @Param('userId') userId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<NotificationPreferencesDocument> {
    if (user.userId !== userId) throw new UnauthorizedException('Unauthorized');
    return this.notificationsService.getPreferences(userId);
  }

  @Put('preferences/:userId')
  @ApiOperation({ summary: 'Update notification preferences' })
  async updatePreferences(
    @Param('userId') userId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdatePreferencesDto,
  ): Promise<NotificationPreferencesDocument> {
    if (user.userId !== userId) throw new UnauthorizedException('Unauthorized');
    return this.notificationsService.updatePreferences(userId, dto);
  }
}
