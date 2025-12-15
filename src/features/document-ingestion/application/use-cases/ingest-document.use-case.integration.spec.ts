import { Test, TestingModule } from '@nestjs/testing';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { IngestDocumentUseCase } from './ingest-document.use-case';
import { DocumentLoaderService } from '../services/document-loader.service';
import { SimpleTextChunkerService } from '../services/simple-text-chunker.service';
import { OllamaEmbeddingService } from '../services/ollama-embedding.service';
import { TextChunkerService } from '../../domain/services/text-chunker.service';
import { EmbeddingService } from '../../domain/services/embedding.service';
import * as path from 'path';

describe('IngestDocumentUseCase Integration', () => {
  let useCase: IngestDocumentUseCase;
  let ollamaContainer: StartedTestContainer;
  let ollamaBaseUrl: string;

  beforeAll(async () => {
    console.log('Starting Ollama container...');
    ollamaContainer = await new GenericContainer('ollama/ollama:latest')
      .withExposedPorts(11434)
      .withWaitStrategy(Wait.forHttp('/api/tags', 11434).forStatusCode(200))
      .start();

    const host = ollamaContainer.getHost();
    const port = ollamaContainer.getMappedPort(11434);
    ollamaBaseUrl = `http://${host}:${port}`;

    console.log(`Ollama running at ${ollamaBaseUrl}`);

    console.log('Pulling nomic-embed-text model...');
    const pullResult = await ollamaContainer.exec(['ollama', 'pull', 'nomic-embed-text']);
    console.log('Model pull completed:', pullResult.exitCode === 0 ? 'success' : 'failed');
  }, 300000);

  afterAll(async () => {
    if (ollamaContainer) {
      await ollamaContainer.stop();
    }
  });

  beforeEach(async () => {
    const embeddingService = new OllamaEmbeddingService(ollamaBaseUrl, 'nomic-embed-text');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestDocumentUseCase,
        DocumentLoaderService,
        {
          provide: TextChunkerService,
          useClass: SimpleTextChunkerService,
        },
        {
          provide: EmbeddingService,
          useValue: embeddingService,
        },
      ],
    }).compile();

    useCase = module.get<IngestDocumentUseCase>(IngestDocumentUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should ingest a PDF document and generate embeddings', async () => {
    const pdfPath = path.join(__dirname, '../../../../../documents/SRD_CC_v5.2.1.pdf');

    const result = await useCase.execute(pdfPath, { maxChunks: 3 });

    expect(result).toBeDefined();
    expect(result.chunks).toBeDefined();
    expect(Array.isArray(result.chunks)).toBe(true);
    expect(result.chunks.length).toBe(3);

    expect(result.embeddings).toBeDefined();
    expect(Array.isArray(result.embeddings)).toBe(true);
    expect(result.embeddings.length).toBe(3);

    const firstEmbedding = result.embeddings[0];
    expect(Array.isArray(firstEmbedding)).toBe(true);
    expect(firstEmbedding.length).toBeGreaterThan(0);
    expect(typeof firstEmbedding[0]).toBe('number');

    console.log(`Processed ${result.chunks.length} chunks`);
    console.log(`First embedding dimension: ${firstEmbedding.length}`);
    console.log(`First chunk text preview: ${result.chunks[0].content.substring(0, 100)}...`);
  }, 120000);

  it.skip('should generate consistent embeddings for same text', async () => {
    const pdfPath = path.join(__dirname, '../../../../../documents/SRD_CC_v5.2.1.pdf');

    const result1 = await useCase.execute(pdfPath);
    const result2 = await useCase.execute(pdfPath);

    expect(result1.embeddings[0]).toEqual(result2.embeddings[0]);
  }, 300000);
});
