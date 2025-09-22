import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from 'apps/shared/entities/device.entity';
import { OtpService } from './otp.service';
import { ServiceModule } from '../service/service.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device]),
    ServiceModule
  ],
  providers: [OtpService],
  exports: [OtpService]
})
export class OtpModule {} 