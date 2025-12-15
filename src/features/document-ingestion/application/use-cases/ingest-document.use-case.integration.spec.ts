import { Test, TestingModule } from '@nestjs/testing';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { OllamaEmbeddings } from '@langchain/ollama';
import { QdrantClient } from '@qdrant/js-client-rest';
import { IngestDocumentUseCase } from './ingest-document.use-case';
import { DocumentLoaderService } from '../services/document-loader.service';
import { SimpleTextChunkerService } from '../services/simple-text-chunker.service';
import { OllamaEmbeddingService } from '../services/ollama-embedding.service';
import {
  QdrantVectorRepository,
  QdrantPayload,
} from '../../infrastructure/repositories/qdrant-vector.repository';
import { TextChunkerService } from '../../domain/services/text-chunker.service';
import { EmbeddingService } from '../../domain/services/embedding.service';
import { VectorRepository } from '../../domain/repositories/vector.repository';
import * as path from 'path';

describe('IngestDocumentUseCase Integration', () => {
  let useCase: IngestDocumentUseCase;
  let ollamaContainer: StartedTestContainer;
  let qdrantContainer: StartedTestContainer;
  let ollamaBaseUrl: string;
  let qdrantClient: QdrantClient;

  beforeAll(async () => {
    console.log('Starting Ollama container...');
    ollamaContainer = await new GenericContainer('ollama/ollama:latest')
      .withExposedPorts(11434)
      .withWaitStrategy(Wait.forHttp('/api/tags', 11434).forStatusCode(200))
      .start();

    const ollamaHost = ollamaContainer.getHost();
    const ollamaPort = ollamaContainer.getMappedPort(11434);
    ollamaBaseUrl = `http://${ollamaHost}:${ollamaPort}`;

    console.log(`Ollama running at ${ollamaBaseUrl}`);

    console.log('Pulling nomic-embed-text model...');
    const pullResult = await ollamaContainer.exec(['ollama', 'pull', 'nomic-embed-text']);
    console.log('Model pull completed:', pullResult.exitCode === 0 ? 'success' : 'failed');

    console.log('Starting Qdrant container...');
    qdrantContainer = await new GenericContainer('qdrant/qdrant:latest')
      .withExposedPorts(6333)
      .withWaitStrategy(Wait.forHttp('/healthz', 6333).forStatusCode(200))
      .start();

    const qdrantHost = qdrantContainer.getHost();
    const qdrantPort = qdrantContainer.getMappedPort(6333);
    const qdrantUrl = `http://${qdrantHost}:${qdrantPort}`;

    console.log(`Qdrant running at ${qdrantUrl}`);

    qdrantClient = new QdrantClient({ url: qdrantUrl });
  }, 300000);

  afterAll(async () => {
    if (ollamaContainer) {
      await ollamaContainer.stop();
    }
    if (qdrantContainer) {
      await qdrantContainer.stop();
    }
  });

  afterEach(async () => {
    const collections = await qdrantClient.getCollections();
    for (const collection of collections.collections) {
      await qdrantClient.deleteCollection(collection.name);
    }
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestDocumentUseCase,
        DocumentLoaderService,
        {
          provide: TextChunkerService,
          useClass: SimpleTextChunkerService,
        },
        {
          provide: OllamaEmbeddings,
          useFactory: () => {
            return new OllamaEmbeddings({
              baseUrl: ollamaBaseUrl,
              model: 'nomic-embed-text',
            });
          },
        },
        {
          provide: EmbeddingService,
          useClass: OllamaEmbeddingService,
        },
        {
          provide: QdrantClient,
          useValue: qdrantClient,
        },
        {
          provide: VectorRepository,
          useClass: QdrantVectorRepository,
        },
      ],
    }).compile();

    useCase = module.get<IngestDocumentUseCase>(IngestDocumentUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
    expect(qdrantClient).toBeDefined();
  });

  it('should ingest PDF, generate embeddings, and store in Qdrant', async () => {
    const pdfPath = path.join(__dirname, '../../../../../documents/SRD_CC_v5.2.1.pdf');
    const collectionName = 'test-dnd-srd-1000-nomic-v1';

    // Process first ~28 pages (approximately 150 chunks with 1000 char chunks)
    const result = await useCase.execute(pdfPath, {
      maxChunks: 150,
      collectionName,
      version: 'test-v1',
      chunkStrategy: 'recursive-1000-200',
    });

    // Verify processing results
    expect(result).toBeDefined();
    expect(result.collectionName).toBe(collectionName);
    expect(result.pointsStored).toBe(150);

    // Verify collection was created in Qdrant
    const collectionInfo = await qdrantClient.getCollection(collectionName);
    expect(collectionInfo.points_count).toBe(150);
    expect(collectionInfo.config.params.vectors.size).toBe(768);

    // Get a point to use for search testing
    const scrollResult = await qdrantClient.scroll(collectionName, { limit: 1, with_vector: true });
    const firstPoint = scrollResult.points[0];
    expect(firstPoint).toBeDefined();
    expect(firstPoint.vector).toBeDefined();

    // Verify we can search the stored vectors
    const searchResults = await qdrantClient.search(collectionName, {
      vector: firstPoint.vector as number[],
      limit: 5,
      with_payload: true,
    });

    expect(searchResults.length).toBeGreaterThan(0);
    const firstPayload = searchResults[0].payload as unknown as QdrantPayload;
    expect(firstPayload).toHaveProperty('content');
    expect(firstPayload).toHaveProperty('chunk_index');
    expect(firstPayload).toHaveProperty('page_number');
    expect(firstPayload.version).toBe('test-v1');
    expect(firstPayload.embedding_model).toBe('nomic-embed-text');
    expect(firstPayload.chunk_strategy).toBe('recursive-1000-200');

    console.log(`Processed and stored ${result.pointsStored} chunks`);
    console.log(`Collection: ${collectionName}`);
    console.log(`First search result score: ${searchResults[0].score}`);
    console.log(`First chunk preview: ${firstPayload.content.substring(0, 100)}...`);
  }, 180000);

  it('should filter search results by metadata', async () => {
    const pdfPath = path.join(__dirname, '../../../../../documents/SRD_CC_v5.2.1.pdf');
    const collectionName = 'test-filtered-search';

    const result = await useCase.execute(pdfPath, {
      maxChunks: 10,
      collectionName,
    });

    expect(result.pointsStored).toBe(10);

    // Get a point to use for search testing
    const scrollResult = await qdrantClient.scroll(collectionName, { limit: 1, with_vector: true });
    const firstPoint = scrollResult.points[0];

    // Search with filter for first 5 chunks
    const searchResults = await qdrantClient.search(collectionName, {
      vector: firstPoint.vector as number[],
      limit: 5,
      with_payload: true,
      filter: {
        must: [{ key: 'chunk_index', range: { gte: 0, lte: 4 } }],
      },
    });

    expect(searchResults.length).toBeGreaterThan(0);
    searchResults.forEach((r) => {
      const payload = r.payload as unknown as QdrantPayload;
      expect(payload.chunk_index).toBeLessThanOrEqual(4);
    });

    console.log(`Filtered search returned ${searchResults.length} results`);
  }, 180000);
});
