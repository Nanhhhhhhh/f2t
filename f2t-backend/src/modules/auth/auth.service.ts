import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { FarmsService } from '../farms/farms.service';
import { UserDocument } from '../users/schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { RegisterFarmDto } from './dto/register-farm.dto';
import { CreateFarmDto } from '../farms/dto/farm.dto';
import {
  VerificationToken,
  VerificationTokenDocument,
} from './schemas/verification-token.schema';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import {
  SendEmailVerificationDto,
  VerifyEmailDto,
  SendPhoneVerificationDto,
  VerifyPhoneDto,
} from './dto/verification.dto';

interface JWTPayload {
  email: string;
  sub: string;
  role: string;
}

import { FarmDocument } from '../farms/schemas/farm.schema';

export interface AuthResponse {
  user: UserDocument;
  accessToken: string;
  refreshToken: string;
  farm: FarmDocument | null;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private farmsService: FarmsService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectModel(VerificationToken.name)
    private verificationTokenModel: Model<VerificationTokenDocument>,
    private emailService: EmailService,
    private smsService: SmsService,
  ) {}

  async validateUser(
    email: string,
    pass: string,
  ): Promise<UserDocument | null> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      return user;
    }
    return null;
  }

  async login(user: UserDocument): Promise<AuthResponse> {
    const payload: JWTPayload = {
      email: user.email,
      sub: String(user._id),
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION'),
    });

    await this.usersService.updateRefreshToken(String(user._id), refreshToken);

    let farm: Awaited<ReturnType<typeof this.farmsService.findOneByOwner>> | null = null;
    if (user.role === 'farm') {
      farm = await this.farmsService.findOneByOwner(String(user._id));
    }

    return {
      user,
      accessToken,
      refreshToken,
      farm,
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User already exists');
    }
    const user = await this.usersService.create(registerDto);
    return this.login(user);
  }

  async registerFarm(dto: RegisterFarmDto): Promise<AuthResponse> {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // 1) Tạo user chủ trại (role = farm)
    const user = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phoneNumber: dto.phoneNumber,
      role: 'farm',
      location: dto.location,
    } as Partial<UserDocument>);

    // 2) Tạo Farm; nếu lỗi thì rollback user vừa tạo
    try {
      await this.farmsService.create(String(user._id), {
        name: dto.farmInfo.name,
        description: dto.farmInfo.description,
        coordinates: dto.farmInfo.location.coordinates,
        address: {
          street: dto.farmInfo.location.address.street,
          city: dto.farmInfo.location.address.city,
          zipCode: dto.farmInfo.location.address.zipCode,
          country: dto.farmInfo.location.address.country,
        },
        contactEmail: dto.farmInfo.contactEmail,
        contactPhone: dto.farmInfo.contactPhone,
        deliveryMethods: dto.farmInfo.deliveryMethods,
      } as CreateFarmDto);
    } catch (err) {
      await this.usersService.remove(String(user._id)).catch(() => undefined);
      throw err;
    }

    return this.login(user);
  }

  async refresh(refreshToken: string, userId: string): Promise<AuthResponse> {
    const user = await this.usersService.getUserIfRefreshTokenMatches(
      refreshToken,
      userId,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return this.login(user);
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null);
  }

  async sendEmailVerification(dto: SendEmailVerificationDto): Promise<{ success: boolean; message: string; verified: boolean; }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.verificationTokenModel.deleteMany({
      userId: user._id,
      type: 'email',
    });

    await this.verificationTokenModel.create({
      userId: user._id,
      token: await bcrypt.hash(otp, 10),
      type: 'email',
      expiresAt,
    });

    await this.emailService.sendOtpEmail(user.email, otp);

    return {
      success: true,
      message: 'Verification code sent to email',
      verified: false,
    };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<{ success: boolean; message: string; verified: boolean; }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const verificationToken = await this.verificationTokenModel.findOne({
      userId: user._id,
      type: 'email',
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (
      !verificationToken ||
      !(await bcrypt.compare(dto.verificationCode, verificationToken.token))
    ) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    verificationToken.used = true;
    await verificationToken.save();

    await this.usersService.update(String(user._id), { emailVerified: true });

    return {
      success: true,
      message: 'Email verified successfully',
      verified: true,
    };
  }

  async sendPhoneVerification(dto: SendPhoneVerificationDto): Promise<{ success: boolean; message: string; verified: boolean; }> {
    const user = await this.usersService.findByPhoneNumber(dto.phoneNumber);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.verificationTokenModel.deleteMany({
      userId: user._id,
      type: 'phone',
    });

    await this.verificationTokenModel.create({
      userId: user._id,
      token: await bcrypt.hash(otp, 10),
      type: 'phone',
      expiresAt,
    });

    await this.smsService.sendOtpSms(user.phoneNumber, otp);

    return {
      success: true,
      message: 'Verification code sent to phone',
      verified: false,
    };
  }

  async verifyPhone(dto: VerifyPhoneDto): Promise<{ success: boolean; message: string; verified: boolean; }> {
    const user = await this.usersService.findByPhoneNumber(dto.phoneNumber);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const verificationToken = await this.verificationTokenModel.findOne({
      userId: user._id,
      type: 'phone',
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (
      !verificationToken ||
      !(await bcrypt.compare(dto.verificationCode, verificationToken.token))
    ) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    verificationToken.used = true;
    await verificationToken.save();

    await this.usersService.update(String(user._id), { phoneVerified: true });

    return {
      success: true,
      message: 'Phone number verified successfully',
      verified: true,
    };
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
