import { Module } from '@nestjs/common';
import { FcmController } from './fcm.controller';
import { FcmService } from './fcm.service';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [
    ConfigModule.forRoot(),
    RedisModule.forRoot({
      type: 'single',
      url: process.env.REDIS_HOST,
      options: { 
        db: Number(process.env.FCM_SERVICE_DB as String) 
      },
    }),
  ],
  controllers: [FcmController],
  providers: [FcmService],
})
export class FcmModule {}
