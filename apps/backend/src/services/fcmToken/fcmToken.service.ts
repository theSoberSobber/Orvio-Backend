import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { Device } from 'apps/shared/entities/device.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

/**
 * FcmTokenService - Manages FCM tokens for device messaging
 * Stores and retrieves FCM tokens using Redis for fast access
 */
@Injectable()
export class FcmTokenService {
  constructor(
    @InjectRedis('FCM_TOKEN_SERVICE_REDIS') private readonly redis: Redis,
    @InjectRepository(Device) private readonly deviceRepo: Repository<Device>
  ) {}

  private readonly tokenSetKey = 'fcm_tokens'; // Redis Set for unique tokens
  private readonly deviceMapKey = 'fcm_device'; // Redis Hash for token → device mapping

  /**
   * Register a device with its FCM token in Redis
   * @param device Device object containing FCM token
   * @returns Success status
   */
  async registerDevice({ device }: { device: Device }) {
    const { phoneNumber, fcmToken } = device;
    
    if (!phoneNumber || !fcmToken) {
      throw new BadRequestException('Phone number and FCM token are required');
    }

    // Check if device already exists
    const existingDevice = await this.deviceRepo.findOne({ 
      where: { phoneNumber },
      relations: ['user']
    });

    let savedDevice;
    if (existingDevice) {
      // Update existing device
      existingDevice.fcmToken = fcmToken;
      existingDevice.isActive = true;
      savedDevice = await this.deviceRepo.save(existingDevice);
    } else {
      // Create new device
      const newDevice = this.deviceRepo.create({
        phoneNumber,
        fcmToken,
        isActive: true,
        user: device.user
      });
      savedDevice = await this.deviceRepo.save(newDevice);
    }

    // Store device in Redis
    await this.redis.sadd(this.tokenSetKey, fcmToken);
    await this.redis.hset(this.deviceMapKey, fcmToken, JSON.stringify({ device: savedDevice }));

    return savedDevice;
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