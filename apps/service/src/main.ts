import { NestFactory } from "@nestjs/core";
import { ServiceModule } from "./service.module";
import { Transport } from "@nestjs/microservices";
import { RmqUrl } from "@nestjs/microservices/external/rmq-url.interface";

async function bootstrap() {
  const app = await NestFactory.createMicroservice(ServiceModule, {
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL as RmqUrl],
      queue: process.env.SERVICE_QUEUE,
      queueOptions: { 
        durable: true 
      },
    },
  });
  await app.listen();
  console.log('Service service is running...');
}
bootstrap();