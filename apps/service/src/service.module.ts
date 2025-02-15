import { Module } from '@nestjs/common';
import { ServiceController } from './service.controller';
import { ServiceService } from './service.service';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RmqUrl } from '@nestjs/microservices/external/rmq-url.interface';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from 'apps/shared/entities/session.entity';
import { User } from 'apps/shared/entities/user.entity';
import { Device } from 'apps/shared/entities/device.entity';
import { ApiKey } from 'apps/shared/entities/apiKey.entity';

@Module({
  imports: [
    // TODO: a lot is required, similary in the service service
    // please fix that and work this stuff out all the injections
    // configs and new queues that need to be setup
    // need to fix a lot of things rn
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST,
      port: Number(process.env.POSTGRES_PORT),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      entities: [User, Device, ApiKey, Session],
      synchronize: true, // set to false in production
    }),
    TypeOrmModule.forFeature([User, Device, ApiKey, Session]),
    RedisModule.forRoot({
      type: 'single',
      url: process.env.REDIS_HOST,
      options: { 
        db: Number(process.env.SERVICE_SERVICE_DB as String) 
      },
    }),
    ClientsModule.register([
      {
        name: 'FCM_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL as RmqUrl],
          queue: process.env.FCM_QUEUE,
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
  controllers: [ServiceController],
  providers: [ServiceService],
})
export class ServiceModule {}