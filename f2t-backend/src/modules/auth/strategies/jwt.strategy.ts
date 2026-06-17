import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

interface JWTPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'fallback-secret',
    });
  }

  async validate(payload: JWTPayload): Promise<{ userId: string; email: string; role: string; }> {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    if (user.isBanned || user.status === 'suspended') {
      throw new UnauthorizedException('Your account has been banned.');
    }
    
    // Also block farmers with unverified farms from making active requests if we want,
    // but the prompt just said "farmer chỉ có thể login khi farm được chấp nhận đăng kí". 
    // We already block them at login.

    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
