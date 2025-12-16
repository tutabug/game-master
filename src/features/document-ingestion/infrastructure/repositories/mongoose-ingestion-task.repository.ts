import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChunkingTaskRepository } from '../../domain/repositories/ingestion-task.repository';
import {
  ChunkingTask,
  ChunkingTaskStatus,
  CreateChunkingTaskData,
} from '../../domain/entities/ingestion-task.entity';
import { ChunkingTaskDocument } from '../schemas/ingestion-task.schema';

@Injectable()
export class MongooseChunkingTaskRepository implements ChunkingTaskRepository {
  constructor(
    @InjectModel(ChunkingTaskDocument.name)
    private readonly taskModel: Model<ChunkingTaskDocument>,
  ) {}

  async create(task: CreateChunkingTaskData): Promise<ChunkingTask> {
    const document = new this.taskModel(task);
    const saved = await document.save();
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<ChunkingTask | null> {
    const task = await this.taskModel.findById(id).exec();
    return task ? this.toDomain(task) : null;
  }

  async updateStatus(
    id: string,
    status: ChunkingTaskStatus,
    errorMessage?: string,
  ): Promise<ChunkingTask> {
    const task = await this.taskModel
      .findByIdAndUpdate(id, { status, errorMessage, updatedAt: new Date() }, { new: true })
      .exec();

    if (!task) {
      throw new Error(`Task with id ${id} not found`);
    }

    return this.toDomain(task);
  }

  async markCompleted(id: string, totalChunks: number): Promise<ChunkingTask> {
    const now = new Date();
    const task = await this.taskModel
      .findByIdAndUpdate(
        id,
        {
          status: ChunkingTaskStatus.COMPLETED,
          totalChunks,
          completedAt: now,
          updatedAt: now,
        },
        { new: true },
      )
      .exec();

    if (!task) {
      throw new Error(`Task with id ${id} not found`);
    }

    return this.toDomain(task);
  }

  private toDomain(document: ChunkingTaskDocument): ChunkingTask {
    return new ChunkingTask(
      document._id.toString(),
      document.documentId,
      document.filePath,
      document.status,
      document.totalChunks,
      document.chunkingConfig,
      document.createdAt,
      document.updatedAt,
      document.completedAt,
      document.errorMessage,
    );
  }
}
