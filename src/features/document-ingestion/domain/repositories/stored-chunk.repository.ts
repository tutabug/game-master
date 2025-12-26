import { StoredChunk } from '../entities/stored-chunk.entity';

export interface CreateStoredChunkData {
  taskId: string;
  chunkIndex: number;
  content: string;
  pageNumber?: number;
}

export abstract class StoredChunkRepository {
  abstract createMany(
    chunks: CreateStoredChunkData[],
    collectionName?: string,
  ): Promise<StoredChunk[]>;

  abstract findByTaskId(taskId: string): Promise<StoredChunk[]>;

  abstract countByTaskId(taskId: string): Promise<number>;

  abstract findByTaskIdPaginated(
    taskId: string,
    skip: number,
    limit: number,
  ): Promise<StoredChunk[]>;
}
