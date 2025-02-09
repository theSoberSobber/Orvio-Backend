import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { FcmTokenModule } from './fcmToken.module';
import * as dotenv from 'dotenv';
import { RmqUrl } from '@nestjs/microservices/external/rmq-url.interface';

dotenv.config();

console.log("ENV LISTING TRY", process.env.FCM_TOKEN_QUEUE, process.env.RABBITMQ_URL);

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(FcmTokenModule, {
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL as RmqUrl],
      queue: process.env.FCM_TOKEN_QUEUE,
      queueOptions: { 
        durable: true,
      },
    },
  });

  await app.listen();
  console.log('FCM Token service is running...');
}

bootstrap();