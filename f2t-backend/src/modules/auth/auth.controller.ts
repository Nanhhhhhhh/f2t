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
}
