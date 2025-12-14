import { Injectable } from '@nestjs/common';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { DocumentChunk } from '../../domain/entities/document-chunk.entity';
import { randomUUID } from 'crypto';

interface ChunkOptions {
  chunkSize?: number;
  overlap?: number;
}

@Injectable()
export class TextChunkerService {
  async chunkText(text: string, source: string, options?: ChunkOptions): Promise<DocumentChunk[]> {
    if (!text || text.length === 0) {
      return [];
    }

    const chunkSize = options?.chunkSize ?? 1000;
    const defaultOverlap = Math.min(200, Math.floor(chunkSize / 2));
    const overlap = options?.overlap ?? defaultOverlap;

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap: overlap,
    });

    const textChunks = await splitter.splitText(text);

    return textChunks.map((chunkContent, index) => {
      return new DocumentChunk(randomUUID(), chunkContent, {
        source,
        chunkIndex: index,
      });
    });
  }

  async chunkDocuments(documents: any[]): Promise<DocumentChunk[]> {
    throw new Error('Method not implemented');
  }
}
