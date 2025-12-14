import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../../app.module';

describe('DocumentIngestionController (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /documents/ingest', () => {
    it('should ingest a document successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/documents/ingest')
        .send({
          filePath: 'documents/SRD_CC_v5.2.1.pdf',
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('chunksProcessed');
      expect(response.body.chunksProcessed).toBeGreaterThan(0);
    });

    it('should return 400 for missing filePath', async () => {
      await request(app.getHttpServer()).post('/documents/ingest').send({}).expect(400);
    });

    it('should return 404 for non-existent file', async () => {
      await request(app.getHttpServer())
        .post('/documents/ingest')
        .send({
          filePath: 'documents/non-existent.pdf',
        })
        .expect(404);
    });
  });

  describe('GET /documents/chunks', () => {
    it('should retrieve all document chunks', async () => {
      const response = await request(app.getHttpServer()).get('/documents/chunks').expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter chunks by source', async () => {
      const source = 'documents/SRD_CC_v5.2.1.pdf';
      const response = await request(app.getHttpServer())
        .get(`/documents/chunks?source=${encodeURIComponent(source)}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('metadata');
        expect(response.body[0].metadata.source).toBe(source);
      }
    });
  });

  describe('DELETE /documents/chunks', () => {
    it('should clear all chunks', async () => {
      await request(app.getHttpServer()).delete('/documents/chunks').expect(200);
    });

    it('should delete chunks by source', async () => {
      const source = 'documents/test.pdf';
      await request(app.getHttpServer())
        .delete(`/documents/chunks?source=${encodeURIComponent(source)}`)
        .expect(200);
    });
  });
});
