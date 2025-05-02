import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from 'apps/shared/entities/device.entity';
import { MetricsService } from './metrics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device])
  ],
  providers: [MetricsService],
  exports: [MetricsService]
})
export class MetricsModule {} 