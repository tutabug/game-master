import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingTaskRepository } from '../../domain/repositories/embedding-task.repository';
import { StoredChunkRepository } from '../../domain/repositories/stored-chunk.repository';
import { EmbeddingService } from '../../domain/services/embedding.service';
import { VectorStoreService } from '../../domain/services/vector-store.service';
import {
  EmbeddingTask,
  EmbeddingTaskStatus,
  EmbeddingConfig,
} from '../../domain/entities/embedding-task.entity';
import { StoredChunk } from '../../domain/entities/stored-chunk.entity';
import { DEFAULT_EMBEDDING_CONFIG, EMBEDDING_BATCH_SIZE } from '../constants/embedding.constants';
import { createHash } from 'crypto';

export interface ProcessEmbeddingsInput {
  chunkingTaskId: string;
  documentId: string;
  embeddingConfig?: Partial<EmbeddingConfig>;
}

export interface ProcessEmbeddingsOutput {
  taskId: string;
  documentId: string;
  totalChunks: number;
  processedChunks: number;
  status: string;
  collectionName: string;
}

@Injectable()
export class ProcessEmbeddingsUseCase {
  private readonly logger = new Logger(ProcessEmbeddingsUseCase.name);

  constructor(
    private readonly embeddingTaskRepository: EmbeddingTaskRepository,
    private readonly storedChunkRepository: StoredChunkRepository,
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStoreService: VectorStoreService,
  ) {}

  async execute(input: ProcessEmbeddingsInput): Promise<ProcessEmbeddingsOutput> {
    const config = this.buildEmbeddingConfig(input.embeddingConfig);
    const totalChunks = await this.validateChunksExist(input.chunkingTaskId);
    const task = await this.findOrCreateTask(input, totalChunks, config);

    if (task.isCompleted()) {
      return this.buildCompletedResponse(task, config.collectionName);
    }

    try {
      await this.prepareVectorCollection(config);
      await this.processChunksInBatches(input, task, totalChunks, config);
      await this.completeTask(task.id);

      return await this.buildSuccessResponse(task.id, config.collectionName);
    } catch (error) {
      await this.handleProcessingError(task.id, error);
      throw error;
    }
  }

  private buildEmbeddingConfig(partialConfig?: Partial<EmbeddingConfig>): EmbeddingConfig {
    return {
      ...DEFAULT_EMBEDDING_CONFIG,
      ...partialConfig,
    };
  }

  private async validateChunksExist(chunkingTaskId: string): Promise<number> {
    const totalChunks = await this.storedChunkRepository.countByTaskId(chunkingTaskId);

    if (totalChunks === 0) {
      throw new Error(`No chunks found for chunking task ${chunkingTaskId}`);
    }

    return totalChunks;
  }

  private async findOrCreateTask(
    input: ProcessEmbeddingsInput,
    totalChunks: number,
    config: EmbeddingConfig,
  ): Promise<EmbeddingTask> {
    const existingTask = await this.embeddingTaskRepository.findByChunkingTaskId(
      input.chunkingTaskId,
    );

    if (existingTask) {
      return await this.resumeExistingTask(existingTask);
    }

    return await this.createNewTask(input, totalChunks, config);
  }

  private async resumeExistingTask(task: EmbeddingTask): Promise<EmbeddingTask> {
    if (task.isCompleted()) {
      this.logger.log(`Embedding task already completed: ${task.id}`);
      return task;
    }

    if (task.isFailed()) {
      this.logger.log(`Resuming failed embedding task ${task.id}`);
    } else {
      this.logger.log(
        `Continuing embedding task ${task.id} (${task.processedChunks}/${task.totalChunks} chunks processed)`,
      );
    }

    await this.embeddingTaskRepository.updateStatus(task.id, EmbeddingTaskStatus.PROCESSING);
    return task;
  }

  private async createNewTask(
    input: ProcessEmbeddingsInput,
    totalChunks: number,
    config: EmbeddingConfig,
  ): Promise<EmbeddingTask> {
    const task = await this.embeddingTaskRepository.create({
      chunkingTaskId: input.chunkingTaskId,
      documentId: input.documentId,
      status: EmbeddingTaskStatus.PENDING,
      totalChunks,
      processedChunks: 0,
      embeddingConfig: config,
    });

    await this.embeddingTaskRepository.updateStatus(task.id, EmbeddingTaskStatus.PROCESSING);
    return task;
  }

  private async prepareVectorCollection(config: EmbeddingConfig): Promise<void> {
    await this.vectorStoreService.ensureCollection(config.collectionName, config.dimension);
  }

  private async processChunksInBatches(
    input: ProcessEmbeddingsInput,
    task: EmbeddingTask,
    totalChunks: number,
    config: EmbeddingConfig,
  ): Promise<void> {
    this.logger.log(`Processing ${totalChunks} chunks in batches of ${EMBEDDING_BATCH_SIZE}`);

    let processedCount = task.processedChunks;
    let offset = 0;

    while (offset < totalChunks) {
      const batchChunks = await this.fetchChunkBatch(input.chunkingTaskId, offset, totalChunks);
      processedCount = await this.processBatch(
        batchChunks,
        input,
        task,
        config,
        processedCount,
        totalChunks,
      );
      offset += EMBEDDING_BATCH_SIZE;
    }
  }

  private async fetchChunkBatch(
    chunkingTaskId: string,
    offset: number,
    totalChunks: number,
  ): Promise<StoredChunk[]> {
    this.logger.log(
      `Processing batch: chunks ${offset + 1}-${Math.min(offset + EMBEDDING_BATCH_SIZE, totalChunks)} of ${totalChunks}`,
    );

    return await this.storedChunkRepository.findByTaskIdPaginated(
      chunkingTaskId,
      offset,
      EMBEDDING_BATCH_SIZE,
    );
  }

  private async processBatch(
    chunks: StoredChunk[],
    input: ProcessEmbeddingsInput,
    task: EmbeddingTask,
    config: EmbeddingConfig,
    initialProcessedCount: number,
    totalChunks: number,
  ): Promise<number> {
    let processedCount = initialProcessedCount;

    for (const chunk of chunks) {
      const wasProcessed = await this.processChunk(
        chunk,
        input,
        task,
        config,
        processedCount,
        totalChunks,
      );

      if (wasProcessed) {
        processedCount++;
        this.logProgressIfNeeded(processedCount, totalChunks);
      }
    }

    return processedCount;
  }

  private async processChunk(
    chunk: StoredChunk,
    input: ProcessEmbeddingsInput,
    task: EmbeddingTask,
    config: EmbeddingConfig,
    processedCount: number,
    totalChunks: number,
  ): Promise<boolean> {
    const vectorId = this.generateVectorId(chunk.id);

    if (await this.isChunkAlreadyProcessed(config.collectionName, vectorId, chunk.chunkIndex)) {
      return true;
    }

    await this.generateAndStoreEmbedding(
      chunk,
      input,
      task,
      config,
      vectorId,
      processedCount,
      totalChunks,
    );

    return true;
  }

  private async isChunkAlreadyProcessed(
    collectionName: string,
    vectorId: string,
    chunkIndex: number,
  ): Promise<boolean> {
    const exists = await this.vectorStoreService.vectorExists(collectionName, vectorId);

    if (exists) {
      this.logger.log(`Skipping chunk ${chunkIndex} (already processed)`);
    }

    return exists;
  }

  private async generateAndStoreEmbedding(
    chunk: StoredChunk,
    input: ProcessEmbeddingsInput,
    task: EmbeddingTask,
    config: EmbeddingConfig,
    vectorId: string,
    processedCount: number,
    totalChunks: number,
  ): Promise<void> {
    this.logger.log(
      `[${processedCount + 1}/${totalChunks}] Generating embedding for chunk ${chunk.chunkIndex}`,
    );
    const embedding = await this.embeddingService.generateEmbedding(chunk.content);

    this.logger.log(
      `[${processedCount + 1}/${totalChunks}] Storing vector for chunk ${chunk.chunkIndex}`,
    );
    await this.storeVector(chunk, input, task, config, vectorId, embedding);
    await this.embeddingTaskRepository.incrementProcessedChunks(task.id);
  }

  private async storeVector(
    chunk: StoredChunk,
    input: ProcessEmbeddingsInput,
    task: EmbeddingTask,
    config: EmbeddingConfig,
    vectorId: string,
    embedding: number[],
  ): Promise<void> {
    await this.vectorStoreService.storeVectors(config.collectionName, [
      {
        id: vectorId,
        vector: embedding,
        payload: {
          chunkId: chunk.id,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          documentId: input.documentId,
          chunkingTaskId: input.chunkingTaskId,
          embeddingTaskId: task.id,
          pageNumber: chunk.pageNumber,
          contentType: 'application/pdf',
          tags: [],
          createdAt: new Date().toISOString(),
          version: '1.0',
        },
      },
    ]);
  }

  private logProgressIfNeeded(processedCount: number, totalChunks: number): void {
    if (processedCount % 10 === 0 || processedCount === totalChunks) {
      const percentage = Math.round((processedCount / totalChunks) * 100);
      this.logger.log(
        `Progress: ${processedCount}/${totalChunks} chunks processed (${percentage}%)`,
      );
    }
  }

  private async completeTask(taskId: string): Promise<void> {
    const task = await this.embeddingTaskRepository.findById(taskId);
    this.logger.log(`Completed embedding generation for all ${task!.totalChunks} chunks`);
    await this.embeddingTaskRepository.markCompleted(taskId);
  }

  private buildCompletedResponse(
    task: EmbeddingTask,
    collectionName: string,
  ): ProcessEmbeddingsOutput {
    return {
      taskId: task.id,
      documentId: task.documentId,
      totalChunks: task.totalChunks,
      processedChunks: task.processedChunks,
      status: task.status,
      collectionName,
    };
  }

  private async buildSuccessResponse(
    taskId: string,
    collectionName: string,
  ): Promise<ProcessEmbeddingsOutput> {
    const completedTask = await this.embeddingTaskRepository.findById(taskId);

    return {
      taskId: completedTask!.id,
      documentId: completedTask!.documentId,
      totalChunks: completedTask!.totalChunks,
      processedChunks: completedTask!.processedChunks,
      status: completedTask!.status,
      collectionName,
    };
  }

  private async handleProcessingError(taskId: string, error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await this.embeddingTaskRepository.updateStatus(
      taskId,
      EmbeddingTaskStatus.FAILED,
      errorMessage,
    );
  }

  private generateVectorId(chunkId: string): string {
    const hash = createHash('sha256').update(chunkId).digest('hex');
    return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
  }
}
