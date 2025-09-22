import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from 'apps/shared/entities/session.entity';
import { ServiceService } from './service.service';
import { FcmTokenService } from '../fcmToken/fcmToken.service';
import { FcmService } from '../fcm/fcm.service';
import { MetricsModule } from '../metrics/metrics.module';
import { Device } from 'apps/shared/entities/device.entity';
import { RedisModule } from '../../redis/redis.module';
import { CreditModule } from '../credit/credit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, Device]),
    MetricsModule,
    RedisModule,
    CreditModule
  ],
  providers: [ServiceService, FcmTokenService, FcmService],
  exports: [ServiceService]
})
export class ServiceModule {} 