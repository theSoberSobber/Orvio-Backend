import { NestFactory } from '@nestjs/core';
import { ServiceModule } from './service.module';

async function bootstrap() {
  const app = await NestFactory.create(ServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
