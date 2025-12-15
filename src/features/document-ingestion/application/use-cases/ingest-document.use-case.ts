import { Injectable } from '@nestjs/common';
import { DocumentLoaderService } from '../services/document-loader.service';
import { TextChunkerService } from '../../domain/services/text-chunker.service';
import { EmbeddingService } from '../../domain/services/embedding.service';
import { DocumentChunk } from '../../domain/entities/document-chunk.entity';

export interface IngestedDocument {
  chunks: DocumentChunk[];
  embeddings: number[][];
}

export interface IngestDocumentOptions {
  maxChunks?: number;
}

@Injectable()
export class IngestDocumentUseCase {
  constructor(
    private readonly documentLoader: DocumentLoaderService,
    private readonly textChunker: TextChunkerService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async execute(filePath: string, options?: IngestDocumentOptions): Promise<IngestedDocument> {
    const documents = await this.documentLoader.loadPdfWithMetadata(filePath);

    let chunks = await this.textChunker.chunkDocuments(documents);

    if (options?.maxChunks && options.maxChunks > 0) {
      chunks = chunks.slice(0, options.maxChunks);
    }

    const texts = chunks.map((chunk) => chunk.content);
    const embeddings = await this.embeddingService.generateEmbeddings(texts);

    return {
      chunks,
      embeddings,
    };
  }
}
