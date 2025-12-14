import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function configureApp(app: INestApplication, enableSwagger = true): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('Task Management API')
      .setDescription('API for managing tasks with MongoDB')
      .setVersion('1.0')
      .addTag('tasks')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }
}
