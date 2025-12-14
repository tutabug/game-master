import { DocumentChunk } from '../entities/document-chunk.entity';

export abstract class DocumentRepository {
  abstract saveChunks(chunks: DocumentChunk[]): Promise<void>;
  abstract findBySource(source: string): Promise<DocumentChunk[]>;
  abstract findAll(): Promise<DocumentChunk[]>;
  abstract deleteBySource(source: string): Promise<void>;
  abstract clear(): Promise<void>;
}
