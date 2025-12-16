import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { DocumentLoaderService } from '../services/document-loader.service';
import { TextChunkerService } from '../../domain/services/text-chunker.service';
import { ChunkingTaskRepository } from '../../domain/repositories/ingestion-task.repository';
import { StoredChunkRepository } from '../../domain/repositories/stored-chunk.repository';
import { ChunkingConfig, ChunkingTaskStatus } from '../../domain/entities/ingestion-task.entity';
import { RECURSIVE_CHUNKING_STRATEGY } from '../constants/ingestion.constants';

export interface ChunkDocumentOptions {
  documentId?: string;
  maxChunks?: number;
  chunkSize?: number;
  chunkOverlap?: number;
  chunkStrategy?: string;
}

export interface ChunkDocumentResult {
  taskId: string;
  documentId: string;
  totalChunks: number;
  status: ChunkingTaskStatus;
}

@Injectable()
export class ChunkDocumentUseCase {
  constructor(
    private readonly documentLoader: DocumentLoaderService,
    private readonly textChunker: TextChunkerService,
    private readonly taskRepository: ChunkingTaskRepository,
    private readonly chunkRepository: StoredChunkRepository,
  ) {}

  async execute(filePath: string, options: ChunkDocumentOptions): Promise<ChunkDocumentResult> {
    const documentId = options.documentId || this.generateDocumentId(filePath);

    const chunkingConfig: ChunkingConfig = {
      strategy: options.chunkStrategy || RECURSIVE_CHUNKING_STRATEGY.strategy,
      size: options.chunkSize || RECURSIVE_CHUNKING_STRATEGY.size,
      overlap: options.chunkOverlap || RECURSIVE_CHUNKING_STRATEGY.overlap,
    };

    const task = await this.taskRepository.create({
      documentId,
      filePath,
      status: ChunkingTaskStatus.PENDING,
      totalChunks: 0,
      chunkingConfig,
    });

    try {
      await this.taskRepository.updateStatus(task.id, ChunkingTaskStatus.PROCESSING);

      const documents = await this.documentLoader.loadPdfWithMetadata(filePath);
      let chunks = await this.textChunker.chunkDocuments(documents, {
        chunkSize: chunkingConfig.size,
        overlap: chunkingConfig.overlap,
      });

      if (options.maxChunks && options.maxChunks > 0) {
        chunks = chunks.slice(0, options.maxChunks);
      }

      const storedChunks = chunks.map((chunk) => ({
        taskId: task.id,
        chunkIndex: chunk.metadata.chunkIndex,
        content: chunk.content,
        pageNumber: chunk.metadata.pageNumber,
      }));

      await this.chunkRepository.createMany(storedChunks);
      const updatedTask = await this.taskRepository.markCompleted(task.id, chunks.length);

      return {
        taskId: updatedTask.id,
        documentId: updatedTask.documentId,
        totalChunks: updatedTask.totalChunks,
        status: updatedTask.status,
      };
    } catch (error) {
      await this.taskRepository.updateStatus(
        task.id,
        ChunkingTaskStatus.FAILED,
        error instanceof Error ? error.message : 'Unknown error during chunking',
      );
      throw error;
    }
  }

  private generateDocumentId(filePath: string): string {
    const filename = path.basename(filePath, path.extname(filePath));
    const uuid = randomUUID().split('-')[0];
    return `${filename}-${uuid}`;
  }
}
