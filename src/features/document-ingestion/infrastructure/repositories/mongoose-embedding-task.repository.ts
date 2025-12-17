import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmbeddingTaskRepository } from '../../domain/repositories/embedding-task.repository';
import {
  EmbeddingTask,
  EmbeddingTaskStatus,
  CreateEmbeddingTaskData,
} from '../../domain/entities/embedding-task.entity';
import { EmbeddingTaskDocument } from '../schemas/embedding-task.schema';

@Injectable()
export class MongooseEmbeddingTaskRepository implements EmbeddingTaskRepository {
  constructor(
    @InjectModel(EmbeddingTaskDocument.name)
    private readonly taskModel: Model<EmbeddingTaskDocument>,
  ) {}

  async create(data: CreateEmbeddingTaskData): Promise<EmbeddingTask> {
    const document = new this.taskModel(data);
    const saved = await document.save();
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<EmbeddingTask | null> {
    const task = await this.taskModel.findById(id).exec();
    return task ? this.toDomain(task) : null;
  }

  async findByChunkingTaskId(chunkingTaskId: string): Promise<EmbeddingTask | null> {
    const task = await this.taskModel.findOne({ chunkingTaskId }).exec();
    return task ? this.toDomain(task) : null;
  }

  async updateStatus(id: string, status: string, errorMessage?: string): Promise<void> {
    await this.taskModel
      .findByIdAndUpdate(id, { status, errorMessage, updatedAt: new Date() })
      .exec();
  }

  async incrementProcessedChunks(id: string): Promise<void> {
    await this.taskModel
      .findByIdAndUpdate(id, { $inc: { processedChunks: 1 }, updatedAt: new Date() })
      .exec();
  }

  async markCompleted(id: string): Promise<void> {
    const now = new Date();
    await this.taskModel
      .findByIdAndUpdate(id, {
        status: EmbeddingTaskStatus.COMPLETED,
        completedAt: now,
        updatedAt: now,
      })
      .exec();
  }

  private toDomain(document: EmbeddingTaskDocument): EmbeddingTask {
    return new EmbeddingTask(
      document._id.toString(),
      document.chunkingTaskId.toString(),
      document.documentId,
      document.status,
      document.totalChunks,
      document.processedChunks,
      document.embeddingConfig,
      document.createdAt,
      document.updatedAt,
      document.completedAt,
      document.errorMessage,
    );
  }
}
