import { Test, TestingModule } from '@nestjs/testing';
import { IngestDocumentUseCase } from './ingest-document.use-case';
import { DocumentLoaderService } from '../services/document-loader.service';
import { TextChunkerService } from '../services/text-chunker.service';
import { EmbeddingService } from '../services/embedding.service';
import { DocumentRepository } from '../../domain/repositories/document.repository';
import { mock, MockProxy } from 'jest-mock-extended';
import { DocumentChunk } from '../../domain/entities/document-chunk.entity';

describe('IngestDocumentUseCase', () => {
  let useCase: IngestDocumentUseCase;
  let documentLoader: MockProxy<DocumentLoaderService>;
  let textChunker: MockProxy<TextChunkerService>;
  let embeddingService: MockProxy<EmbeddingService>;
  let documentRepository: MockProxy<DocumentRepository>;

  beforeEach(async () => {
    documentLoader = mock<DocumentLoaderService>();
    textChunker = mock<TextChunkerService>();
    embeddingService = mock<EmbeddingService>();
    documentRepository = mock<DocumentRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestDocumentUseCase,
        { provide: DocumentLoaderService, useValue: documentLoader },
        { provide: TextChunkerService, useValue: textChunker },
        { provide: EmbeddingService, useValue: embeddingService },
        { provide: DocumentRepository, useValue: documentRepository },
      ],
    }).compile();

    useCase = module.get<IngestDocumentUseCase>(IngestDocumentUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should ingest document through full pipeline', async () => {
      const filePath = 'documents/test.pdf';
      const documents = [{ pageContent: 'Test content', metadata: { source: filePath, page: 1 } }];
      const chunks = [new DocumentChunk('1', 'Test content', { source: filePath, chunkIndex: 0 })];
      const embedding = [0.1, 0.2, 0.3];

      documentLoader.loadPdfWithMetadata.mockResolvedValue(documents);
      textChunker.chunkDocuments.mockResolvedValue(chunks);
      embeddingService.generateEmbeddings.mockResolvedValue([embedding]);
      documentRepository.saveChunks.mockResolvedValue();

      const result = await useCase.execute(filePath);

      expect(documentLoader.loadPdfWithMetadata).toHaveBeenCalledWith(filePath);
      expect(textChunker.chunkDocuments).toHaveBeenCalledWith(documents);
      expect(embeddingService.generateEmbeddings).toHaveBeenCalled();
      expect(documentRepository.saveChunks).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.chunksProcessed).toBe(1);
    });

    it('should handle errors during document loading', async () => {
      const filePath = 'documents/invalid.pdf';

      documentLoader.loadPdfWithMetadata.mockRejectedValue(new Error('File not found'));

      await expect(useCase.execute(filePath)).rejects.toThrow('File not found');
    });

    it('should process multiple chunks correctly', async () => {
      const filePath = 'documents/test.pdf';
      const documents = [
        { pageContent: 'Content 1', metadata: { source: filePath, page: 1 } },
        { pageContent: 'Content 2', metadata: { source: filePath, page: 2 } },
      ];
      const chunks = [
        new DocumentChunk('1', 'Content 1', { source: filePath, chunkIndex: 0 }),
        new DocumentChunk('2', 'Content 2', { source: filePath, chunkIndex: 1 }),
      ];
      const embeddings = [
        [0.1, 0.2],
        [0.3, 0.4],
      ];

      documentLoader.loadPdfWithMetadata.mockResolvedValue(documents);
      textChunker.chunkDocuments.mockResolvedValue(chunks);
      embeddingService.generateEmbeddings.mockResolvedValue(embeddings);
      documentRepository.saveChunks.mockResolvedValue();

      const result = await useCase.execute(filePath);

      expect(result.chunksProcessed).toBe(2);
      expect(documentRepository.saveChunks).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: '1' }),
          expect.objectContaining({ id: '2' }),
        ]),
      );
    });

    it('should clear existing chunks for same source before ingesting', async () => {
      const filePath = 'documents/test.pdf';
      const documents = [{ pageContent: 'Test', metadata: { source: filePath, page: 1 } }];
      const chunks = [new DocumentChunk('1', 'Test', { source: filePath, chunkIndex: 0 })];

      documentLoader.loadPdfWithMetadata.mockResolvedValue(documents);
      textChunker.chunkDocuments.mockResolvedValue(chunks);
      embeddingService.generateEmbeddings.mockResolvedValue([[0.1]]);
      documentRepository.deleteBySource.mockResolvedValue();
      documentRepository.saveChunks.mockResolvedValue();

      await useCase.execute(filePath);

      expect(documentRepository.deleteBySource).toHaveBeenCalledWith(filePath);
    });
  });
});
