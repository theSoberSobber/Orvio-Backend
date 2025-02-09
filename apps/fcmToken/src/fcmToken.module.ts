import { Module } from '@nestjs/common';
import { FcmTokenController } from './fcmToken.controller';
import { FcmTokenService } from './fcmToken.service';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [
    ConfigModule.forRoot(),
    RedisModule.forRoot({
      type: 'single',
      url: process.env.REDIS_HOST,
      options: { 
        db: Number(process.env.FCM_TOKEN_SERVICE_DB as String) 
      },
    }),
  ],
  controllers: [FcmTokenController],
  providers: [FcmTokenService],
})
export class FcmTokenModule {}