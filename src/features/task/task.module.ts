import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TaskController } from './presentation/controllers/task.controller';
import { CreateTaskUseCase } from './application/use-cases/create-task.use-case';
import { TaskRepository } from './domain/repositories/task.repository';
import { MongooseTaskRepository } from './infrastructure/repositories/mongoose-task.repository';
import { TaskDocument, TaskSchema } from './infrastructure/schemas/task.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: TaskDocument.name, schema: TaskSchema }])],
  controllers: [TaskController],
  providers: [
    CreateTaskUseCase,
    {
      provide: TaskRepository,
      useClass: MongooseTaskRepository,
    },
  ],
})
export class TaskModule {}
