import { Module } from '@nestjs/common';
import { OtpController } from './otp.controller';
import { OtpService } from './otp.service';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    RedisModule.forRoot({
      type: "single",
      url: process.env.REDIS_HOST,
      options: {
        db: Number(process.env.AUTH_OTP_SERVICE_DB as String)
      }
    }),
  ],
  controllers: [OtpController],
  providers: [OtpService],
})
export class OtpModule {}
