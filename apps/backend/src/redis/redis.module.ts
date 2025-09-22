import { Module, Global } from '@nestjs/common';
import { RedisModule as IoRedisModule } from '@nestjs-modules/ioredis';

@Global()
@Module({
  imports: [
    // Redis for AUTH_OTP_SERVICE
    IoRedisModule.forRoot({
      type: 'single',
      url: `redis://${process.env.REDIS_HOST}`,
      options: {
        db: Number(process.env.AUTH_OTP_SERVICE_DB)
      }
    }, 'AUTH_OTP_SERVICE_REDIS'),
    
    // Redis for FCM_TOKEN_SERVICE
    IoRedisModule.forRoot({
      type: 'single',
      url: `redis://${process.env.REDIS_HOST}`,
      options: {
        db: Number(process.env.FCM_TOKEN_SERVICE_DB)
      }
    }, 'FCM_TOKEN_SERVICE_REDIS'),
    
    // Redis for SERVICE_SERVICE
    IoRedisModule.forRoot({
      type: 'single',
      url: `redis://${process.env.REDIS_HOST}`,
      options: {
        db: Number(process.env.SERVICE_SERVICE_DB)
      }
    }, 'SERVICE_SERVICE_REDIS')
  ],
})
export class RedisModule {}