import { Injectable, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Device } from './entities/device.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientProxy } from '@nestjs/microservices';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Device) private deviceRepo: Repository<Device>,
    @Inject('OTP_SERVICE') private readonly otpService: ClientProxy,
  ) {}

  async sendOtp(phoneNumber: string) {
    const otpResponse = await this.otpService.send('send_otp', { phoneNumber }).toPromise();
    return { otpId: otpResponse.otpId };
  }

  async verifyOtp(phoneNumber: string, otpId: string) {
    const isValid = await this.otpService.send('verify_otp', { otpId }).toPromise();
    if (!isValid) throw new Error('Invalid OTP');

    let user = await this.userRepo.findOne({ where: { phoneNumber }, relations: ['devices'] });
    if (!user) {
      user = this.userRepo.create({ phoneNumber });
      await this.userRepo.save(user);
    }

    const refreshToken = jwt.sign({ userId: user.id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN });
    const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

    return { refreshToken, accessToken };
  }
}