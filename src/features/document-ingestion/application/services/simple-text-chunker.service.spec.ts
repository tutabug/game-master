import { Test, TestingModule } from '@nestjs/testing';
import { SimpleTextChunkerService } from './simple-text-chunker.service';
import { DocumentChunk } from '../../domain/entities/document-chunk.entity';
import { TextChunkerService } from '../../domain/services/text-chunker.service';

describe('SimpleTextChunkerService', () => {
  let service: TextChunkerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: TextChunkerService,
          useClass: SimpleTextChunkerService,
        },
      ],
    }).compile();

    service = module.get<TextChunkerService>(TextChunkerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('chunkDocuments', () => {
    it('should chunk documents and preserve page metadata', async () => {
      const documents = [
        { pageContent: 'A'.repeat(2000), metadata: { source: 'test.pdf', loc: { pageNumber: 1 } } },
        { pageContent: 'B'.repeat(2000), metadata: { source: 'test.pdf', loc: { pageNumber: 2 } } },
      ];

      const chunks = await service.chunkDocuments(documents, { chunkSize: 1000, overlap: 200 });

      expect(chunks).toBeDefined();
      expect(Array.isArray(chunks)).toBe(true);
      expect(chunks.length).toBeGreaterThan(2);
      expect(chunks[0]).toBeInstanceOf(DocumentChunk);
      expect(chunks[0].metadata.source).toBe('test.pdf');
      expect(chunks.some((c) => c.metadata.pageNumber === 1)).toBe(true);
    });

    it('should respect chunk size parameter', async () => {
      const documents = [
        { pageContent: 'A'.repeat(2000), metadata: { source: 'test.pdf', loc: { pageNumber: 1 } } },
      ];
      const chunkSize = 500;

      const chunks = await service.chunkDocuments(documents, { chunkSize });

      expect(chunks.length).toBeGreaterThan(2);
      chunks.forEach((chunk) => {
        expect(chunk.content.length).toBeLessThanOrEqual(chunkSize + 100);
      });
    });

    it('should handle empty documents array', async () => {
      const documents = [];

      const chunks = await service.chunkDocuments(documents, { chunkSize: 1000, overlap: 200 });

      expect(chunks).toBeDefined();
      expect(chunks.length).toBe(0);
    });

    it('should create overlap between chunks', async () => {
      const documents = [
        {
          pageContent: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.repeat(50),
          metadata: { source: 'test.pdf', loc: { pageNumber: 1 } },
        },
      ];
      const chunkSize = 200;
      const overlap = 50;

      const chunks = await service.chunkDocuments(documents, { chunkSize, overlap });

      expect(chunks.length).toBeGreaterThan(1);
      const chunk1End = chunks[0].content.slice(-20);
      const chunk2Start = chunks[1].content.slice(0, 20);
      expect(chunk2Start).toContain(chunk1End.slice(0, 10));
    });
  });
});
