import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { FarmsModule } from '../farms/farms.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import {
  VerificationToken,
  VerificationTokenSchema,
} from './schemas/verification-token.schema';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';

@Module({
  imports: [
    UsersModule,
    FarmsModule,
    PassportModule,
    MongooseModule.forFeature([
      { name: VerificationToken.name, schema: VerificationTokenSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy, EmailService, SmsService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
