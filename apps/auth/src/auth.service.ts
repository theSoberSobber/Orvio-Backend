import { Injectable, Inject, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from '../../shared/entities/user.entity';
import { Device } from '../../shared/entities/device.entity';
import { Session } from '../../shared/entities/session.entity';
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
    @Inject('FCM_TOKEN_SERVICE') private readonly fcmTokenService: ClientProxy,
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

    const session = this.sessionRepo.create({ refreshToken, user });
    await this.sessionRepo.save(session);

    const accessToken = jwt.sign({ userId: user.id, iatCustom: Date.now().toString(), sessionId: session.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
  
    return { refreshToken, accessToken };
  }  

  async refreshToken(refreshToken: string) {
    // here refresh token is needed makes sense since no JWT
    const session = await this.sessionRepo.findOne({ where: { refreshToken }, relations: ['user'] });
  
    if (!session) {
      throw new ForbiddenException('Invalid refresh token'); // Tell client to sign out
    }
  
    const accessToken = jwt.sign({ userId: session.user.id, iatCustom: Date.now().toString(), sessionId: session.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    return { accessToken };
  }  

  async signOut(sessionId: string) {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId }, relations: ['user', 'device'] });
  
    if (!session) {
      throw new ForbiddenException('Invalid session');
    }
  
    await this.sessionRepo.delete({ id: sessionId });
  
    if (session.device) {
      session.device.isActive = false;
      await this.deviceRepo.save(session.device);
    }
  
    return { success: true };
  }   

  async signOutAll(userId: string) {
    await this.sessionRepo.delete({ user: { id: userId } });
    await this.deviceRepo.update({ user: { id: userId } }, { isActive: false });
    return { success: true };
  }

  async registerDevice(userId: string, deviceHash: string, fcmToken: string, sessionId: string) {

    // to restrict immediately after signOut
    // otherwise jwt lasts for a while
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
        throw new ForbiddenException('Session not found');
    }

    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['devices'] });
    if (!user) {
        throw new UnauthorizedException('Invalid user');
    }

    let device = await this.deviceRepo.findOne({ where: { deviceHash } });

    if (!device) {
        device = this.deviceRepo.create({ deviceHash, fcmToken, user });
    } else {
        device.user = user;
        device.fcmToken = fcmToken;
    }

    device.isActive = true;
    await this.deviceRepo.save(device);

    await this.sessionRepo.update({ id: sessionId }, { device });

    // 🔥 Emit event to FCM service
    // emit instead of send cus async processing
    // why holdup register request for fcm service right

    // TODO: strip relations before sending to cache to save up on cache space
    console.log("[Auth Service] Emitting Event to FCM Token Service for device registration...")
    // await this.fcmTokenService.send('fcm.registerDevice', { device }).toPromise();
    this.fcmTokenService.emit('fcmToken.registerDevice', { device }); // fire and forget (emit) vs wait for response (send)
    console.log("[Auth Service] Emitted Event to FCM Token Service for device registration...")
    return { success: true };
  }

  async getUserProfile(userId: string) {
    // no need to restrict immediately
    // not a sensitive method
    // if want to implement get sessionId from the JWT in authGuard and pass in from the controller
    // 
    // const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    // if (!session) {
    //     throw new ForbiddenException('Session not found');
    // }

    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['devices', 'sessions'] });
    if (!user){
      throw new UnauthorizedException('Invalid user');
    }
    return user;
  }
}
