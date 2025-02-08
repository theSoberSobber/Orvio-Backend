import { NestFactory } from "@nestjs/core";
import { OtpModule } from "./otp.module";
import { Transport } from "@nestjs/microservices";
import { RmqUrl } from "@nestjs/microservices/external/rmq-url.interface";

async function bootstrap() {
  const app = await NestFactory.createMicroservice(OtpModule, {
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL as RmqUrl],
      queue: process.env.OTP_QUEUE,
      queueOptions: { durable: true },
    },
  });
  await app.listen();
  console.log('Otp service is running...');
}
bootstrap();