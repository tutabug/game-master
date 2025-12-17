export enum EmbeddingTaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface EmbeddingConfig {
  model: string;
  dimension: number;
  collectionName: string;
}

export interface CreateEmbeddingTaskData {
  chunkingTaskId: string;
  documentId: string;
  status: EmbeddingTaskStatus;
  totalChunks: number;
  processedChunks: number;
  embeddingConfig: EmbeddingConfig;
  completedAt?: Date;
  errorMessage?: string;
}

export class EmbeddingTask {
  constructor(
    public readonly id: string,
    public readonly chunkingTaskId: string,
    public readonly documentId: string,
    public readonly status: EmbeddingTaskStatus,
    public readonly totalChunks: number,
    public readonly processedChunks: number,
    public readonly embeddingConfig: EmbeddingConfig,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly completedAt?: Date,
    public readonly errorMessage?: string,
  ) {}

  isPending(): boolean {
    return this.status === EmbeddingTaskStatus.PENDING;
  }

  isProcessing(): boolean {
    return this.status === EmbeddingTaskStatus.PROCESSING;
  }

  isCompleted(): boolean {
    return this.status === EmbeddingTaskStatus.COMPLETED;
  }

  isFailed(): boolean {
    return this.status === EmbeddingTaskStatus.FAILED;
  }

  canStartProcessing(): boolean {
    return this.status === EmbeddingTaskStatus.PENDING;
  }

  getProgress(): number {
    if (this.totalChunks === 0) return 0;
    return Math.round((this.processedChunks / this.totalChunks) * 100);
  }
}
