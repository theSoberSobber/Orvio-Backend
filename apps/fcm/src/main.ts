import { NestFactory } from "@nestjs/core";
import { FcmModule } from "./fcm.module";
import { Transport } from "@nestjs/microservices";
import { RmqUrl } from "@nestjs/microservices/external/rmq-url.interface";

async function bootstrap() {
  const app = await NestFactory.createMicroservice(FcmModule, {
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL as RmqUrl],
      queue: process.env.FCM_QUEUE,
      queueOptions: { durable: true },
    },
  });
  await app.listen();
  console.log('FCM service is running...');
}
bootstrap();