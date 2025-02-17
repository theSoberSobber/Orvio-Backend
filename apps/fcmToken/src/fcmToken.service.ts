import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

// TODO: cron pruner for the tokens that don't work
// mark in db as inactive (maybe? not right now alteast, will need to think, this is for the app to be able to fetch and show that your device is inactive)

@Injectable()
export class FcmTokenService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  private readonly tokenSetKey = 'fcm_tokens'; // Redis Set for unique tokens
  private readonly deviceMapKey = 'fcm_devices'; // Redis Hash for token → device mapping

  async registerDevice(device: any) {
    console.log("GOT REGISTRATION FROM AUTH SERVICE!!", device);
    await this.redis.sadd(this.tokenSetKey, device.device.fcmToken);

    await this.redis.hset(this.deviceMapKey, device.device.fcmToken, JSON.stringify(device));

    return { success: true, message: 'Device registered/updated in Redis' };
  }

  async getToken(): Promise<{ device: any | null }> {
    const randomToken = await this.redis.srandmember(this.tokenSetKey);
    if (!randomToken) return { device: null };

    const deviceData = await this.redis.hget(this.deviceMapKey, randomToken);
    if (!deviceData) return { device: null };

    const device = (await JSON.parse(deviceData)).device;
    console.log(`Retrieved FCM Token: ${device.fcmToken}`); // Debugging log

    return { device };
  }
}