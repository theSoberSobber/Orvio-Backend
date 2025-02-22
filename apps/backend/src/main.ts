import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RpcToHttpExceptionFilter } from './filters/exceptionFilter';

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // TODO: global validation pipe
  // app.useGlobalPipes(new ValidationPipe());

  const config = new DocumentBuilder()
    .setTitle('Orvio API')
    .setDescription('API Documentation for Orvio, the little trust distributed OTP service.')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);

  document.tags = [
    { name: 'Service', description: 'Public service endpoints' },
    { name: 'Auth', description: 'Internal Auth Endpoints for the Orvio App.' },
  ];

  SwaggerModule.setup('/', app, document);

  app.useGlobalFilters(new RpcToHttpExceptionFilter());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();