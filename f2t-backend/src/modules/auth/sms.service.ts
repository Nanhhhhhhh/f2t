import { Injectable } from '@nestjs/common';

@Injectable()
export class SmsService {
  sendOtpSms(phoneNumber: string, otp: string): Promise<void> {
    // TODO: integrate Twilio or ESMS.vn (Vietnamese SMS provider)
    // For development, log the OTP to console only
    return Promise.resolve();
  }
}
