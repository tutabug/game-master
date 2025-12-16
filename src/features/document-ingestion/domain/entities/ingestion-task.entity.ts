export enum ChunkingTaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface ChunkingConfig {
  strategy: string;
  size: number;
  overlap: number;
}

export interface CreateChunkingTaskData {
  documentId: string;
  filePath: string;
  status: ChunkingTaskStatus;
  totalChunks: number;
  chunkingConfig: ChunkingConfig;
  completedAt?: Date;
  errorMessage?: string;
}

export class ChunkingTask {
  constructor(
    public readonly id: string,
    public readonly documentId: string,
    public readonly filePath: string,
    public readonly status: ChunkingTaskStatus,
    public readonly totalChunks: number,
    public readonly chunkingConfig: ChunkingConfig,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly completedAt?: Date,
    public readonly errorMessage?: string,
  ) {}

  isPending(): boolean {
    return this.status === ChunkingTaskStatus.PENDING;
  }

  isProcessing(): boolean {
    return this.status === ChunkingTaskStatus.PROCESSING;
  }

  isCompleted(): boolean {
    return this.status === ChunkingTaskStatus.COMPLETED;
  }

  isFailed(): boolean {
    return this.status === ChunkingTaskStatus.FAILED;
  }

  canStartProcessing(): boolean {
    return this.status === ChunkingTaskStatus.PENDING;
  }
}
