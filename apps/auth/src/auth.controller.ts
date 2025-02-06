import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern('signup')
  async signup(phoneNumber: string) {
    return this.authService.sendOtp(phoneNumber);
  }

  @MessagePattern('verify_otp')
  async verifyOtp(data: { phoneNumber: string; otpId: string }) {
    return this.authService.verifyOtp(data.phoneNumber, data.otpId);
  }
}