import { Injectable } from '@nestjs/common';
import { DocumentLoaderService } from '../services/document-loader.service';
import { TextChunkerService } from '../../domain/services/text-chunker.service';
import { EmbeddingService } from '../../domain/services/embedding.service';
import { VectorRepository } from '../../domain/repositories/vector.repository';
import { VectorPoint, VectorPayload } from '../../domain/entities/vector.entity';
import {
  EMBEDDING_DEFAULTS,
  RECURSIVE_CHUNKING_STRATEGY,
  DOCUMENT_DEFAULTS,
} from '../constants/ingestion.constants';

export interface IngestedDocument {
  collectionName: string;
  pointsStored: number;
}

export interface IngestDocumentOptions {
  collectionName: string;
  maxChunks?: number;
  version?: string;
  chunkStrategy?: string;
}

@Injectable()
export class IngestDocumentUseCase {
  constructor(
    private readonly documentLoader: DocumentLoaderService,
    private readonly textChunker: TextChunkerService,
    private readonly embeddingService: EmbeddingService,
    private readonly vectorRepository: VectorRepository,
  ) {}

  async execute(filePath: string, options: IngestDocumentOptions): Promise<IngestedDocument> {
    const documents = await this.documentLoader.loadPdfWithMetadata(filePath);

    let chunks = await this.textChunker.chunkDocuments(documents, {
      chunkSize: 1000,
      overlap: 200,
    });

    if (options.maxChunks && options.maxChunks > 0) {
      chunks = chunks.slice(0, options.maxChunks);
    }

    const texts = chunks.map((chunk) => chunk.content);
    const embeddings = await this.embeddingService.generateEmbeddings(texts);

    const collectionName = options.collectionName;
    const embeddingDimension = embeddings[0]?.length || EMBEDDING_DEFAULTS.DIMENSION;

    const points: VectorPoint[] = chunks.map((chunk, index) => {
      const payload: VectorPayload = {
        documentId: DOCUMENT_DEFAULTS.ID,
        source: filePath,
        chunkId: chunk.id,
        chunkIndex: chunk.metadata.chunkIndex,
        pageNumber: chunk.metadata.pageNumber,
        content: chunk.content,
        chunkStrategy: options.chunkStrategy || RECURSIVE_CHUNKING_STRATEGY.strategy,
        chunkSize: RECURSIVE_CHUNKING_STRATEGY.size,
        chunkOverlap: RECURSIVE_CHUNKING_STRATEGY.overlap,
        embeddingModel: EMBEDDING_DEFAULTS.MODEL,
        embeddingDimension: embeddingDimension,
        createdAt: new Date().toISOString(),
        version: options.version || DOCUMENT_DEFAULTS.VERSION,
      };

      return {
        id: chunk.id,
        vector: embeddings[index],
        payload,
      };
    });

    await this.vectorRepository.upsertPoints(options.collectionName, points, embeddingDimension);

    return {
      collectionName,
      pointsStored: points.length,
    };
  }
}
