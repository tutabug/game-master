import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  StoredChunkRepository,
  CreateStoredChunkData,
} from '../../domain/repositories/stored-chunk.repository';
import { StoredChunk } from '../../domain/entities/stored-chunk.entity';
import { StoredChunkDocument } from '../schemas/stored-chunk.schema';

@Injectable()
export class MongooseStoredChunkRepository implements StoredChunkRepository {
  constructor(
    @InjectModel(StoredChunkDocument.name)
    private readonly chunkModel: Model<StoredChunkDocument>,
  ) {}

  async createMany(
    chunks: CreateStoredChunkData[],
    collectionName?: string,
  ): Promise<StoredChunk[]> {
    const model = collectionName
      ? this.chunkModel.db.model(StoredChunkDocument.name, this.chunkModel.schema, collectionName)
      : this.chunkModel;

    const documents = await model.insertMany(chunks);
    return documents.map((doc) => this.toDomain(doc));
  }

  async findByTaskId(taskId: string): Promise<StoredChunk[]> {
    const chunks = await this.chunkModel.find({ taskId }).sort({ chunkIndex: 1 }).exec();
    return chunks.map((chunk) => this.toDomain(chunk));
  }

  async countByTaskId(taskId: string): Promise<number> {
    return this.chunkModel.countDocuments({ taskId }).exec();
  }

  async findByTaskIdPaginated(taskId: string, skip: number, limit: number): Promise<StoredChunk[]> {
    const chunks = await this.chunkModel
      .find({ taskId })
      .sort({ chunkIndex: 1 })
      .skip(skip)
      .limit(limit)
      .exec();
    return chunks.map((chunk) => this.toDomain(chunk));
  }

  private toDomain(document: StoredChunkDocument): StoredChunk {
    return new StoredChunk(
      document._id.toString(),
      document.taskId.toString(),
      document.chunkIndex,
      document.content,
      document.pageNumber,
      document.createdAt,
    );
  }
}
