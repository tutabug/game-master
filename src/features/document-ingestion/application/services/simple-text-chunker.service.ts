import { Injectable } from '@nestjs/common';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { DocumentChunk } from '../../domain/entities/document-chunk.entity';
import { Document } from 'langchain/document';
import { randomUUID } from 'crypto';
import { TextChunkerService, ChunkOptions } from '../../domain/services/text-chunker.service';

@Injectable()
export class SimpleTextChunkerService extends TextChunkerService {
  async chunkDocuments(documents: Document[], options?: ChunkOptions): Promise<DocumentChunk[]> {
    if (!documents || documents.length === 0) {
      return [];
    }

    const chunkSize = options?.chunkSize ?? 1000;
    const defaultOverlap = Math.min(200, Math.floor(chunkSize / 2));
    const overlap = options?.overlap ?? defaultOverlap;

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap: overlap,
    });

    const splitDocuments = await splitter.splitDocuments(documents);

    return splitDocuments.map((doc, index) => {
      const pageNumber = doc.metadata.loc?.pageNumber ?? doc.metadata.page;
      const source = doc.metadata.source;

      return new DocumentChunk(randomUUID(), doc.pageContent, {
        source,
        pageNumber,
        chunkIndex: index,
      });
    });
  }
}
