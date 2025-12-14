import { Test, TestingModule } from '@nestjs/testing';
import { EmbeddingService } from './embedding.service';

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmbeddingService],
    }).compile();

    service = module.get<EmbeddingService>(EmbeddingService);
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
    });

    it('should generate different embeddings for different text', async () => {
      const text1 = 'Fireball spell';
      const text2 = 'Magic Missile spell';

      const embedding1 = await service.generateEmbedding(text1);
      const embedding2 = await service.generateEmbedding(text2);

      expect(embedding1).not.toEqual(embedding2);
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

    it('should batch process large arrays efficiently', async () => {
      const texts = Array(100).fill('Test text');

      const startTime = Date.now();
      const embeddings = await service.generateEmbeddings(texts);
      const duration = Date.now() - startTime;

      expect(embeddings.length).toBe(100);
      expect(duration).toBeLessThan(30000);
    });
  });
});
