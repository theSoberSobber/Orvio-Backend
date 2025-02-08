import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AuthModule } from './auth.module';
import * as dotenv from 'dotenv';
import { RmqUrl } from '@nestjs/microservices/external/rmq-url.interface';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AuthModule, {
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL as RmqUrl],
      queue: process.env.AUTH_QUEUE,
      queueOptions: {
        durable: true,
      },
    },
  });

  await app.listen();
  console.log('Auth service is running...');
}

bootstrap();
