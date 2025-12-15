import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { StartedTestContainer, GenericContainer } from 'testcontainers';
import { TaskController } from './task.controller';
import { CreateTaskUseCase } from '../../application/use-cases/create-task.use-case';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { MongooseTaskRepository } from '../../infrastructure/repositories/mongoose-task.repository';
import { TaskDocument, TaskSchema } from '../../infrastructure/schemas/task.schema';
import { configureApp } from '@/app.config';

describe('TaskController (integration)', () => {
  let app: INestApplication;
  let mongoContainer: StartedTestContainer;
  let mongoUri: string;
  let connection: Connection;

  beforeAll(async () => {
    mongoContainer = await new GenericContainer('mongo:7').withExposedPorts(27017).start();

    const host = mongoContainer.getHost();
    const port = mongoContainer.getMappedPort(27017);
    mongoUri = `mongodb://${host}:${port}/testdb`;
  });

  afterAll(async () => {
    await mongoContainer.stop();
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        MongooseModule.forFeature([{ name: TaskDocument.name, schema: TaskSchema }]),
      ],
      controllers: [TaskController],
      providers: [
        CreateTaskUseCase,
        {
          provide: TaskRepository,
          useClass: MongooseTaskRepository,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    configureApp(app, false);

    await app.init();

    connection = app.get<Connection>(getConnectionToken());
  });

  afterEach(async () => {
    if (connection.readyState === 1) {
      const collections = await connection.db.collections();
      for (const collection of collections) {
        await collection.deleteMany({});
      }
    }

    await app.close();
  });

  describe('POST /tasks', () => {
    it('should create a new task', async () => {
      const createTaskDto = {
        title: 'Integration Test Task',
        dueDate: '2025-12-31T23:59:59.000Z',
      };

      const response = await request(app.getHttpServer())
        .post('/tasks')
        .send(createTaskDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(createTaskDto.title);
      expect(response.body.dueDate).toBe(createTaskDto.dueDate);
      expect(response.body).toHaveProperty('createdAt');
    });

    it('should return 400 when title is missing', async () => {
      const invalidDto = {
        dueDate: '2025-12-31T23:59:59.000Z',
      };

      await request(app.getHttpServer()).post('/tasks').send(invalidDto).expect(400);
    });

    it('should return 400 when dueDate is missing', async () => {
      const invalidDto = {
        title: 'Test Task',
      };

      await request(app.getHttpServer()).post('/tasks').send(invalidDto).expect(400);
    });

    it('should return 400 when dueDate is not a valid date string', async () => {
      const invalidDto = {
        title: 'Test Task',
        dueDate: 'invalid-date',
      };

      await request(app.getHttpServer()).post('/tasks').send(invalidDto).expect(400);
    });

    it('should reject extra properties when forbidNonWhitelisted is enabled', async () => {
      const dtoWithExtraProps = {
        title: 'Test Task',
        dueDate: '2025-12-31T23:59:59.000Z',
        extraProp: 'should be rejected',
      };

      await request(app.getHttpServer()).post('/tasks').send(dtoWithExtraProps).expect(400);
    });
  });
});
