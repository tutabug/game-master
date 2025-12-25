import { Injectable, Logger } from '@nestjs/common';
import { DocumentChunk } from '../../domain/entities/document-chunk.entity';
import { Document } from 'langchain/document';
import { randomUUID } from 'crypto';
import { TextChunkerService } from '../../domain/services/text-chunker.service';
import { ChunkStrategy } from '../../domain/enums/chunk-strategy.enum';
import { TocChunkerConfig, DEFAULT_TOC_CONFIG } from '../../domain/config/chunker-config.interface';

interface TocSection {
  title: string;
  content: string;
  startPage?: number;
  level: number;
}

@Injectable()
export class TocTextChunkerService extends TextChunkerService<TocChunkerConfig> {
  private readonly logger = new Logger(TocTextChunkerService.name);

  getStrategy(): ChunkStrategy {
    return ChunkStrategy.TOC;
  }

  async chunkDocuments(
    documents: Document[],
    config: TocChunkerConfig = DEFAULT_TOC_CONFIG,
  ): Promise<DocumentChunk[]> {
    if (!documents || documents.length === 0) {
      return [];
    }

    const sections = this.extractSections(documents, config);
    const processedSections = this.processSections(sections, config);

    return processedSections.map((section, index) => {
      return new DocumentChunk(randomUUID(), section.content, {
        source: documents[0].metadata.source,
        pageNumber: section.startPage,
        chunkIndex: index,
        sectionTitle: section.title,
        sectionLevel: section.level,
      });
    });
  }

  private extractSections(documents: Document[], config: TocChunkerConfig): TocSection[] {
    const sections: TocSection[] = [];
    const headerPatterns = config.headerPatterns ?? DEFAULT_TOC_CONFIG.headerPatterns!;

    for (const doc of documents) {
      const content = doc.pageContent;
      const pageNumber = doc.metadata.loc?.pageNumber ?? doc.metadata.page;

      const lines = content.split('\n');
      let currentSection: TocSection | null = null;
      let contentBuffer: string[] = [];

      for (const line of lines) {
        const headerMatch = this.matchHeader(line, headerPatterns);

        if (headerMatch) {
          if (currentSection && contentBuffer.length > 0) {
            currentSection.content = contentBuffer.join('\n').trim();
            sections.push(currentSection);
          }

          currentSection = {
            title: headerMatch.title,
            content: '',
            startPage: pageNumber,
            level: headerMatch.level,
          };
          contentBuffer = [line];
        } else if (currentSection) {
          contentBuffer.push(line);
        }
      }

      if (currentSection && contentBuffer.length > 0) {
        currentSection.content = contentBuffer.join('\n').trim();
        sections.push(currentSection);
      }
    }

    this.logger.log(`Extracted ${sections.length} sections from TOC structure`);
    return sections;
  }

  private matchHeader(line: string, patterns: RegExp[]): { title: string; level: number } | null {
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      const match = line.match(pattern);

      if (match) {
        const title = match[1]?.trim() || line.trim();
        const level = this.detectHeaderLevel(line, match);

        return { title, level };
      }
    }

    return null;
  }

  private detectHeaderLevel(line: string, match: RegExpMatchArray): number {
    const markdownMatch = line.match(/^(#+)\s/);
    if (markdownMatch) {
      return markdownMatch[1].length;
    }

    const uppercaseRatio = (line.match(/[A-Z]/g) || []).length / line.length;
    if (uppercaseRatio > 0.7) {
      return 1;
    }

    return 2;
  }

  private processSections(sections: TocSection[], config: TocChunkerConfig): TocSection[] {
    const maxChunkSize = config.maxChunkSize ?? DEFAULT_TOC_CONFIG.maxChunkSize!;
    const minChunkSize = config.minChunkSize ?? DEFAULT_TOC_CONFIG.minChunkSize!;
    const combineSmall = config.combineSmallSections ?? DEFAULT_TOC_CONFIG.combineSmallSections!;

    let processed: TocSection[] = [];

    for (const section of sections) {
      if (section.content.length > maxChunkSize) {
        processed.push(...this.splitLargeSection(section, maxChunkSize));
      } else {
        processed.push(section);
      }
    }

    if (combineSmall) {
      processed = this.combineSmallSections(processed, minChunkSize, maxChunkSize);
    } else {
      processed = processed.filter((s) => s.content.length >= minChunkSize);
    }

    this.logger.log(`Processed into ${processed.length} final chunks`);
    return processed;
  }

  private splitLargeSection(section: TocSection, maxSize: number): TocSection[] {
    const chunks: TocSection[] = [];
    const paragraphs = section.content.split(/\n\n+/);

    let currentChunk = '';
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > maxSize && currentChunk.length > 0) {
        chunks.push({
          title: `${section.title} (Part ${chunkIndex + 1})`,
          content: currentChunk.trim(),
          startPage: section.startPage,
          level: section.level,
        });
        currentChunk = '';
        chunkIndex++;
      }

      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }

    if (currentChunk.trim()) {
      chunks.push({
        title: chunks.length > 0 ? `${section.title} (Part ${chunkIndex + 1})` : section.title,
        content: currentChunk.trim(),
        startPage: section.startPage,
        level: section.level,
      });
    }

    return chunks;
  }

  private combineSmallSections(
    sections: TocSection[],
    minSize: number,
    maxSize: number,
  ): TocSection[] {
    const combined: TocSection[] = [];
    let buffer: TocSection[] = [];
    let bufferSize = 0;

    for (const section of sections) {
      if (section.content.length >= minSize) {
        if (buffer.length > 0) {
          combined.push(this.mergeBufferedSections(buffer));
          buffer = [];
          bufferSize = 0;
        }
        combined.push(section);
      } else {
        buffer.push(section);
        bufferSize += section.content.length;

        if (bufferSize >= minSize || bufferSize > maxSize / 2) {
          combined.push(this.mergeBufferedSections(buffer));
          buffer = [];
          bufferSize = 0;
        }
      }
    }

    if (buffer.length > 0) {
      combined.push(this.mergeBufferedSections(buffer));
    }

    return combined;
  }

  private mergeBufferedSections(sections: TocSection[]): TocSection {
    const titles = sections.map((s) => s.title).join(', ');
    const content = sections.map((s) => `## ${s.title}\n\n${s.content}`).join('\n\n');

    return {
      title: titles,
      content,
      startPage: sections[0].startPage,
      level: Math.min(...sections.map((s) => s.level)),
    };
  }
}
