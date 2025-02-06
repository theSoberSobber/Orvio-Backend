import { Controller, Post, Body, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Controller('auth')  // Handles `/auth/*`
export class AuthController {
  constructor(@Inject('AUTH_SERVICE') private readonly authService: ClientProxy) {}

  @Post('verify-otp')
  async verifyOtp(@Body() data: { phoneNumber: string; otpId: string }) {
    return this.authService.send('auth.verify_otp', data).toPromise();
  }

  @Post('refresh')
  async refreshToken(@Body() data: { refreshToken: string }) {
    return this.authService.send('auth.refresh', data).toPromise();
  }
}