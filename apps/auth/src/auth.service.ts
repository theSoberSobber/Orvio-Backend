import { Injectable, Inject, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from '../../shared/entities/user.entity';
import { Device } from '../../shared/entities/device.entity';
import { Session } from '../../shared/entities/session.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientProxy } from '@nestjs/microservices';
import * as jwt from 'jsonwebtoken';
import { ApiKey } from 'apps/shared/entities/apiKey.entity';
import { toRpcException } from 'apps/shared/rpcWrapper';

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
    @InjectRepository(ApiKey) private apiKeyRepo: Repository<ApiKey>,
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
      throw toRpcException(new ForbiddenException('Invalid refresh token')); // Tell client to sign out
    }
  
    const accessToken = jwt.sign({ userId: session.user.id, iatCustom: Date.now().toString(), sessionId: session.id }, process.env.JWT_SECRET!, { expiresIn: Number(process.env.JWT_EXPIRES_IN) });
    return { accessToken };
  }  

  async signOut(sessionId: string) {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId }, relations: ['user', 'device'] });
  
    if (!session) {
      throw toRpcException(new ForbiddenException('Invalid session'));
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
        throw toRpcException(new ForbiddenException('Session not found'));
    }

    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['devices'] });
    if (!user) {
        throw toRpcException(new ForbiddenException('Invalid user')); 
        // 400 -> bad request, not doing notfound 404 here cus does not make sense
        // UPDATE: forbidden is fine, the user should signout if things are bad and they can't register
    }

    let shouldWrite = false;
    let device = await this.deviceRepo.findOne({ where: { deviceHash } });

    if (!device) {
        device = this.deviceRepo.create({ deviceHash, fcmToken, user });
        shouldWrite = true;
    } else {
        device.user = user;
        shouldWrite = shouldWrite || (device.fcmToken!=fcmToken);
        device.fcmToken = fcmToken;
    }

    shouldWrite = shouldWrite || (device.isActive!=true)
    device.isActive = true;
    
    if(shouldWrite){
      await this.deviceRepo.save(device);
      await this.sessionRepo.update({ id: sessionId }, { device });
      // 🔥 Emit event to FCM service
      // emit instead of send cus async processing
      // why holdup register request for fcm service right

      // TODO: strip relations before sending to cache to save up on cache space
      console.log("[Auth Service] Emitting Event to FCM Token Service for device registration...")
      // await this.fcmService.send('fcm.registerDevice', { device }).toPromise();
      this.fcmTokenService.emit('fcmToken.registerDevice', { device }); // fire and forget (emit) vs wait for response (send)
      console.log("[Auth Service] Emitted Event to FCM Token Service for device registration...")
    }
    return { success: true };
  }

  async getUserProfile(userId: string) {
    // no need to restrict immediately
    // not a sensitive method
    // if want to implement get sessionId from the JWT in authGuard and pass in from the controller
    // 
    // const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    // if (!session) {
    //     throw toRpcException(new ForbiddenException('Session not found'));
    // }

    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['devices', 'sessions', 'apiKeys'] });
    if (!user){
      throw toRpcException(new UnauthorizedException('Invalid user'));
    }
    return user;
  }


  // API Key Methods:
  // TODO: move to it's own service probably
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

  // TODO: make this such that it helps revoke JWTs too
  // jwt has a refresh token id (session ID, we already have that in the jwt) while signing
  // keep revoked refresh token ids in redis for TTL
  // check in authGuard
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

  // TODO: 
  // Stats related methods below: 
  //    TODO: really shouldn't be here :((, make a stats service bhai
  async getStats(userId: string, sessionId: string) {
    // First verify the session exists and belongs to the user
    const session = await this.sessionRepo.findOne({ 
      where: { id: sessionId },
      relations: ['device', 'user']
    });
  
    if (!session || session.user.id !== userId) {
      throw toRpcException(new ForbiddenException('Invalid session'));
    }
  
    // Provider Stats (Message Sending)
    const currentDeviceStats = session.device ? {
      failedToSendAck: session.device.failedToSendAck,
      sentAckNotVerified: session.device.sentAckNotVerified,
      sentAckVerified: session.device.sentAckVerified,
      totalMessagesSent: session.device.totalMessagesSent
    } : null;
  
    const allDevices = await this.deviceRepo.find({
      where: { user: { id: userId } }
    });
  
    const allDevicesStats = {
      failedToSendAck: allDevices.reduce((sum, device) => sum + device.failedToSendAck, 0),
      sentAckNotVerified: allDevices.reduce((sum, device) => sum + device.sentAckNotVerified, 0),
      sentAckVerified: allDevices.reduce((sum, device) => sum + device.sentAckVerified, 0),
      totalMessagesSent: allDevices.reduce((sum, device) => sum + device.totalMessagesSent, 0),
      totalDevices: allDevices.length,
      activeDevices: allDevices.filter(device => device.isActive).length
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
  
    return {
      provider: {
        currentDevice: currentDeviceStats,
        allDevices: allDevicesStats
      },
      consumer: {
        aggregate: apiKeyAggregateStats,
        keys: apiKeyDetailedStats
      }
    };
  }
}