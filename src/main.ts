import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*',
    credentials: true,
  });

  // Static files for uploaded content
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global interceptors
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(reflector),
    new ResponseTransformInterceptor(),
  );

  // Global filters
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('EggFleet API')
    .setDescription('Egg delivery management system API')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer(`http://localhost:${process.env.PORT ?? 3000}`, 'Local')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port);
  console.log(`🚀 EggFleet API running at: http://localhost:${port}/api/v1`);
  console.log(`📖 Swagger docs:           http://localhost:${port}/api/docs`);
}

bootstrap();
