import { MiniLmEmbeddingService } from './minilm-embedding.service';
import { FeatureExtractionPipeline } from '../../domain/services/embedding.service';

describe('MiniLmEmbeddingService', () => {
  let service: MiniLmEmbeddingService;
  let mockExtractor: FeatureExtractionPipeline;

  beforeEach(() => {
    const mockEmbedding = new Array(384).fill(0).map((_, i) => i / 384);

    mockExtractor = {
      call: jest.fn().mockResolvedValue({
        data: new Float32Array(mockEmbedding),
      }),
    };

    service = new MiniLmEmbeddingService(mockExtractor);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateEmbedding', () => {
    it('should generate embedding vector for text', async () => {
      const text = 'Fireball is a 3rd level evocation spell';

      const embedding = await service.generateEmbedding(text);

      expect(embedding).toBeDefined();
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBeGreaterThan(0);
      expect(typeof embedding[0]).toBe('number');
    });

    it('should generate consistent embeddings for same text', async () => {
      const text = 'Test text';

      const embedding1 = await service.generateEmbedding(text);
      const embedding2 = await service.generateEmbedding(text);

      expect(embedding1).toEqual(embedding2);
      expect(mockExtractor.call).toHaveBeenCalledWith([text], { pooling: 'mean', normalize: true });
    });

    it('should call extractor with correct parameters for different texts', async () => {
      const text1 = 'Fireball spell causes fire damage';
      const text2 = 'Magic Missile spell causes force damage';

      await service.generateEmbedding(text1);
      await service.generateEmbedding(text2);

      expect(mockExtractor.call).toHaveBeenCalledWith([text1], {
        pooling: 'mean',
        normalize: true,
      });
      expect(mockExtractor.call).toHaveBeenCalledWith([text2], {
        pooling: 'mean',
        normalize: true,
      });
      expect(mockExtractor.call).toHaveBeenCalledTimes(2);
    });

    it('should handle empty string', async () => {
      const text = '';

      const embedding = await service.generateEmbedding(text);

      expect(embedding).toBeDefined();
      expect(Array.isArray(embedding)).toBe(true);
    });
  });

  describe('generateEmbeddings', () => {
    it('should generate embeddings for multiple texts', async () => {
      const texts = [
        'First spell description',
        'Second spell description',
        'Third spell description',
      ];

      const embeddings = await service.generateEmbeddings(texts);

      expect(embeddings).toBeDefined();
      expect(embeddings.length).toBe(3);
      expect(Array.isArray(embeddings[0])).toBe(true);
    });

    it('should handle empty array', async () => {
      const texts: string[] = [];

      const embeddings = await service.generateEmbeddings(texts);

      expect(embeddings).toBeDefined();
      expect(embeddings.length).toBe(0);
    });

    it('should process multiple texts in batch', async () => {
      const texts = ['Text 1', 'Text 2', 'Text 3'];

      const embeddings = await service.generateEmbeddings(texts);

      expect(embeddings.length).toBe(3);
      expect(mockExtractor.call).toHaveBeenCalledTimes(3);
    });
  });
});
