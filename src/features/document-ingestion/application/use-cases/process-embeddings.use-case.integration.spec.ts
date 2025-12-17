import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { MongoDBContainer } from '@testcontainers/mongodb';
import { QdrantContainer } from '@testcontainers/qdrant';
import { OllamaContainer } from '@testcontainers/ollama';
import { OllamaEmbeddings } from '@langchain/ollama';
import { QdrantClient } from '@qdrant/js-client-rest';
import * as mongoose from 'mongoose';
import { ProcessEmbeddingsUseCase } from './process-embeddings.use-case';
import { ChunkDocumentOptions, ChunkDocumentUseCase } from './chunk-document.use-case';
import { EmbeddingTaskRepository } from '../../domain/repositories/embedding-task.repository';
import { StoredChunkRepository } from '../../domain/repositories/stored-chunk.repository';
import { ChunkingTaskRepository } from '../../domain/repositories/ingestion-task.repository';
import { EmbeddingService } from '../../domain/services/embedding.service';
import { VectorStoreService } from '../../domain/services/vector-store.service';
import { MongooseEmbeddingTaskRepository } from '../../infrastructure/repositories/mongoose-embedding-task.repository';
import { MongooseStoredChunkRepository } from '../../infrastructure/repositories/mongoose-stored-chunk.repository';
import { MongooseChunkingTaskRepository } from '../../infrastructure/repositories/mongoose-chunking-task.repository';
import { QdrantVectorStoreService } from '../../infrastructure/services/qdrant-vector-store.service';
import { DocumentLoaderService } from '../services/document-loader.service';
import { TextChunkerService } from '../../domain/services/text-chunker.service';
import { SimpleTextChunkerService } from '../services/simple-text-chunker.service';
import { OllamaEmbeddingService } from '../services/ollama-embedding.service';
import {
  EmbeddingTaskDocument,
  EmbeddingTaskSchema,
} from '../../infrastructure/schemas/embedding-task.schema';
import {
  ChunkingTaskDocument,
  ChunkingTaskSchema,
} from '../../infrastructure/schemas/ingestion-task.schema';
import {
  StoredChunkDocument,
  StoredChunkSchema,
} from '../../infrastructure/schemas/stored-chunk.schema';
import { EmbeddingTaskStatus } from '../../domain/entities/embedding-task.entity';

describe('ProcessEmbeddingsUseCase Integration', () => {
  let mongoContainer: any;
  let qdrantContainer: any;
  let ollamaContainer: any;
  let moduleRef: TestingModule;
  let processEmbeddingsUseCase: ProcessEmbeddingsUseCase;
  let chunkDocumentUseCase: ChunkDocumentUseCase;
  let qdrantClient: QdrantClient;

  beforeAll(async () => {
    console.log('Starting containers...');
    mongoContainer = await new MongoDBContainer('mongo:8').start();
    qdrantContainer = await new QdrantContainer('qdrant/qdrant:v1.7.4').start();
    ollamaContainer = await new OllamaContainer('ollama/ollama:latest').start();

    await ollamaContainer.exec(['ollama', 'pull', 'nomic-embed-text']);
    console.log('Containers started successfully');

    const connectionString = `${mongoContainer.getConnectionString()}?directConnection=true`;
    const qdrantUrl = `http://${qdrantContainer.getHost()}:${qdrantContainer.getMappedPort(6333)}`;
    const ollamaUrl = `http://${ollamaContainer.getHost()}:${ollamaContainer.getMappedPort(11434)}`;

    const ollamaEmbeddings = new OllamaEmbeddings({
      baseUrl: ollamaUrl,
      model: 'nomic-embed-text',
    });

    qdrantClient = new QdrantClient({ url: qdrantUrl });

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'QDRANT_URL') return qdrantUrl;
        if (key === 'OLLAMA_BASE_URL') return ollamaUrl;
        if (key === 'OLLAMA_MODEL') return 'nomic-embed-text';
        return defaultValue;
      }),
    };

    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(connectionString),
        MongooseModule.forFeature([
          { name: EmbeddingTaskDocument.name, schema: EmbeddingTaskSchema },
          { name: ChunkingTaskDocument.name, schema: ChunkingTaskSchema },
          { name: StoredChunkDocument.name, schema: StoredChunkSchema },
        ]),
      ],
      providers: [
        ProcessEmbeddingsUseCase,
        ChunkDocumentUseCase,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EmbeddingTaskRepository,
          useClass: MongooseEmbeddingTaskRepository,
        },
        {
          provide: StoredChunkRepository,
          useClass: MongooseStoredChunkRepository,
        },
        {
          provide: ChunkingTaskRepository,
          useClass: MongooseChunkingTaskRepository,
        },
        DocumentLoaderService,
        {
          provide: TextChunkerService,
          useClass: SimpleTextChunkerService,
        },
        {
          provide: OllamaEmbeddings,
          useValue: ollamaEmbeddings,
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
          provide: VectorStoreService,
          useClass: QdrantVectorStoreService,
        },
      ],
    }).compile();

    processEmbeddingsUseCase = moduleRef.get<ProcessEmbeddingsUseCase>(ProcessEmbeddingsUseCase);
    chunkDocumentUseCase = moduleRef.get<ChunkDocumentUseCase>(ChunkDocumentUseCase);
  }, 120000);

  afterAll(async () => {
    await mongoContainer.stop();
    await qdrantContainer.stop();
    await ollamaContainer.stop();
  });

  beforeEach(async () => {});

  afterEach(async () => {
    if (moduleRef) {
      const connection = moduleRef.get<mongoose.Connection>(getConnectionToken());
      const collections = await connection.db.collections();
      for (const collection of collections) {
        await collection.deleteMany({});
      }

      try {
        const collectionsResponse = await qdrantClient.getCollections();
        for (const collection of collectionsResponse.collections) {
          await qdrantClient.deleteCollection(collection.name);
        }
      } catch (error) {}

      await moduleRef.close();
    }
  });

  describe('execute', () => {
    it('should process embeddings for chunks and store in vector database', async () => {
      const filePath = 'documents/SRD_CC_v5.2.1.pdf';
      const chunkingConfig: ChunkDocumentOptions = {
        chunkStrategy: 'recursive-100-20',
        chunkSize: 100,
        chunkOverlap: 20,
        maxChunks: 1,
      };

      const chunkResult = await chunkDocumentUseCase.execute(filePath, chunkingConfig);

      expect(chunkResult.totalChunks).toBe(1);

      const result = await processEmbeddingsUseCase.execute({
        chunkingTaskId: chunkResult.taskId,
        documentId: chunkResult.documentId,
      });

      expect(result.taskId).toBeDefined();
      expect(result.documentId).toBe(chunkResult.documentId);
      expect(result.totalChunks).toBe(chunkResult.totalChunks);
      expect(result.processedChunks).toBe(chunkResult.totalChunks);
      expect(result.status).toBe(EmbeddingTaskStatus.COMPLETED);
      expect(result.collectionName).toBe('documents');

      const collection = await qdrantClient.getCollection('documents');
      expect(collection.config?.params?.vectors).toBeDefined();

      const points = await qdrantClient.scroll('documents', {
        limit: 100,
        with_payload: true,
        with_vector: true,
      });

      expect(points.points.length).toBe(chunkResult.totalChunks);

      const firstPoint = points.points[0];
      expect(firstPoint.vector).toBeDefined();
      expect(Array.isArray(firstPoint.vector)).toBe(true);
      expect((firstPoint.vector as number[]).length).toBe(768);
      expect(firstPoint.payload?.chunkId).toBeDefined();
      expect(firstPoint.payload?.documentId).toBe(chunkResult.documentId);
      expect(firstPoint.payload?.chunkingTaskId).toBe(chunkResult.taskId);
      expect(firstPoint.payload?.embeddingTaskId).toBe(result.taskId);
      expect(firstPoint.payload?.content).toBeDefined();
      expect(firstPoint.payload?.chunkIndex).toBeDefined();
      expect(firstPoint.payload?.contentType).toBe('application/pdf');
      expect(Array.isArray(firstPoint.payload?.tags)).toBe(true);
      expect(firstPoint.payload?.createdAt).toBeDefined();
      expect(firstPoint.payload?.version).toBe('1.0');
    }, 60000);
  });
});
