import { ValidationPipe, INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { type Model } from 'mongoose';
import request from 'supertest';
import { setupSwagger } from '../src/config/swagger.config.js';
import type { FolderDocument } from '../src/modules/folders/schemas/folder.schema.js';

interface ResourceBody {
  uid: string;
  name?: string;
  metadata?: Record<string, unknown>;
  progress?: unknown;
}

describe('Journeys API (e2e)', () => {
  let app: INestApplication;
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongo.getUri();
    process.env.MONGODB_DATABASE_NAME = 'janus_journey_test';
    process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS = '5000';
    process.env.PORT = '4002';

    const { AppModule } = await import('../src/app.module.js');
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    setupSwagger(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await mongoose.disconnect();
    await mongo.stop();
  });

  it('allows requests without an authentication header', async () => {
    await request(app.getHttpServer())
      .get('/journeys?page=1&size=20')
      .expect(200);
  });

  it('creates and reads a Journey, Folder, and Task hierarchy', async () => {
    const journeyResponse = await request(app.getHttpServer())
      .post('/journeys')
      .send({
        description: null,
        metadata: { source: 'e2e' },
        name: 'Learn web development',
        parentUid: 'user-e2e-1',
      })
      .expect(201);

    expect(journeyResponse.body).toMatchObject({
      description: null,
      metadata: { source: 'e2e' },
      name: 'Learn web development',
      parentUid: 'user-e2e-1',
      type: 'journey',
    });

    const journeyUid = (journeyResponse.body as unknown as ResourceBody).uid;
    const folderResponse = await request(app.getHttpServer())
      .post('/folders')
      .send({ name: 'HTML and CSS', parentUid: journeyUid })
      .expect(201);
    const folderUid = (folderResponse.body as unknown as ResourceBody).uid;

    const taskResponse = await request(app.getHttpServer())
      .post('/tasks')
      .send({
        isVisible: true,
        name: 'Understand HTTP',
        parentUid: folderUid,
        state: 'pending',
      })
      .expect(201);
    const taskUid = (taskResponse.body as unknown as ResourceBody).uid;

    expect(taskResponse.body).toMatchObject({
      isVisible: true,
      parentUid: folderUid,
      state: 'pending',
      taskType: null,
      type: 'task',
    });

    await request(app.getHttpServer())
      .get('/journeys?page=1&size=20')
      .expect(200)
      .expect((response) =>
        expect(
          Array.isArray((response.body as { items: unknown[] }).items),
        ).toBe(true),
      );
    await request(app.getHttpServer())
      .get('/folders?page=1&size=20')
      .expect(200)
      .expect((response) =>
        expect(
          Array.isArray((response.body as { items: unknown[] }).items),
        ).toBe(true),
      );
    await request(app.getHttpServer())
      .get('/tasks?page=1&size=20')
      .expect(200)
      .expect((response) =>
        expect(
          Array.isArray((response.body as { items: unknown[] }).items),
        ).toBe(true),
      );
    await request(app.getHttpServer())
      .get(`/journeys/${journeyUid}`)
      .expect(200);
    await request(app.getHttpServer())
      .put(`/folders/${folderUid}`)
      .send({ name: 'Should not be accepted' })
      .expect(404);
    await request(app.getHttpServer())
      .put(`/tasks/${taskUid}`)
      .send({ name: 'Should not be accepted' })
      .expect(404);
  });

  it('supports PATCH updates without calculating progress', async () => {
    const journeyResponse = await request(app.getHttpServer())
      .post('/journeys')
      .send({ name: 'Initial Journey', parentUid: 'user-e2e-2' })
      .expect(201);
    const journeyUid = (journeyResponse.body as unknown as ResourceBody).uid;

    await request(app.getHttpServer())
      .patch(`/journeys/${journeyUid}`)
      .send({ metadata: { reviewed: true }, name: 'Updated Journey' })
      .expect(200)
      .expect((response) => {
        const body = response.body as unknown as ResourceBody;
        expect(body.metadata).toEqual({ reviewed: true });
        expect(body.name).toBe('Updated Journey');
      });

    await request(app.getHttpServer())
      .put(`/journeys/${journeyUid}`)
      .send({ name: 'Should not be accepted' })
      .expect(404);
  });

  it('does not apply ownership filtering while authentication is unimplemented', async () => {
    const response = await request(app.getHttpServer())
      .post('/journeys')
      .send({ name: 'Unprotected Journey', parentUid: 'user-e2e-owner' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/journeys/${(response.body as unknown as ResourceBody).uid}`)
      .expect(200);
  });

  it('deletes only the requested document and does not cascade', async () => {
    const journey = await request(app.getHttpServer())
      .post('/journeys')
      .send({ name: 'Delete test', parentUid: 'user-e2e-delete' })
      .expect(201);
    const journeyBody = journey.body as unknown as ResourceBody;
    const folder = await request(app.getHttpServer())
      .post('/folders')
      .send({ name: 'Child folder', parentUid: journeyBody.uid })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/journeys/${journeyBody.uid}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/folders/${(folder.body as unknown as ResourceBody).uid}`)
      .expect(200);

    const folderModel = app.get<Model<FolderDocument>>(
      getModelToken('FolderSchema'),
    );
    expect(
      await folderModel.exists({
        uid: (folder.body as unknown as ResourceBody).uid,
      }),
    ).toBeTruthy();
  });

  it('exposes Swagger documentation without authentication requirements', async () => {
    await request(app.getHttpServer())
      .get('/docs-json')
      .expect(200)
      .expect((response) => {
        const document = response.body as {
          paths: Record<
            string,
            {
              get?: {
                parameters?: Array<{ name: string; in?: string }>;
              };
              put?: unknown;
            }
          >;
        };

        for (const path of ['/journeys', '/folders', '/tasks']) {
          const parameters = document.paths[path]?.get?.parameters ?? [];
          expect(parameters).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ in: 'query', name: 'page' }),
              expect.objectContaining({ in: 'query', name: 'size' }),
            ]),
          );
          expect(parameters).toHaveLength(2);
        }

        for (const path of [
          '/journeys/{uid}',
          '/folders/{uid}',
          '/tasks/{uid}',
        ]) {
          expect(document.paths[path]?.put).toBeUndefined();
        }
      });
  });
});
