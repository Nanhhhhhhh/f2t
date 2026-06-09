import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { FarmsService } from '../farms/farms.service';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { VerificationToken } from './schemas/verification-token.schema';
import { PasswordResetToken } from './schemas/password-reset-token.schema';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let emailService: EmailService;
  let mockPasswordResetModel: {
    findOne: jest.Mock;
    create: jest.Mock;
    deleteMany: jest.Mock;
  };

  beforeEach(async () => {
    mockPasswordResetModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            create: jest.fn(),
            updateRefreshToken: jest.fn(),
            getUserIfRefreshTokenMatches: jest.fn(),
            findById: jest.fn(),
            updatePassword: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        {
          provide: FarmsService,
          useValue: { findOneByOwner: jest.fn() },
        },
        {
          provide: EmailService,
          useValue: { sendOtpEmail: jest.fn() },
        },
        {
          provide: SmsService,
          useValue: { sendOtpSms: jest.fn() },
        },
        {
          provide: getModelToken(VerificationToken.name),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            deleteMany: jest.fn(),
          },
        },
        {
          provide: getModelToken(PasswordResetToken.name),
          useValue: mockPasswordResetModel,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    emailService = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('forgotPassword', () => {
    it('should return success even if email not found (no enumeration)', async () => {
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);
      const result = await service.forgotPassword('notfound@test.com');
      expect(result).toEqual({ success: true });
    });

    it('should create otp token and send email when user exists', async () => {
      const mockUser = { _id: { toHexString: () => 'uid1' }, email: 'u@test.com' } as any;
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);
      const sendOtpSpy = jest.spyOn(emailService, 'sendOtpEmail').mockResolvedValue();
      await service.forgotPassword('u@test.com');
      expect(sendOtpSpy).toHaveBeenCalledWith('u@test.com', expect.any(String));
    });
  });

  describe('verifyOtp', () => {
    it('should throw BadRequestException when no token found', async () => {
      mockPasswordResetModel.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      });
      await expect(service.verifyOtp('u@test.com', '123456')).rejects.toThrow();
    });
  });

  describe('changePassword', () => {
    it('should throw UnauthorizedException when current password is wrong', async () => {
      const hashedCorrect = await bcrypt.hash('correct', 10);
      const mockUser = { _id: { toHexString: () => 'uid1' }, email: 'u@test.com', password: hashedCorrect } as any;
      jest.spyOn(usersService, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);
      await expect(service.changePassword('uid1', 'wrong', 'newpass123')).rejects.toThrow();
    });
  });
});
