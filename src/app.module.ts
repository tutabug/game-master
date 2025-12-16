import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './shared/infrastructure/database/database.module';
import { TaskModule } from './features/task/task.module';
import { DocumentIngestionModule } from './features/document-ingestion/document-ingestion.module';
import { envValidationSchema } from './shared/config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    DatabaseModule,
    TaskModule,
    DocumentIngestionModule,
  ],
})
export class AppModule {}
