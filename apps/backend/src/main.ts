import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RpcToHttpExceptionFilter } from './filters/exceptionFilter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // TODO: global validation pipe
  // app.useGlobalPipes(new ValidationPipe());

  app.enableCors({
    origin: 'https://orvio.pavit.xyz',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
  });

  app.useGlobalFilters(new RpcToHttpExceptionFilter());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
