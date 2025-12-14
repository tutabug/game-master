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

  describe('loadPdf', () => {
    it('should load a PDF and return text content', async () => {
      const filePath = 'documents/SRD_CC_v5.2.1.pdf';

      const result = await service.loadPdf(filePath);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should throw error for non-existent file', async () => {
      const filePath = 'documents/non-existent.pdf';

      await expect(service.loadPdf(filePath)).rejects.toThrow();
    });

    it('should extract page metadata from PDF', async () => {
      const filePath = 'documents/SRD_CC_v5.2.1.pdf';

      const result = await service.loadPdfWithMetadata(filePath);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('pageContent');
      expect(result[0]).toHaveProperty('metadata');
      expect(result[0].metadata).toHaveProperty('source');
    });
  });
});
