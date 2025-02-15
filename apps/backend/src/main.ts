import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RpcToHttpExceptionFilter } from './filters/exceptionFilter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // TODO: global validation pipe
  // app.useGlobalPipes(new ValidationPipe());

  app.useGlobalFilters(new RpcToHttpExceptionFilter());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();