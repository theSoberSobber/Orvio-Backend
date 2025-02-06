import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { OtpService } from './otp.service';

@Controller()
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @MessagePattern('send_otp')
  sendOtp(phone: string) {
    return this.otpService.sendOtp(phone);
  }

  @MessagePattern('verify_otp')
  verifyOtp(data: { transactionId: string; otp: string }) {
    return this.otpService.verifyOtp(data.transactionId, data.otp);
  }
}