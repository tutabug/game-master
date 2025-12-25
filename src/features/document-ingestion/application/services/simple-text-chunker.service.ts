import { Injectable } from '@nestjs/common';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { DocumentChunk } from '../../domain/entities/document-chunk.entity';
import { Document } from 'langchain/document';
import { randomUUID } from 'crypto';
import { TextChunkerService } from '../../domain/services/text-chunker.service';
import { ChunkStrategy } from '../../domain/enums/chunk-strategy.enum';
import {
  RecursiveChunkerConfig,
  DEFAULT_RECURSIVE_CONFIG,
} from '../../domain/config/chunker-config.interface';

@Injectable()
export class SimpleTextChunkerService extends TextChunkerService<RecursiveChunkerConfig> {
  getStrategy(): ChunkStrategy {
    return ChunkStrategy.RECURSIVE;
  }

  async chunkDocuments(
    documents: Document[],
    config: RecursiveChunkerConfig = DEFAULT_RECURSIVE_CONFIG,
  ): Promise<DocumentChunk[]> {
    if (!documents || documents.length === 0) {
      return [];
    }

    const chunkSize = config.chunkSize ?? DEFAULT_RECURSIVE_CONFIG.chunkSize;
    const overlap = config.overlap ?? DEFAULT_RECURSIVE_CONFIG.overlap;

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
