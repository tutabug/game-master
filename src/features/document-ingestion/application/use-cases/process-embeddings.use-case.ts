import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingTaskRepository } from '../../domain/repositories/embedding-task.repository';
import { StoredChunkRepository } from '../../domain/repositories/stored-chunk.repository';
import { EmbeddingService } from '../../domain/services/embedding.service';
import { VectorStoreService } from '../../domain/services/vector-store.service';
import { EmbeddingTaskStatus, EmbeddingConfig } from '../../domain/entities/embedding-task.entity';
import { DEFAULT_EMBEDDING_CONFIG } from '../constants/embedding.constants';
import { randomUUID } from 'crypto';

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
    const config: EmbeddingConfig = {
      ...DEFAULT_EMBEDDING_CONFIG,
      ...input.embeddingConfig,
    };

    const chunks = await this.storedChunkRepository.findByTaskId(input.chunkingTaskId);

    if (chunks.length === 0) {
      throw new Error(`No chunks found for chunking task ${input.chunkingTaskId}`);
    }

    const task = await this.embeddingTaskRepository.create({
      chunkingTaskId: input.chunkingTaskId,
      documentId: input.documentId,
      status: EmbeddingTaskStatus.PENDING,
      totalChunks: chunks.length,
      processedChunks: 0,
      embeddingConfig: config,
    });

    try {
      await this.embeddingTaskRepository.updateStatus(task.id, EmbeddingTaskStatus.PROCESSING);

      await this.vectorStoreService.ensureCollection(config.collectionName, config.dimension);

      this.logger.log(`Processing ${chunks.length} chunks for embeddings`);

      for (const chunk of chunks) {
        const embedding = await this.embeddingService.generateEmbedding(chunk.content);

        await this.vectorStoreService.storeVectors(config.collectionName, [
          {
            id: randomUUID(),
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

        await this.embeddingTaskRepository.incrementProcessedChunks(task.id);
      }

      await this.embeddingTaskRepository.markCompleted(task.id);

      const completedTask = await this.embeddingTaskRepository.findById(task.id);

      return {
        taskId: completedTask!.id,
        documentId: completedTask!.documentId,
        totalChunks: completedTask!.totalChunks,
        processedChunks: completedTask!.processedChunks,
        status: completedTask!.status,
        collectionName: config.collectionName,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.embeddingTaskRepository.updateStatus(
        task.id,
        EmbeddingTaskStatus.FAILED,
        errorMessage,
      );
      throw error;
    }
  }
}
