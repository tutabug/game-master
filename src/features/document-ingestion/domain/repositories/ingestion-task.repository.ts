import {
  ChunkingTask,
  ChunkingTaskStatus,
  CreateChunkingTaskData,
} from '../entities/ingestion-task.entity';

export abstract class ChunkingTaskRepository {
  abstract create(task: CreateChunkingTaskData): Promise<ChunkingTask>;

  abstract findById(id: string): Promise<ChunkingTask | null>;

  abstract updateStatus(
    id: string,
    status: ChunkingTaskStatus,
    errorMessage?: string,
  ): Promise<ChunkingTask>;

  abstract markCompleted(id: string, totalChunks: number): Promise<ChunkingTask>;
}
