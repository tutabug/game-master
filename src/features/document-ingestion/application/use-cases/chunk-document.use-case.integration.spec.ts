import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { MongoDBContainer, StartedMongoDBContainer } from '@testcontainers/mongodb';
import * as mongoose from 'mongoose';
import * as path from 'path';
import { ChunkDocumentUseCase } from './chunk-document.use-case';
import { DocumentLoaderService } from '../services/document-loader.service';
import { SimpleTextChunkerService } from '../services/simple-text-chunker.service';
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
import { ChunkingTaskStatus } from '../../domain/entities/ingestion-task.entity';

describe('ChunkDocumentUseCase Integration', () => {
  let useCase: ChunkDocumentUseCase;
  let mongoContainer: StartedMongoDBContainer;
  let mongoUri: string;
  let taskRepository: ChunkingTaskRepository;
  let chunkRepository: StoredChunkRepository;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    console.log('Starting MongoDB container...');
    mongoContainer = await new MongoDBContainer('mongo:7').start();

    mongoUri = `${mongoContainer.getConnectionString()}?directConnection=true`;

    console.log(`MongoDB running at ${mongoUri}`);

    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        MongooseModule.forFeature([
          { name: ChunkingTaskDocument.name, schema: ChunkingTaskSchema },
          { name: StoredChunkDocument.name, schema: StoredChunkSchema },
        ]),
      ],
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

    await moduleRef.init();

    useCase = moduleRef.get<ChunkDocumentUseCase>(ChunkDocumentUseCase);
    taskRepository = moduleRef.get<ChunkingTaskRepository>(ChunkingTaskRepository);
    chunkRepository = moduleRef.get<StoredChunkRepository>(StoredChunkRepository);
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
    await moduleRef.close();
    await mongoose.disconnect();
    if (mongoContainer) {
      await mongoContainer.stop();
    }
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
    expect(taskRepository).toBeDefined();
    expect(chunkRepository).toBeDefined();
  });

  it('should chunk PDF and store task and chunks in MongoDB', async () => {
    const pdfPath = path.join(__dirname, '../../../../../documents/SRD_CC_v5.2.1.pdf');

    const result = await useCase.execute(pdfPath, {
      maxChunks: 10,
      chunkSize: 1000,
      chunkOverlap: 200,
      chunkStrategy: 'recursive-1000-200',
    });

    expect(result).toBeDefined();
    expect(result.taskId).toBeDefined();
    expect(result.documentId).toMatch(/^SRD_CC_v5\.2\.1-[a-f0-9]{8}$/);
    expect(result.totalChunks).toBe(10);
    expect(result.status).toBe(ChunkingTaskStatus.COMPLETED);

    const task = await taskRepository.findById(result.taskId);
    expect(task).toBeDefined();
    expect(task!.documentId).toBe(result.documentId);
    expect(task!.filePath).toBe(pdfPath);
    expect(task!.status).toBe(ChunkingTaskStatus.COMPLETED);
    expect(task!.totalChunks).toBe(10);
    expect(task!.chunkingConfig).toEqual({
      strategy: 'recursive-1000-200',
      size: 1000,
      overlap: 200,
    });
    expect(task!.completedAt).toBeDefined();

    const chunks = await chunkRepository.findByTaskId(result.taskId);
    expect(chunks).toHaveLength(10);
    expect(chunks[0].taskId).toBe(result.taskId);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].content).toBeDefined();
    expect(chunks[0].content.length).toBeGreaterThan(0);
    expect(chunks[0].pageNumber).toBeDefined();

    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i].chunkIndex).toBe(i);
    }
  });

  it('should generate unique documentId from filename when not provided', async () => {
    const pdfPath = path.join(__dirname, '../../../../../documents/SRD_CC_v5.2.1.pdf');

    const result1 = await useCase.execute(pdfPath, { maxChunks: 5 });
    const result2 = await useCase.execute(pdfPath, { maxChunks: 5 });

    expect(result1.documentId).toMatch(/^SRD_CC_v5\.2\.1-[a-f0-9]{8}$/);
    expect(result2.documentId).toMatch(/^SRD_CC_v5\.2\.1-[a-f0-9]{8}$/);
    expect(result1.documentId).not.toBe(result2.documentId);
  });

  it('should use provided documentId when specified', async () => {
    const pdfPath = path.join(__dirname, '../../../../../documents/SRD_CC_v5.2.1.pdf');
    const customDocId = 'my-custom-doc-id';

    const result = await useCase.execute(pdfPath, {
      documentId: customDocId,
      maxChunks: 1,
    });

    expect(result.documentId).toBe(customDocId);

    const task = await taskRepository.findById(result.taskId);
    expect(task!.documentId).toBe(customDocId);
  });

  it('should use default chunking strategy when not specified', async () => {
    const pdfPath = path.join(__dirname, '../../../../../documents/SRD_CC_v5.2.1.pdf');

    const result = await useCase.execute(pdfPath, { maxChunks: 1 });

    const task = await taskRepository.findById(result.taskId);
    expect(task!.chunkingConfig.strategy).toBe('recursive-1000-200');
    expect(task!.chunkingConfig.size).toBe(1000);
    expect(task!.chunkingConfig.overlap).toBe(200);
  });

  it('should mark task as failed and rethrow error when chunking fails', async () => {
    const invalidPath = '/non/existent/path/file.pdf';

    try {
      await useCase.execute(invalidPath, { maxChunks: 1 });
      fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeDefined();
    }

    const connection = moduleRef.get<mongoose.Connection>(getConnectionToken());
    const taskModel = connection.model<ChunkingTaskDocument>(ChunkingTaskDocument.name);
    const tasks = await taskModel.find({ status: ChunkingTaskStatus.FAILED }).exec();

    expect(tasks.length).toBeGreaterThanOrEqual(1);
    const failedTask = tasks[tasks.length - 1];
    expect(failedTask.status).toBe(ChunkingTaskStatus.FAILED);
    expect(failedTask.errorMessage).toBeDefined();
  }, 30000);

  it.skip('should store all chunks when maxChunks is not specified', async () => {
    const pdfPath = path.join(__dirname, '../../../../../documents/SRD_CC_v5.2.1.pdf');

    const result = await useCase.execute(pdfPath, {});

    expect(result.totalChunks).toBeGreaterThan(100);

    const chunks = await chunkRepository.findByTaskId(result.taskId);
    expect(chunks.length).toBe(result.totalChunks);
  });
});
