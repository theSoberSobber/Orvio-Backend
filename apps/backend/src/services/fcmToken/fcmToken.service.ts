import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

/**
 * FcmTokenService - Manages FCM tokens for device messaging
 * Stores and retrieves FCM tokens using Redis for fast access
 */
@Injectable()
export class FcmTokenService {
  constructor(@InjectRedis('FCM_TOKEN_SERVICE_REDIS') private readonly redis: Redis) {}

  private readonly tokenSetKey = 'fcm_tokens'; // Redis Set for unique tokens
  private readonly deviceMapKey = 'fcm_devices'; // Redis Hash for token → device mapping

  /**
   * Register a device with its FCM token in Redis
   * @param device Device object containing FCM token
   * @returns Success status
   */
  async registerDevice(device: any) {
    console.log("Registering device in FCM Token Service:", device);
    await this.redis.sadd(this.tokenSetKey, device.device.fcmToken);
    await this.redis.hset(this.deviceMapKey, device.device.fcmToken, JSON.stringify(device));
    return { success: true, message: 'Device registered/updated in Redis' };
  }

  /**
   * Get a random FCM token and its associated device
   * @returns Device object or null if no tokens available
   */
  async getToken(): Promise<{ device: any | null }> {
    const randomToken = await this.redis.srandmember(this.tokenSetKey);
    if (!randomToken) return { device: null };

    const deviceData = await this.redis.hget(this.deviceMapKey, randomToken);
    if (!deviceData) return { device: null };

    const device = (await JSON.parse(deviceData)).device;
    console.log(`Retrieved FCM Token: ${device.fcmToken}`);
    return { device };
  }
} 