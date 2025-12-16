import { StoredChunk } from '../entities/stored-chunk.entity';

export interface CreateStoredChunkData {
  taskId: string;
  chunkIndex: number;
  content: string;
  pageNumber?: number;
}

export abstract class StoredChunkRepository {
  abstract createMany(chunks: CreateStoredChunkData[]): Promise<StoredChunk[]>;

  abstract findByTaskId(taskId: string): Promise<StoredChunk[]>;
}
