import { Injectable } from '@nestjs/common';
import { Task } from '../../domain/entities/task.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { CreateTaskDto } from '../dtos/create-task.dto';

@Injectable()
export class CreateTaskUseCase {
  constructor(private readonly taskRepository: TaskRepository) {}

  async execute(dto: CreateTaskDto): Promise<Task> {
    const task = Task.create(dto.title, new Date(dto.dueDate));
    return this.taskRepository.save(task);
  }
}
