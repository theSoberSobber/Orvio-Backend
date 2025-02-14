import { Module } from '@nestjs/common';
import { AppController } from './controllers/rootController/app.controller';
import { AppService } from './app.service';
import { AuthController } from './controllers/authController/auth/auth.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RmqUrl } from '@nestjs/microservices/external/rmq-url.interface';
import { ServiceController } from './controllers/serviceController/service/service.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ClientsModule.register([
      {
        name: 'AUTH_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL as RmqUrl],
          queue: process.env.AUTH_QUEUE,
          queueOptions: { durable: true },
        },
      },
      {
        name: 'SERVICE_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL as RmqUrl],
          queue: process.env.SERVICE_QUEUE,
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  controllers: [AppController, AuthController, ServiceController],
  providers: [AppService],
})
export class AppModule {}
