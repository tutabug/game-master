import { Test, TestingModule } from '@nestjs/testing';
import { TextChunkerService } from './text-chunker.service';
import { DocumentChunk } from '../../domain/entities/document-chunk.entity';

describe('TextChunkerService', () => {
  let service: TextChunkerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TextChunkerService],
    }).compile();

    service = module.get<TextChunkerService>(TextChunkerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('chunkText', () => {
    it('should split text into chunks with default size', async () => {
      const text = 'A'.repeat(2000);
      const source = 'test.pdf';

      const chunks = await service.chunkText(text, source);

      expect(chunks).toBeDefined();
      expect(Array.isArray(chunks)).toBe(true);
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0]).toBeInstanceOf(DocumentChunk);
    });

    it('should respect chunk size parameter', async () => {
      const text = 'A'.repeat(1000);
      const source = 'test.pdf';
      const chunkSize = 200;

      const chunks = await service.chunkText(text, source, { chunkSize });

      expect(chunks.length).toBeGreaterThan(2);
      chunks.forEach((chunk) => {
        expect(chunk.content.length).toBeLessThanOrEqual(chunkSize + 50);
      });
    });

    it('should create overlap between chunks', async () => {
      const text = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.repeat(50);
      const source = 'test.pdf';
      const chunkSize = 200;
      const overlap = 50;

      const chunks = await service.chunkText(text, source, { chunkSize, overlap });

      expect(chunks.length).toBeGreaterThan(1);

      const chunk1End = chunks[0].content.slice(-20);
      const chunk2Start = chunks[1].content.slice(0, 20);
      expect(chunk2Start).toContain(chunk1End.slice(0, 10));
    });

    it('should preserve metadata in chunks', async () => {
      const text = 'Test content';
      const source = 'test.pdf';

      const chunks = await service.chunkText(text, source);

      expect(chunks[0].metadata).toBeDefined();
      expect(chunks[0].metadata.source).toBe(source);
      expect(chunks[0].metadata.chunkIndex).toBe(0);
    });

    it('should handle empty text', async () => {
      const text = '';
      const source = 'test.pdf';

      const chunks = await service.chunkText(text, source);

      expect(chunks).toBeDefined();
      expect(chunks.length).toBe(0);
    });

    it('should not split text smaller than chunk size', async () => {
      const text = 'Short text';
      const source = 'test.pdf';
      const chunkSize = 1000;

      const chunks = await service.chunkText(text, source, { chunkSize });

      expect(chunks.length).toBe(1);
      expect(chunks[0].content).toBe(text);
    });
  });

  describe('chunkDocuments', () => {
    it('should chunk documents with metadata preservation', async () => {
      const documents = [
        { pageContent: 'A'.repeat(1000), metadata: { source: 'test.pdf', page: 1 } },
        { pageContent: 'B'.repeat(1000), metadata: { source: 'test.pdf', page: 2 } },
      ];

      const chunks = await service.chunkDocuments(documents);

      expect(chunks).toBeDefined();
      expect(chunks.length).toBeGreaterThan(2);
      expect(chunks[0].metadata.source).toBe('test.pdf');
      expect(chunks.some((c) => c.metadata.pageNumber === 1)).toBe(true);
    });
  });
});
