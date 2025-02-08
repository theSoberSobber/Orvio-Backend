import { Injectable, Inject, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Device } from './entities/device.entity';
import { Session } from './entities/session.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientProxy } from '@nestjs/microservices';
import * as jwt from 'jsonwebtoken';

// TODO: add timestamp and expiry to JWT tokens or it's 
// useless, since it'll generate the same thing
// everytime, it should NOT cus exp, anyways i added IAT-custom (issued at, custom cus i don't want it to interfere with the expiry logic of jwt library)

// TODO: add DTOs for all controllers and services
// and proper error handling for when they don't match
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Device) private deviceRepo: Repository<Device>,
    @InjectRepository(Session) private sessionRepo: Repository<Session>,
    @Inject('OTP_SERVICE') private readonly otpService: ClientProxy,
  ) {}

  async sendOtp(phoneNumber: string) {
    return this.otpService.send('otp.send_otp', { phoneNumber }).toPromise();
  }

  async verifyOtp(transactionId: string, userInputOtp: string) {
    console.log("[Auth Service] Sending Verify OTP to OTP Service...");
    const phoneNumber = await this.otpService.send('otp.verify_otp', { transactionId, userInputOtp }).toPromise();
  
    let user = await this.userRepo.findOne({ where: { phoneNumber }, relations: ['devices', 'sessions'] });
  
    if (!user) {
      user = this.userRepo.create({ phoneNumber });
      await this.userRepo.save(user);
    }
  
    const refreshToken = jwt.sign({ userId: user.id, iatCustom: Date.now().toString() }, process.env.REFRESH_TOKEN_SECRET);
    const accessToken = jwt.sign({ userId: user.id, iatCustom: Date.now().toString() }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
  
    const session = this.sessionRepo.create({ refreshToken, user });
    await this.sessionRepo.save(session);
  
    return { refreshToken, accessToken };
  }  

  async refreshToken(refreshToken: string) {
    const session = await this.sessionRepo.findOne({ where: { refreshToken }, relations: ['user'] });
  
    if (!session) {
      throw new ForbiddenException('Invalid refresh token'); // Tell client to sign out
    }
  
    const accessToken = jwt.sign({ userId: session.user.id, iatCustom: Date.now().toString() }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    return { accessToken };
  }  

  async signOut(refreshToken: string) {
    await this.sessionRepo.delete({ refreshToken });
    return { success: true };
  }

  async registerDevice(userId: string, deviceHash: string, fcmToken: string) {
    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['devices'] });
    if (!user) {
      throw new UnauthorizedException('Invalid user');
    }
  
    let device = await this.deviceRepo.findOne({ where: { deviceHash } });
  
    if (!device) {
      device = this.deviceRepo.create({ deviceHash, fcmToken, user });
      await this.deviceRepo.save(device);
    } else {
      device.fcmToken = fcmToken;
      device.user = user;
      await this.deviceRepo.save(device);
    }
  
    return { success: true };
  }  

  async getUserProfile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['devices', 'sessions'] });
    if (!user){
      throw new UnauthorizedException('Invalid user');
    }
    return user;
  }
}
