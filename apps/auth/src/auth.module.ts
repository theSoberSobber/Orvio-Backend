import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { User } from '../../shared/entities/user.entity';
import { Device } from '../../shared/entities/device.entity';
import { Session } from '../../shared/entities/session.entity';
import { RmqUrl } from '@nestjs/microservices/external/rmq-url.interface';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey } from 'apps/shared/entities/apiKey.entity';

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
    ClientsModule.register([
      {
        name: 'OTP_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL as RmqUrl],
          queue: process.env.OTP_QUEUE,
          queueOptions: {
            durable: true,
          },
        },
      },
      {
        name: 'FCM_TOKEN_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL as RmqUrl],
          queue: process.env.FCM_TOKEN_QUEUE,
          queueOptions: { 
            durable: true 
          },
        },
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
