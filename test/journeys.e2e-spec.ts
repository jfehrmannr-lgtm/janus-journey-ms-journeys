import { ValidationPipe, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { setupSwagger } from '../src/config/swagger.config.js';

interface ResourceBody {
  uid: string;
  name?: string;
  metadata?: Record<string, unknown>;
  progress?: unknown;
}

describe('Journeys API (e2e)', () => {
  let app: INestApplication;
  let mongo: MongoMemoryReplSet;

  beforeAll(async () => {
    mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
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

  it.each([1, 50, 200, 201, 2000, 40000])(
    'accepts collection size=%i for all resources',
    async (size) => {
      for (const resource of ['journeys', 'folders', 'tasks']) {
        await request(app.getHttpServer())
          .get(`/${resource}?page=1&size=${size}`)
          .expect(200);
      }
    },
  );

  it.each(['0', '-20', '1.5', 'abc', 'Infinity'])(
    'rejects invalid collection size=%s for all resources',
    async (size) => {
      for (const resource of ['journeys', 'folders', 'tasks']) {
        await request(app.getHttpServer())
          .get(`/${resource}?page=1&size=${size}`)
          .expect(400);
      }
    },
  );

  it('creates and reads a Journey, Folder, and Task hierarchy', async () => {
    const journeyResponse = await request(app.getHttpServer())
      .post('/journeys')
      .send({
        description: null,
        metadata: { source: 'e2e' },
        name: 'Learn web development',
        parent: { type: 'user', uid: 'user-e2e-1' },
      })
      .expect(201);

    expect(journeyResponse.body).toMatchObject({
      description: null,
      metadata: { source: 'e2e' },
      name: 'Learn web development',
      parent: { type: 'user', uid: 'user-e2e-1' },
      type: 'journey',
    });

    const journeyUid = (journeyResponse.body as unknown as ResourceBody).uid;
    const folderResponse = await request(app.getHttpServer())
      .post('/folders')
      .send({
        name: 'HTML and CSS',
        parent: { type: 'journey', uid: journeyUid },
      })
      .expect(201);
    const folderUid = (folderResponse.body as unknown as ResourceBody).uid;

    const taskResponse = await request(app.getHttpServer())
      .post('/tasks')
      .send({
        isVisible: true,
        name: 'Understand HTTP',
        parent: { type: 'folder', uid: folderUid },
        state: 'pending',
      })
      .expect(201);
    const taskUid = (taskResponse.body as unknown as ResourceBody).uid;

    expect(taskResponse.body).toMatchObject({
      isVisible: true,
      parent: { type: 'folder', uid: folderUid },
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
      .send({
        name: 'Initial Journey',
        parent: { type: 'user', uid: 'user-e2e-2' },
      })
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

  it('validates structured parent types and internal parent existence', async () => {
    await request(app.getHttpServer())
      .post('/journeys')
      .send({
        name: 'Invalid Journey parent',
        parent: { type: 'journey', uid: 'journey-parent' },
      })
      .expect(400);
    await request(app.getHttpServer())
      .post('/folders')
      .send({
        name: 'Invalid Folder parent',
        parent: { type: 'folder', uid: 'folder-parent' },
      })
      .expect(400);
    await request(app.getHttpServer())
      .post('/tasks')
      .send({
        isVisible: true,
        name: 'Invalid Task parent',
        parent: { type: 'task', uid: 'task-parent' },
        state: 'pending',
      })
      .expect(400);
    await request(app.getHttpServer())
      .post('/folders')
      .send({
        name: 'Missing Journey parent',
        parent: { type: 'journey', uid: 'missing-journey-parent' },
      })
      .expect(404);
    await request(app.getHttpServer())
      .post('/tasks')
      .send({
        isVisible: true,
        name: 'Missing Folder parent',
        parent: { type: 'folder', uid: 'missing-folder-parent' },
        state: 'pending',
      })
      .expect(404);
    await request(app.getHttpServer())
      .post('/journeys')
      .send({ name: 'Obsolete parent field', parentUid: 'user-legacy' })
      .expect(400);

    const journey = await request(app.getHttpServer())
      .post('/journeys')
      .send({
        name: 'Parent update target',
        parent: { type: 'user', uid: 'user-parent-update' },
      })
      .expect(201);
    const journeyUid = (journey.body as unknown as ResourceBody).uid;
    const folder = await request(app.getHttpServer())
      .post('/folders')
      .send({
        name: 'Parent update folder',
        parent: { type: 'journey', uid: journeyUid },
      })
      .expect(201);
    const folderUid = (folder.body as unknown as ResourceBody).uid;
    const task = await request(app.getHttpServer())
      .post('/tasks')
      .send({
        isVisible: true,
        name: 'Parent update task',
        parent: { type: 'folder', uid: folderUid },
        state: 'pending',
      })
      .expect(201);
    const taskUid = (task.body as unknown as ResourceBody).uid;

    await request(app.getHttpServer())
      .patch(`/folders/${folderUid}`)
      .send({ parent: { type: 'folder', uid: folderUid } })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/folders/${folderUid}`)
      .send({ parent: { type: 'journey', uid: 'missing-update-journey' } })
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/tasks/${taskUid}`)
      .send({ parent: { type: 'task', uid: taskUid } })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/tasks/${taskUid}`)
      .send({ parent: { type: 'folder', uid: 'missing-update-folder' } })
      .expect(404);
  });

  it('does not apply ownership filtering while authentication is unimplemented', async () => {
    const response = await request(app.getHttpServer())
      .post('/journeys')
      .send({
        name: 'Unprotected Journey',
        parent: { type: 'user', uid: 'user-e2e-owner' },
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/journeys/${(response.body as unknown as ResourceBody).uid}`)
      .expect(200);
  });

  it('cascades Journey deletion and preserves unrelated resources', async () => {
    const journey = await request(app.getHttpServer())
      .post('/journeys')
      .send({
        name: 'Delete test',
        parent: { type: 'user', uid: 'user-e2e-delete' },
      })
      .expect(201);
    const journeyBody = journey.body as unknown as ResourceBody;
    const folder = await request(app.getHttpServer())
      .post('/folders')
      .send({
        name: 'Child folder',
        parent: { type: 'journey', uid: journeyBody.uid },
      })
      .expect(201);
    const folderBody = folder.body as unknown as ResourceBody;
    const nestedTask = await request(app.getHttpServer())
      .post('/tasks')
      .send({
        isVisible: true,
        name: 'Nested task',
        parent: { type: 'folder', uid: folderBody.uid },
        state: 'pending',
      })
      .expect(201);
    const directTask = await request(app.getHttpServer())
      .post('/tasks')
      .send({
        isVisible: true,
        name: 'Direct task',
        parent: { type: 'journey', uid: journeyBody.uid },
        state: 'pending',
      })
      .expect(201);
    const unrelatedJourney = await request(app.getHttpServer())
      .post('/journeys')
      .send({
        name: 'Unrelated journey',
        parent: { type: 'user', uid: 'user-e2e-other' },
      })
      .expect(201);
    const unrelatedFolder = await request(app.getHttpServer())
      .post('/folders')
      .send({
        name: 'Unrelated folder',
        parent: { type: 'user', uid: 'user-e2e-other' },
      })
      .expect(201);
    const unrelatedTask = await request(app.getHttpServer())
      .post('/tasks')
      .send({
        isVisible: true,
        name: 'Unrelated task',
        parent: {
          type: 'folder',
          uid: (unrelatedFolder.body as unknown as ResourceBody).uid,
        },
        state: 'pending',
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/journeys/${journeyBody.uid}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/journeys/${journeyBody.uid}`)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/folders/${folderBody.uid}`)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/tasks/${(nestedTask.body as unknown as ResourceBody).uid}`)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/tasks/${(directTask.body as unknown as ResourceBody).uid}`)
      .expect(404);
    await request(app.getHttpServer())
      .get(
        `/journeys/${(unrelatedJourney.body as unknown as ResourceBody).uid}`,
      )
      .expect(200);
    await request(app.getHttpServer())
      .get(`/folders/${(unrelatedFolder.body as unknown as ResourceBody).uid}`)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/tasks/${(unrelatedTask.body as unknown as ResourceBody).uid}`)
      .expect(200);
    await request(app.getHttpServer())
      .delete('/journeys/missing-journey')
      .expect(404);
  });

  it('cascades Folder deletion and preserves unrelated Tasks', async () => {
    const folder = await request(app.getHttpServer())
      .post('/folders')
      .send({
        name: 'Folder to delete',
        parent: { type: 'user', uid: 'user-e2e-folder-delete' },
      })
      .expect(201);
    const folderUid = (folder.body as unknown as ResourceBody).uid;
    const childTask = await request(app.getHttpServer())
      .post('/tasks')
      .send({
        isVisible: true,
        name: 'Task to delete',
        parent: { type: 'folder', uid: folderUid },
        state: 'pending',
      })
      .expect(201);
    const unrelatedTask = await request(app.getHttpServer())
      .post('/tasks')
      .send({
        isVisible: true,
        name: 'Task to keep',
        parent: { type: 'user', uid: 'user-e2e-folder-delete' },
        state: 'pending',
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/folders/${folderUid}`)
      .expect(204);
    await request(app.getHttpServer()).get(`/folders/${folderUid}`).expect(404);
    await request(app.getHttpServer())
      .get(`/tasks/${(childTask.body as unknown as ResourceBody).uid}`)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/tasks/${(unrelatedTask.body as unknown as ResourceBody).uid}`)
      .expect(200);
    await request(app.getHttpServer())
      .delete('/folders/missing-folder')
      .expect(404);
  });

  it('exposes Swagger documentation without authentication requirements', async () => {
    await request(app.getHttpServer())
      .get('/docs-json')
      .expect(200)
      .expect((response) => {
        const document = response.body as {
          components: {
            schemas: Record<string, { properties?: Record<string, unknown> }>;
          };
          paths: Record<
            string,
            {
              get?: {
                parameters?: Array<{
                  name: string;
                  in?: string;
                  schema?: {
                    type?: string;
                    minimum?: number;
                    maximum?: number;
                  };
                }>;
              };
              put?: unknown;
              delete?: { description?: string; summary?: string };
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
          const sizeParameter = parameters.find(
            (parameter) => parameter.name === 'size',
          );
          expect(sizeParameter?.schema).toMatchObject({
            minimum: 1,
            type: 'integer',
          });
          expect(sizeParameter?.schema?.maximum).toBeUndefined();
        }

        for (const path of [
          '/journeys/{uid}',
          '/folders/{uid}',
          '/tasks/{uid}',
        ]) {
          expect(document.paths[path]?.put).toBeUndefined();
        }

        expect(document.paths['/journeys/{uid}']?.delete).toMatchObject({
          summary: 'Delete a Journey and its descendants',
        });
        expect(document.paths['/folders/{uid}']?.delete).toMatchObject({
          summary: 'Delete a Folder and its Tasks',
        });
        expect(document.paths['/tasks/{uid}']?.delete).toMatchObject({
          summary: 'Delete a Task',
        });

        for (const schemaName of [
          'CreateJourneyDto',
          'UpdateJourneyDto',
          'JourneyResponseDto',
          'CreateFolderDto',
          'UpdateFolderDto',
          'FolderResponseDto',
          'CreateTaskDto',
          'UpdateTaskDto',
          'TaskResponseDto',
        ]) {
          const properties = document.components.schemas[schemaName].properties;
          expect(properties?.parent).toBeDefined();
          expect(properties?.parentUid).toBeUndefined();
        }
      });
  });
});
