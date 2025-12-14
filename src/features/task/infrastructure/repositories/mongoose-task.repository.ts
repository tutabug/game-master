import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task } from '../../domain/entities/task.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { TaskDocument } from '../schemas/task.schema';

@Injectable()
export class MongooseTaskRepository implements TaskRepository {
  constructor(
    @InjectModel(TaskDocument.name)
    private readonly taskModel: Model<TaskDocument>,
  ) {}

  async save(task: Task): Promise<Task> {
    const taskDocument = new this.taskModel({
      title: task.title,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
    });

    const saved = await taskDocument.save();
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Task | null> {
    const taskDocument = await this.taskModel.findById(id).exec();
    return taskDocument ? this.toDomain(taskDocument) : null;
  }

  async findAll(): Promise<Task[]> {
    const taskDocuments = await this.taskModel.find().exec();
    return taskDocuments.map((doc) => this.toDomain(doc));
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.taskModel.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }

  private toDomain(document: TaskDocument): Task {
    return new Task(document._id.toString(), document.title, document.dueDate, document.createdAt);
  }
}
