import { Module } from '@nestjs/common';
import { AppController } from './controllers/rootController/app.controller';
import { AppService } from './app.service';
import { AuthController } from './controllers/authController/auth/auth.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RmqUrl } from '@nestjs/microservices/external/rmq-url.interface';

@Module({
  imports: [
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
    ]),
  ],
  controllers: [AppController, AuthController],
  providers: [AppService],
})
export class AppModule {}
