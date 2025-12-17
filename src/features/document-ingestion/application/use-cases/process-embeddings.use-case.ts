import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingTaskRepository } from '../../domain/repositories/embedding-task.repository';
import { StoredChunkRepository } from '../../domain/repositories/stored-chunk.repository';
import { EmbeddingService } from '../../domain/services/embedding.service';
import { VectorStoreService } from '../../domain/services/vector-store.service';
import { EmbeddingTaskStatus, EmbeddingConfig } from '../../domain/entities/embedding-task.entity';
import { DEFAULT_EMBEDDING_CONFIG, EMBEDDING_BATCH_SIZE } from '../constants/embedding.constants';
import { createHash } from 'crypto';

export interface ProcessEmbeddingsInput {
  chunkingTaskId: string;
  documentId: string;
  embeddingConfig?: Partial<EmbeddingConfig>;
  resume?: boolean;
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

    const totalChunks = await this.storedChunkRepository.countByTaskId(input.chunkingTaskId);

    if (totalChunks === 0) {
      throw new Error(`No chunks found for chunking task ${input.chunkingTaskId}`);
    }

    let task = await this.embeddingTaskRepository.findByChunkingTaskId(input.chunkingTaskId);

    if (task && input.resume) {
      if (task.isCompleted()) {
        this.logger.log(
          `Embedding task already completed for chunking task ${input.chunkingTaskId}`,
        );
        return {
          taskId: task.id,
          documentId: task.documentId,
          totalChunks: task.totalChunks,
          processedChunks: task.processedChunks,
          status: task.status,
          collectionName: config.collectionName,
        };
      }

      if (task.isFailed()) {
        this.logger.log(`Resuming failed embedding task ${task.id}`);
        await this.embeddingTaskRepository.updateStatus(task.id, EmbeddingTaskStatus.PROCESSING);
      } else if (task.isPending()) {
        await this.embeddingTaskRepository.updateStatus(task.id, EmbeddingTaskStatus.PROCESSING);
      }
    } else if (!task) {
      task = await this.embeddingTaskRepository.create({
        chunkingTaskId: input.chunkingTaskId,
        documentId: input.documentId,
        status: EmbeddingTaskStatus.PENDING,
        totalChunks,
        processedChunks: 0,
        embeddingConfig: config,
      });
      await this.embeddingTaskRepository.updateStatus(task.id, EmbeddingTaskStatus.PROCESSING);
    } else {
      throw new Error(
        `Embedding task already exists for chunking task ${input.chunkingTaskId}. Use resume=true to continue.`,
      );
    }

    try {
      await this.vectorStoreService.ensureCollection(config.collectionName, config.dimension);

      this.logger.log(`Processing ${totalChunks} chunks in batches of ${EMBEDDING_BATCH_SIZE}`);

      let processedCount = task.processedChunks;
      let offset = 0;

      while (offset < totalChunks) {
        const batchChunks = await this.storedChunkRepository.findByTaskIdPaginated(
          input.chunkingTaskId,
          offset,
          EMBEDDING_BATCH_SIZE,
        );

        this.logger.log(
          `Processing batch: chunks ${offset + 1}-${Math.min(offset + EMBEDDING_BATCH_SIZE, totalChunks)} of ${totalChunks}`,
        );

        for (const chunk of batchChunks) {
          const vectorId = this.generateVectorId(chunk.id);
          const exists = await this.vectorStoreService.vectorExists(
            config.collectionName,
            vectorId,
          );

          if (exists) {
            this.logger.log(`Skipping chunk ${chunk.chunkIndex} (already processed)`);
            processedCount++;
            continue;
          }

          this.logger.log(
            `[${processedCount + 1}/${totalChunks}] Generating embedding for chunk ${chunk.chunkIndex}`,
          );
          const embedding = await this.embeddingService.generateEmbedding(chunk.content);

          this.logger.log(
            `[${processedCount + 1}/${totalChunks}] Storing vector for chunk ${chunk.chunkIndex}`,
          );
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

          await this.embeddingTaskRepository.incrementProcessedChunks(task.id);
          processedCount++;

          if (processedCount % 10 === 0 || processedCount === totalChunks) {
            this.logger.log(
              `Progress: ${processedCount}/${totalChunks} chunks processed (${Math.round((processedCount / totalChunks) * 100)}%)`,
            );
          }
        }

        offset += EMBEDDING_BATCH_SIZE;
      }

      this.logger.log(`Completed embedding generation for all ${totalChunks} chunks`);
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

  private generateVectorId(chunkId: string): string {
    const hash = createHash('sha256').update(chunkId).digest('hex');
    return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
  }
}
