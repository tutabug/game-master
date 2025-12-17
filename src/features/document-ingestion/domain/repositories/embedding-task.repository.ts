import { EmbeddingTask, CreateEmbeddingTaskData } from '../entities/embedding-task.entity';

export abstract class EmbeddingTaskRepository {
  abstract create(data: CreateEmbeddingTaskData): Promise<EmbeddingTask>;
  abstract findById(id: string): Promise<EmbeddingTask | null>;
  abstract findByChunkingTaskId(chunkingTaskId: string): Promise<EmbeddingTask | null>;
  abstract updateStatus(id: string, status: string, errorMessage?: string): Promise<void>;
  abstract incrementProcessedChunks(id: string): Promise<void>;
  abstract markCompleted(id: string): Promise<void>;
}
