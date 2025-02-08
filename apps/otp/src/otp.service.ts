import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

// TODO: proper app logger like pino/winston
// Visualize in datadog/sentry
// throw AppException("message", statusCode) for reliable {"error": "message", "statusCode": statusCode} message

@Injectable()
export class OtpService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  // TODO: replace otp gen with third party sdk
  // TODO: replace verify with third party sdl
  // then only phone will be stored in redis

  async sendOtp(phone: string) {
    // const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otp = 123456;
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
      // TODO: Fix this causing an internal server error
      // somehow a 401 is causing a 500? it should really go to controller and handle itself
      // but idk maybe cus a microservice is calling a microservice
      // it's not propagating to the gateway controller somehow
      throw new UnauthorizedException('OTP expired or invalid'); // Proper error
    }
  
    const { otp: storedOtp, phone } = JSON.parse(data);
    if (storedOtp.toString() !== userInputOtp) {
      throw new UnauthorizedException('Incorrect OTP'); // Proper error
    }
  
    await this.redis.del(`otp:${transactionId}`); // OTP should be one-time use
    return phone; // Return phone number on success
  }
  
}