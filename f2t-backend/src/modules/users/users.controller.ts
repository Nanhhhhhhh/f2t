import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { OrdersService } from '../orders/orders.service';
import { User, UserDocument } from './schemas/user.schema';
import { IsString, IsNotEmpty, Matches } from 'class-validator';

class UpdatePushTokenDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^ExponentPushToken\[.+\]$/, {
    message: 'Must be a valid Expo push token',
  })
  pushToken!: string;
}

interface RequestUser {
  userId: string;
  role: string;
  email: string;
}

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly ordersService: OrdersService,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: RequestUser): Promise<UserDocument> {
    const userProfile = await this.usersService.findById(user.userId);
    if (!userProfile) {
      throw new NotFoundException('User not found');
    }
    return userProfile;
  }

  @Get('profile/stats')
  @ApiOperation({ summary: 'Get current user consumer stats' })
  async getProfileStats(
    @CurrentUser() user: RequestUser,
  ): Promise<import('../orders/orders.service').ConsumerStats> {
    return this.ordersService.getConsumerStats(user.userId);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search users by name or email' })
  @ApiQuery({ name: 'q', required: false, type: String })
  searchUsers(@Query('q') q?: string) {
    return this.usersService.searchUsers(q ?? '');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get public profile by ID' })
  async getPublicProfile(@Param('id') id: string): Promise<UserDocument> {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    // In a real app, we might want to strip sensitive fields here
    // but the toJSON transform in user.schema.ts already handles it
    return user;
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() updateData: UpdateProfileDto,
  ): Promise<UserDocument | null> {
    const updatePayload: Partial<User> & { isActive?: boolean } = {
      firstName: updateData.firstName,
      lastName: updateData.lastName,
      phoneNumber: updateData.phoneNumber,
      avatarUrl: updateData.avatarUrl,
      isActive: updateData.isActive,
    };

    if (updateData.location) {
      updatePayload.location = {
        address: {
          street: updateData.location.addressLine1 ?? '',
          city: updateData.location.city ?? '',
          zipCode: updateData.location.postalCode ?? '',
          country: updateData.location.country ?? '',
        },
        coordinates: {
          latitude: updateData.location.coordinates?.[0] ?? 0,
          longitude: updateData.location.coordinates?.[1] ?? 0,
        },
      };
    }

    return this.usersService.update(user.userId, updatePayload);
  }

  @Put('push-token')
  @ApiOperation({ summary: 'Update Expo push token' })
  async updatePushToken(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdatePushTokenDto,
  ): Promise<{ success: boolean }> {
    await this.usersService.updatePushToken(user.userId, dto.pushToken);
    return { success: true };
  }
}
