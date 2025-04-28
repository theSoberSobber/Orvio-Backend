import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class OtpService {
  constructor(@InjectRedis('AUTH_OTP_SERVICE_REDIS') private readonly redis: Redis) {}

  async sendOtp(phone: string) {
    // const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otp = 123456;  // Hardcoded for development
    const transactionId = Date.now().toString(); // Unique TID

    // Store in Redis with expiry (5 mins)
    await this.redis.set(`otp:${transactionId}`, JSON.stringify({ otp, phone }), 'EX', 300);

    console.log(`📩 Sent OTP ${otp} to ${phone} (TID: ${transactionId})`);
    return { transactionId };
  }

  async verifyOtp(transactionId: string, userInputOtp: string) {
    const data = await this.redis.get(`otp:${transactionId}`);
    console.log("REDIS DATA: ", data);
    
    if (!data) {
      throw new BadRequestException('OTP expired or invalid');
    }
  
    const { otp: storedOtp, phone } = JSON.parse(data);
    if (storedOtp.toString() !== userInputOtp) {
      return null;
    }
  
    await this.redis.del(`otp:${transactionId}`); // OTP should be one-time use
    return phone; // Return phone number on success
  }
} 