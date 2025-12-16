import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoDBContainer, StartedMongoDBContainer } from '@testcontainers/mongodb';
import * as request from 'supertest';
import * as path from 'path';
import * as mongoose from 'mongoose';
import { DocumentIngestionController } from './document-ingestion.controller';
import { ChunkDocumentUseCase } from '../../application/use-cases/chunk-document.use-case';
import { DocumentLoaderService } from '../../application/services/document-loader.service';
import { SimpleTextChunkerService } from '../../application/services/simple-text-chunker.service';
import { MongooseChunkingTaskRepository } from '../../infrastructure/repositories/mongoose-chunking-task.repository';
import { MongooseStoredChunkRepository } from '../../infrastructure/repositories/mongoose-stored-chunk.repository';
import { TextChunkerService } from '../../domain/services/text-chunker.service';
import { ChunkingTaskRepository } from '../../domain/repositories/ingestion-task.repository';
import { StoredChunkRepository } from '../../domain/repositories/stored-chunk.repository';
import {
  ChunkingTaskDocument,
  ChunkingTaskSchema,
} from '../../infrastructure/schemas/ingestion-task.schema';
import {
  StoredChunkDocument,
  StoredChunkSchema,
} from '../../infrastructure/schemas/stored-chunk.schema';

describe('DocumentIngestionController Integration', () => {
  let app: INestApplication;
  let mongoContainer: StartedMongoDBContainer;
  let mongoUri: string;

  beforeAll(async () => {
    const originalConsoleWarn = console.warn;
    console.warn = (...args: any[]) => {
      const message = args[0]?.toString() || '';
      if (!message.includes('Could not find a preferred cmap table')) {
        originalConsoleWarn(...args);
      }
    };

    console.log('Starting MongoDB container...');
    mongoContainer = await new MongoDBContainer('mongo:7').start();
    mongoUri = `${mongoContainer.getConnectionString()}?directConnection=true`;
    console.log(`MongoDB running at ${mongoUri}`);

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        MongooseModule.forFeature([
          { name: ChunkingTaskDocument.name, schema: ChunkingTaskSchema },
          { name: StoredChunkDocument.name, schema: StoredChunkSchema },
        ]),
      ],
      controllers: [DocumentIngestionController],
      providers: [
        ChunkDocumentUseCase,
        DocumentLoaderService,
        {
          provide: TextChunkerService,
          useClass: SimpleTextChunkerService,
        },
        {
          provide: ChunkingTaskRepository,
          useClass: MongooseChunkingTaskRepository,
        },
        {
          provide: StoredChunkRepository,
          useClass: MongooseStoredChunkRepository,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  }, 60000);

  afterEach(async () => {
    const collections = await mongoose.connection.db?.collections();
    if (collections) {
      for (const collection of collections) {
        await collection.deleteMany({});
      }
    }
  });

  afterAll(async () => {
    await app.close();
    await mongoose.disconnect();
    if (mongoContainer) {
      await mongoContainer.stop();
    }
  });

  describe('POST /document-ingestion/chunk', () => {
    it('should chunk a PDF document and return task details', async () => {
      const response = await request(app.getHttpServer()).post('/document-ingestion/chunk').send({
        filename: 'SRD_CC_v5.2.1.pdf',
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('taskId');
      expect(response.body).toHaveProperty('documentId');
      expect(response.body.documentId).toMatch(/^SRD_CC_v5\.2\.1-[a-f0-9]{8}$/);
      expect(response.body.totalChunks).toBeGreaterThan(0);
      expect(response.body.status).toBe('completed');
    });

    it('should use default chunking configuration', async () => {
      const response = await request(app.getHttpServer())
        .post('/document-ingestion/chunk')
        .send({
          filename: 'SRD_CC_v5.2.1.pdf',
        });

      expect(response.status).toBe(201);
      expect(response.body.taskId).toBeDefined();
      expect(response.body.totalChunks).toBeGreaterThan(0);
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/document-ingestion/chunk')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBeDefined();
      
      const messageStr = Array.isArray(response.body.message) 
        ? response.body.message.join(' ') 
        : response.body.message;
      
      expect(messageStr).toContain('filename');
    });

    it('should reject empty filename', async () => {
      const response = await request(app.getHttpServer())
        .post('/document-ingestion/chunk')
        .send({
          filename: '',
        });

      expect(response.status).toBe(400);
    });
  });
});
