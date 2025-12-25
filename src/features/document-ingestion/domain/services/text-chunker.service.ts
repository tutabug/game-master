import { DocumentChunk } from '../entities/document-chunk.entity';
import { Document } from 'langchain/document';
import { ChunkStrategy } from '../enums/chunk-strategy.enum';

export interface ChunkOptions {
  chunkSize?: number;
  overlap?: number;
}

export abstract class TextChunkerService<TConfig = any> {
  abstract getStrategy(): ChunkStrategy;
  abstract chunkDocuments(
    documents: Document[],
    config: TConfig,
  ): Promise<DocumentChunk[]>;
}
