import { BadRequestException, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from 'apps/shared/entities/device.entity';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import { ServiceService } from '../service/service.service';

// Define a constant system user ID for ServiceService to bypass credit checks
export const SYSTEM_SERVICE_USER_ID = 'system-auth-service';
// Define a constant bootstrap OTP
export const BOOTSTRAP_OTP = '123456';
const DEVICES_EXIST_FLAG = 'global:devices_exist';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @InjectRedis('AUTH_OTP_SERVICE_REDIS') private readonly redis: Redis,
    @InjectRepository(Device) private readonly deviceRepo: Repository<Device>,
    private readonly serviceService: ServiceService
  ) {}

  async sendOtp(phone: string) {
    // Check if we have any devices registered in the system
    let devicesExist = await this.redis.get(DEVICES_EXIST_FLAG);
    this.logger.log(`Sending OTP for phone ${phone}. Devices exist: ${devicesExist}`);
    if (devicesExist === null) {
      const deviceCount = await this.deviceRepo.count();
      this.logger.log(`Querying Current Device count: ${deviceCount}`);
      if(deviceCount > 0){
        await this.redis.set(DEVICES_EXIST_FLAG, 'true');
        devicesExist = 'true';
      }
    }
    

    if (devicesExist === null) {
      // Bootstrap mode - no devices yet, use dummy OTP
      this.logger.log('Using bootstrap mode (no devices available)');
      return this.sendBootstrapOtp(phone);
    } else {
      // Normal mode - use ServiceService
      this.logger.log('Using service mode (devices available)');
      return this.sendServiceOtp(phone);
    }
  }

  private async sendBootstrapOtp(phone: string) {
    const transactionId = uuidv4(); // Unique TID
    
    // Store phone number and bootstrap flag in Redis with expiry (5 mins)
    await this.redis.set(`otp:${transactionId}:bootstrapped`, 'true', 'EX', 300);
    await this.redis.set(`otp:${transactionId}:phone`, phone, 'EX', 300);

    this.logger.log(`📩 Sent bootstrap OTP ${BOOTSTRAP_OTP} to ${phone} (TID: ${transactionId})`);
    return { transactionId };
  }

  private async sendServiceOtp(phone: string) {
    // Use the ServiceService to send the OTP
    const response = await this.serviceService.sendOtp(SYSTEM_SERVICE_USER_ID, phone, undefined, undefined, undefined, 'Orvio');
    const tid = response.tid;
    
    // Store the phone number in Redis for later verification
    await this.redis.set(`otp:${tid}:phone`, phone, 'EX', 300);
    await this.redis.set(`otp:${tid}:bootstrapped`, 'false', 'EX', 300);
    
    this.logger.log(`📩 Requested service OTP for ${phone} (TID: ${tid})`);
    return { transactionId: tid };
  }

  async verifyOtp(transactionId: string, userInputOtp: string) {
    // Check if this is a bootstrap OTP
    const isBootstrap = await this.redis.get(`otp:${transactionId}:bootstrapped`);
    
    if (isBootstrap === 'true') {
      return this.verifyBootstrapOtp(transactionId, userInputOtp);
    } else {
      return this.verifyServiceOtp(transactionId, userInputOtp);
    }
  }
  
  private async verifyBootstrapOtp(transactionId: string, userInputOtp: string) {
    this.logger.log(`Verifying bootstrap OTP for TID: ${transactionId}`);
    
    // Get the phone number associated with this TID
    const phone = await this.redis.get(`otp:${transactionId}:phone`);
    
    if (!phone) {
      throw new BadRequestException('OTP expired or invalid');
    }
  
    if (BOOTSTRAP_OTP !== userInputOtp) {
      return null;
    }
  
    // Clean up Redis
    await this.redis.del(`otp:${transactionId}:bootstrapped`);
    await this.redis.del(`otp:${transactionId}:phone`);
    
    return phone; // Return phone number on success
  }
  
  private async verifyServiceOtp(transactionId: string, userInputOtp: string) {
    this.logger.log(`Verifying service OTP for TID: ${transactionId}`);
    
    // Get the phone number associated with this TID
    const phone = await this.redis.get(`otp:${transactionId}:phone`);
    
    if (!phone) {
      throw new BadRequestException('OTP expired or invalid');
    }
    
    // Use the ServiceService to verify the OTP
    const result = await this.serviceService.verifyOtp(transactionId, userInputOtp);
    
    if (!result.success) {
      return null;
    }
    
    // Clean up Redis
    await this.redis.del(`otp:${transactionId}:bootstrapped`);
    await this.redis.del(`otp:${transactionId}:phone`);
    
    return phone; // Return phone number on success
  }
} 