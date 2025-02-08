import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { OtpService } from './otp.service';

@Controller()
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @MessagePattern('otp.send_otp')
  sendOtp(data: { phoneNumber: string }) {
    return this.otpService.sendOtp(data.phoneNumber);
  }

  @MessagePattern('otp.verify_otp')
  verifyOtp(data: { transactionId: string; userInputOtp: string }) {
    console.log("Data that reached to the controller", data);
    return this.otpService.verifyOtp(data.transactionId, data.userInputOtp);
  }
}