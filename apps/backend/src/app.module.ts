import { Module } from '@nestjs/common';
import { AppController } from './controllers/rootController/app.controller';
import { AppService } from './app.service';
import { AuthController } from './controllers/authController/auth/auth.controller';
import { AuthService } from './services/auth/auth.service';
import { OtpService } from './services/otp/otp.service';
import { FcmTokenService } from './services/fcmToken/fcmToken.service';
import { ServiceController } from './controllers/serviceController/service/service.controller';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'apps/shared/entities/user.entity';
import { Device } from 'apps/shared/entities/device.entity';
import { Session } from 'apps/shared/entities/session.entity';
import { ApiKey } from 'apps/shared/entities/apiKey.entity';
import { RedisModule } from './redis/redis.module';
import { ServiceModule } from './services/service/service.module';
import { MetricsModule } from './services/metrics/metrics.module';
import { CreditModule } from './services/credit/credit.module';
import { CreditService } from './services/credit/credit.service';
import { VerifyModule } from './controllers/verifyController/verify.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST,
      port: Number(process.env.POSTGRES_PORT),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      entities: [User, Device, Session, ApiKey],
      synchronize: true, // set to false in production
    }),
    TypeOrmModule.forFeature([User, Device, Session, ApiKey]),
    // Import our custom Redis module with all necessary connections
    RedisModule,
    // Import service modules
    ServiceModule,
    MetricsModule,
    CreditModule,
    VerifyModule
  ],
  controllers: [AppController, AuthController, ServiceController],
  providers: [AppService, AuthService, OtpService, FcmTokenService],
})
export class AppModule {}
