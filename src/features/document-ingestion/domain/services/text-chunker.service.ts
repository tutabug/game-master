import { DocumentChunk } from '../entities/document-chunk.entity';
import { Document } from 'langchain/document';

export interface ChunkOptions {
  chunkSize?: number;
  overlap?: number;
}

export abstract class TextChunkerService {
  abstract chunkDocuments(documents: Document[], options?: ChunkOptions): Promise<DocumentChunk[]>;
}
