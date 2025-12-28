import { Injectable, Logger } from '@nestjs/common';
import { MarkdownTextSplitter, RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { TextChunkerService } from '../../domain/services/text-chunker.service';
import { ChunkStrategy } from '../../domain/enums/chunk-strategy.enum';
import {
  MarkdownChunkerConfig,
  DEFAULT_MARKDOWN_CONFIG,
} from '../../domain/config/chunker-config.interface';
import { DocumentChunk, DocumentMetadata } from '../../domain/entities/document-chunk.entity';
import { Document } from 'langchain/document';

@Injectable()
export class MarkdownHeaderChunkerService extends TextChunkerService<MarkdownChunkerConfig> {
  private readonly logger = new Logger(MarkdownHeaderChunkerService.name);

  getStrategy(): ChunkStrategy {
    return ChunkStrategy.MARKDOWN;
  }

  async chunkDocuments(
    documents: Document[],
    config: MarkdownChunkerConfig = DEFAULT_MARKDOWN_CONFIG,
  ): Promise<DocumentChunk[]> {
    this.logger.log(
      `Chunking ${documents.length} documents with chunkSize=${config.chunkSize}, chunkOverlap=${config.chunkOverlap}`,
    );

    const allChunks: DocumentChunk[] = [];

    for (const doc of documents) {
      const chunks = await this.chunkDocument(doc, config);
      allChunks.push(...chunks);
    }

    this.logger.log(`Created ${allChunks.length} total chunks`);

    return allChunks;
  }

  private async chunkDocument(
    document: Document,
    config: MarkdownChunkerConfig,
  ): Promise<DocumentChunk[]> {
    // Step 1: Split by headers using MarkdownTextSplitter with header detection
    const markdownSplitter = new MarkdownTextSplitter({
      chunkSize: config.chunkSize,
      chunkOverlap: config.chunkOverlap,
    });

    const headerSplits = await markdownSplitter.createDocuments([document.pageContent]);

    this.logger.log(`Split into ${headerSplits.length} sections`);

    // Step 2: Apply size constraints with RecursiveCharacterTextSplitter if needed
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: config.chunkSize,
      chunkOverlap: config.chunkOverlap,
    });

    const finalChunks = await textSplitter.splitDocuments(headerSplits);

    const chunks = finalChunks.map((doc, index) => {
      const metadata: DocumentMetadata = {
        source: document.metadata.source || 'unknown',
        ...document.metadata,
        ...doc.metadata,
        chunkStrategy: this.getStrategy(),
        chunkIndex: index,
      };

      this.logger.log(`Created chunk ${index} with length ${doc.pageContent.length}`);

      return new DocumentChunk(`${metadata.source}-chunk-${index}`, doc.pageContent, metadata);
    });

    return chunks;
  }
}
