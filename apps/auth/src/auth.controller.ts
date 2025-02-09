
// implement method to get if there are unread message failures
// till now, if there are then the client is supposed to say battery optimization stuff
// do this using kafka cus no need of acks

import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern('auth.signUp')
  async signup(data: { phoneNumber: string }) {
    return this.authService.sendOtp(data.phoneNumber);
  }

  @MessagePattern('auth.verify_otp')
  async verifyOtp(data: { transactionId: string; userInputOtp: string }) {
    return this.authService.verifyOtp(data.transactionId, data.userInputOtp);
  }

  @MessagePattern('auth.refresh')
  async refresh(data: { refreshToken: string }) {
    return this.authService.refreshToken(data.refreshToken);
  }

  @MessagePattern('auth.register')
  async registerDevice(data: { userId: string; fcmToken: string; deviceHash: string; sessionId: string }) {
    return this.authService.registerDevice(data.userId, data.deviceHash, data.fcmToken, data.sessionId);
  }

  @MessagePattern('auth.me')
  async getMe(data: { userId: string }) {
    return this.authService.getUserProfile(data.userId);
  }

  @MessagePattern('auth.signOut')
  async signOut(data: { sessionId: string }) {
    return this.authService.signOut(data.sessionId);
  }

  @MessagePattern('auth.signOutAll')
  async signOutAll(data: { userId: string }) {
    return this.authService.signOutAll(data.userId);
  }
}