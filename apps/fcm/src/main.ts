import { NestFactory } from '@nestjs/core';
import { FcmModule } from './fcm.module';
import { Transport } from '@nestjs/microservices';


async function bootstrap() {
  const app = await NestFactory.createMicroservice(FcmModule, {
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL],
      queue: process.env.FCM_QUEUE,
      queueOptions: { durable: true },
    },
  });

  await app.listen();
  console.log('[FCM Service] is running...');
}
bootstrap();