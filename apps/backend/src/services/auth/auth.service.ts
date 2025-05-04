import { Injectable, Inject, UnauthorizedException, ForbiddenException, BadRequestException, HttpException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from 'apps/shared/entities/user.entity';
import { Device } from 'apps/shared/entities/device.entity';
import { Session } from 'apps/shared/entities/session.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as jwt from 'jsonwebtoken';
import { ApiKey } from 'apps/shared/entities/apiKey.entity';
import { OtpService } from '../otp/otp.service';
import { FcmTokenService } from '../fcmToken/fcmToken.service';
import { CreditService } from '../credit/credit.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Device) private deviceRepo: Repository<Device>,
    @InjectRepository(Session) private sessionRepo: Repository<Session>,
    @InjectRepository(ApiKey) private apiKeyRepo: Repository<ApiKey>,
    private readonly otpService: OtpService,
    private readonly fcmTokenService: FcmTokenService,
    private readonly creditService: CreditService,
  ) {}

  async sendOtp(phoneNumber: string) {
    return this.otpService.sendOtp(phoneNumber);
  }

  async verifyOtp(transactionId: string, userInputOtp: string) {
    console.log("[Auth Service] Verifying OTP with OTP Service...");
    const phoneNumber = await this.otpService.verifyOtp(transactionId, userInputOtp);
  
    if (!phoneNumber) {
      throw new UnauthorizedException('Invalid OTP');
    }
  
    let user = await this.userRepo.findOne({ where: { phoneNumber }, relations: ['device', 'sessions'] });
  
    if (!user) {
      user = this.userRepo.create({ phoneNumber });
      await this.userRepo.save(user);
    }
  
    const refreshToken = jwt.sign({ userId: user.id, iatCustom: Date.now().toString() }, process.env.REFRESH_TOKEN_SECRET!);

    const session = this.sessionRepo.create({ refreshToken, user });
    await this.sessionRepo.save(session);

    const accessToken = jwt.sign({ userId: user.id, iatCustom: Date.now().toString(), sessionId: session.id }, process.env.JWT_SECRET!, { expiresIn: Number(process.env.JWT_EXPIRES_IN) });
  
    return { refreshToken, accessToken };
  }  

  async refreshToken(refreshToken: string) {
    // here refresh token is needed makes sense since no JWT
    const session = await this.sessionRepo.findOne({ where: { refreshToken }, relations: ['user'] });
  
    if (!session) {
      throw new ForbiddenException('Invalid refresh token'); // Tell client to sign out
    }
  
    const accessToken = jwt.sign({ userId: session.user.id, iatCustom: Date.now().toString(), sessionId: session.id }, process.env.JWT_SECRET!, { expiresIn: Number(process.env.JWT_EXPIRES_IN) });
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

  async registerDevice(userId: string, phoneNumber: string, fcmToken: string, sessionId: string) {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
        throw new ForbiddenException('Session not found');
    }

    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['device'] });
    if (!user) {
        throw new ForbiddenException('Invalid user'); 
    }

    let device = await this.deviceRepo.findOne({ where: { user: { id: userId } }, relations: ['user'] });
    let shouldWrite = false;

    if (!device) {
        device = this.deviceRepo.create({ phoneNumber, fcmToken, user });
        shouldWrite = true;
    } else if (device.user.id !== userId) {
        throw new ForbiddenException('Device already registered to another user');
    } else {
        shouldWrite = shouldWrite || (device.fcmToken !== fcmToken);
        device.fcmToken = fcmToken;
        device.phoneNumber = phoneNumber;
    }

    shouldWrite = shouldWrite || (device.isActive !== true);
    device.isActive = true;
    
    if(shouldWrite) {
      await this.deviceRepo.save(device);
      await this.sessionRepo.update({ id: sessionId }, { device });
      
      console.log("[Auth Service] Registering device with FCM Token Service...")
      await this.fcmTokenService.registerDevice({ device });
      console.log("[Auth Service] Device registered with FCM Token Service")
    }
    return { success: true };
  }

  async getUserProfile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['device', 'sessions', 'apiKeys'] });
    if (!user) {
      throw new UnauthorizedException('Invalid user');
    }
    return user;
  }

  // API Key Methods:
  async createNewApiKey(userId: string, name: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const refreshToken = jwt.sign(
        { userId: user.id, iatCustom: Date.now().toString() },
        process.env.REFRESH_TOKEN_SECRET!
    );

    const session = this.sessionRepo.create({ refreshToken, user });
    await this.sessionRepo.save(session);

    const apiKey = this.apiKeyRepo.create({ name, user, session });
    await this.apiKeyRepo.save(apiKey)
    return apiKey.session.refreshToken;
  }

  async getApiKeys(userId: string): Promise<ApiKey[]> {
    return this.apiKeyRepo.find({
        where: { user: { id: userId } },
        relations: ['session'],
    });
  }

  async revokeApiKey(refreshToken: string) {
    const session = await this.sessionRepo.findOne({
        where: { refreshToken },
        relations: ['user', 'apiKey'],
    });

    if (!session) throw new Error('Invalid API Key (Session not found)');

    // Delete both the session and its associated API key
    await this.apiKeyRepo.delete({ session });
    await this.sessionRepo.delete({ refreshToken });

    // add the session id before deleting the session to the revoked
    // redis/bloom filter

    return { success: true };
  }

  async getStats(userId: string, sessionId: string) {
    // First verify the session exists and belongs to the user
    const session = await this.sessionRepo.findOne({ 
      where: { id: sessionId },
      relations: ['device', 'user']
    });
  
    if (!session || session.user.id !== userId) {
      throw new ForbiddenException('Invalid session');
    }
  
    // Provider Stats (Message Sending)
    const currentDeviceStats = session.device ? {
      failedToSendAck: session.device.failedToSendAck,
      sentAckNotVerified: session.device.sentAckNotVerified,
      sentAckVerified: session.device.sentAckVerified,
      totalMessagesSent: session.device.totalMessagesSent,
      messageSentSuccessfully: session.device.messageSentSuccessfully,
      messageTried: session.device.messageTried
    } : null;
  
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['device']
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }
  
    const allDevicesStats = {
      failedToSendAck: user.device?.failedToSendAck || 0,
      sentAckNotVerified: user.device?.sentAckNotVerified || 0,
      sentAckVerified: user.device?.sentAckVerified || 0,
      totalMessagesSent: user.device?.totalMessagesSent || 0,
      messageSentSuccessfully: user.device?.messageSentSuccessfully || 0,
      messageTried: user.device?.messageTried || 0,
      totalDevices: user.device ? 1 : 0,
      activeDevices: user.device?.isActive ? 1 : 0
    };
  
    // Consumer Stats (API Key Usage)
    const apiKeys = await this.apiKeyRepo.find({
      where: { user: { id: userId } },
      relations: ['session']
    });
  
    const apiKeyDetailedStats = apiKeys.map(key => ({
      name: key.name,
      createdAt: key.createdAt,
      lastUsed: key.lastUsed,
      refreshToken: key.session.refreshToken
    }));
  
    const apiKeyAggregateStats = {
      totalKeys: apiKeys.length,
      activeKeys: apiKeys.filter(key => !key.lastUsed || (new Date().getTime() - key.lastUsed.getTime()) < 30 * 24 * 60 * 60 * 1000).length, // Active in last 30 days
      oldestKey: apiKeys.length > 0 ? Math.min(...apiKeys.map(key => key.createdAt.getTime())) : null,
      newestKey: apiKeys.length > 0 ? Math.max(...apiKeys.map(key => key.createdAt.getTime())) : null,
      lastUsedKey: apiKeys.length > 0 ? Math.max(...apiKeys.map(key => key.lastUsed ? key.lastUsed.getTime() : 0)) : null
    };

    // Credit stats
    const credits = await this.creditService.getCredits(userId);
    const creditMode = await this.creditService.getCreditMode(userId);
    const cashbackPoints = await this.creditService.getCashbackPoints(userId);
  
    return {
      provider: {
        currentDevice: currentDeviceStats,
        allDevices: allDevicesStats
      },
      consumer: {
        aggregate: apiKeyAggregateStats,
        keys: apiKeyDetailedStats
      },
      credits: {
        balance: credits,
        mode: creditMode,
        cashbackPoints: cashbackPoints
      }
    };
  }
} 