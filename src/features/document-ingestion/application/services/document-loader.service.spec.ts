import { Test, TestingModule } from '@nestjs/testing';
import { DocumentLoaderService } from './document-loader.service';

describe('DocumentLoaderService', () => {
  let service: DocumentLoaderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentLoaderService],
    }).compile();

    service = module.get<DocumentLoaderService>(DocumentLoaderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('loadPdfWithMetadata', () => {
    it('should load a PDF and return documents with metadata', async () => {
      const filePath = 'documets/SRD_CC_v5.2.1.pdf';

      const result = await service.loadPdfWithMetadata(filePath);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('pageContent');
      expect(result[0]).toHaveProperty('metadata');
      expect(result[0].metadata).toHaveProperty('source');
    });

    it('should throw error for non-existent file', async () => {
      const filePath = 'documets/non-existent.pdf';

      await expect(service.loadPdfWithMetadata(filePath)).rejects.toThrow();
    });
  });
});
