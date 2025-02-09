import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

@Injectable()
export class FcmService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  private readonly tokenSetKey = 'fcm_tokens'; // Redis Set for unique tokens
  private readonly deviceMapKey = 'fcm_devices'; // Redis Hash for token → device mapping

  async registerDevice(device: any) {
    await this.redis.sadd(this.tokenSetKey, device.fcmToken);

    await this.redis.hset(this.deviceMapKey, device.fcmToken, JSON.stringify(device));

    return { success: true, message: 'Device registered/updated in Redis' };
  }

  async getToken(): Promise<{ device: any | null }> {
    const randomToken = await this.redis.srandmember(this.tokenSetKey);
    if (!randomToken) return { device: null };

    const deviceData = await this.redis.hget(this.deviceMapKey, randomToken);
    if (!deviceData) return { device: null };

    const device = JSON.parse(deviceData);
    console.log(`Retrieved FCM Token: ${device.fcmToken}`); // Debugging log

    return { device };
  }
}