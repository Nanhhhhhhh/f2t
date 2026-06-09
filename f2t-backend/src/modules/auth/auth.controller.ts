import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService, AuthResponse } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterFarmDto } from './dto/register-farm.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import {
  SendEmailVerificationDto,
  VerifyEmailDto,
  SendPhoneVerificationDto,
  VerifyPhoneDto,
} from './dto/verification.dto';

interface RequestUser {
  userId: string;
  email: string;
  role: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Throttle({ short: { ttl: 60000, limit: 3 } })
  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(registerDto);
  }

  @Throttle({ short: { ttl: 60000, limit: 3 } })
  @Post('register/farm')
  @ApiOperation({ summary: 'Register new farm owner + farm in one step' })
  async registerFarm(
    @Body() registerFarmDto: RegisterFarmDto,
  ): Promise<AuthResponse> {
    return this.authService.registerFarm(registerFarmDto);
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(
    @Body('refreshToken') refreshToken: string,
    @Body('userId') userId: string,
  ): Promise<AuthResponse> {
    return this.authService.refresh(refreshToken, userId);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  async logout(@CurrentUser() user: RequestUser): Promise<{ message: string; }> {
    await this.authService.logout(user.userId);
    return { message: 'Logged out successfully' };
  }

  @SkipThrottle()
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@CurrentUser() user: RequestUser): Promise<UserDocument | null> {
    return this.usersService.findById(user.userId);
  }

  @Throttle({ short: { ttl: 60000, limit: 3 } })
  @Post('send-email-verification')
  @ApiOperation({ summary: 'Send email verification OTP' })
  async sendEmailVerification(@Body() dto: SendEmailVerificationDto): Promise<{ success: boolean; message: string; verified: boolean; }> {
    return this.authService.sendEmailVerification(dto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with OTP' })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<{ success: boolean; message: string; verified: boolean; }> {
    return this.authService.verifyEmail(dto);
  }

  @Throttle({ short: { ttl: 60000, limit: 3 } })
  @Post('send-phone-verification')
  @ApiOperation({ summary: 'Send phone verification OTP' })
  async sendPhoneVerification(@Body() dto: SendPhoneVerificationDto): Promise<{ success: boolean; message: string; verified: boolean; }> {
    return this.authService.sendPhoneVerification(dto);
  }

  @Post('verify-phone')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify phone with OTP' })
  async verifyPhone(@Body() dto: VerifyPhoneDto): Promise<{ success: boolean; message: string; verified: boolean; }> {
    return this.authService.verifyPhone(dto);
  }

  @Throttle({ short: { ttl: 60000, limit: 3 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request OTP for password reset' })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ success: boolean }> {
    return this.authService.forgotPassword(dto.email);
  }

  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and get reset token' })
  async verifyOtp(@Body() dto: VerifyOtpDto): Promise<{ token: string }> {
    return this.authService.verifyOtp(dto.email, dto.otp);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token from verify-otp' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ success: boolean }> {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password (authenticated)' })
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ success: boolean }> {
    return this.authService.changePassword(user.userId, dto.currentPassword, dto.newPassword);
  }
}
