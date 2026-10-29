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

  const authenticatedRequest = () => ({
    delete: (path: string) =>
      request(app.getHttpServer())
        .delete(path)
        .set('X-API-Key', 'test-ms-journeys-api-key')
        .set('X-User-Id', 'user-e2e'),
    get: (path: string) =>
      request(app.getHttpServer())
        .get(path)
        .set('X-API-Key', 'test-ms-journeys-api-key')
        .set('X-User-Id', 'user-e2e'),
    patch: (path: string) =>
      request(app.getHttpServer())
        .patch(path)
        .set('X-API-Key', 'test-ms-journeys-api-key')
        .set('X-User-Id', 'user-e2e'),
    post: (path: string) =>
      request(app.getHttpServer())
        .post(path)
        .set('X-API-Key', 'test-ms-journeys-api-key')
        .set('X-User-Id', 'user-e2e'),
    put: (path: string) =>
      request(app.getHttpServer())
        .put(path)
        .set('X-API-Key', 'test-ms-journeys-api-key')
        .set('X-User-Id', 'user-e2e'),
  });

  beforeAll(async () => {
    mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    process.env.MONGODB_URI = mongo.getUri();
    process.env.MONGODB_DATABASE_NAME = 'janus_journey_test';
    process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS = '5000';
    process.env.PORT = '4002';
    process.env.MS_JOURNEYS_API_KEY = 'test-ms-journeys-api-key';

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

  it('rejects business requests without internal authentication headers', async () => {
    await request(app.getHttpServer())
      .get('/journeys?page=1&size=20')
      .expect(401);
  });

  it('allows business requests with valid internal authentication headers', async () => {
    await authenticatedRequest().get('/journeys?page=1&size=20').expect(200);
  });

  it('rejects invalid API keys and user identities with HTTP 401', async () => {
    await request(app.getHttpServer())
      .get('/journeys?page=1&size=20')
      .set('X-API-Key', 'invalid-key')
      .set('X-User-Id', 'user-e2e')
      .expect(401);
    await request(app.getHttpServer())
      .get('/journeys?page=1&size=20')
      .set('X-API-Key', 'test-ms-journeys-api-key')
      .set('X-User-Id', '   ')
      .expect(401);
  });

  it('rejects client-supplied ownerUid on POST resources', async () => {
    await authenticatedRequest()
      .post('/journeys')
      .send({
        name: 'Client-owned Journey',
        ownerUid: 'user-attacker',
        parent: { type: 'user', uid: 'user-e2e' },
      })
      .expect(400);
  });

  it('rejects client-supplied ownerUid on PATCH resources', async () => {
    await authenticatedRequest()
      .patch('/journeys/journey-missing')
      .send({ ownerUid: 'user-attacker' })
      .expect(400);
  });

  it.each([1, 50, 200, 201, 2000, 40000])(
    'accepts collection size=%i for all resources',
    async (size) => {
      for (const resource of ['journeys', 'folders', 'tasks']) {
        await authenticatedRequest()
          .get(`/${resource}?page=1&size=${size}`)
          .expect(200);
      }
    },
  );

  it.each(['0', '-20', '1.5', 'abc', 'Infinity'])(
    'rejects invalid collection size=%s for all resources',
    async (size) => {
      for (const resource of ['journeys', 'folders', 'tasks']) {
        await authenticatedRequest()
          .get(`/${resource}?page=1&size=${size}`)
          .expect(400);
      }
    },
  );

  it('creates and reads a Journey, Folder, and Task hierarchy', async () => {
    const journeyResponse = await authenticatedRequest()
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
    const folderResponse = await authenticatedRequest()
      .post('/folders')
      .send({
        name: 'HTML and CSS',
        parent: { type: 'journey', uid: journeyUid },
      })
      .expect(201);
    const folderUid = (folderResponse.body as unknown as ResourceBody).uid;

    const taskResponse = await authenticatedRequest()
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

    await authenticatedRequest()
      .get('/journeys?page=1&size=20')
      .expect(200)
      .expect((response) =>
        expect(
          Array.isArray((response.body as { items: unknown[] }).items),
        ).toBe(true),
      );
    await authenticatedRequest()
      .get('/folders?page=1&size=20')
      .expect(200)
      .expect((response) =>
        expect(
          Array.isArray((response.body as { items: unknown[] }).items),
        ).toBe(true),
      );
    await authenticatedRequest()
      .get('/tasks?page=1&size=20')
      .expect(200)
      .expect((response) =>
        expect(
          Array.isArray((response.body as { items: unknown[] }).items),
        ).toBe(true),
      );
    await authenticatedRequest().get(`/journeys/${journeyUid}`).expect(200);
    await authenticatedRequest()
      .put(`/folders/${folderUid}`)
      .send({ name: 'Should not be accepted' })
      .expect(404);
    await authenticatedRequest()
      .put(`/tasks/${taskUid}`)
      .send({ name: 'Should not be accepted' })
      .expect(404);
  });

  it('returns only direct User root resources in independent orderings', async () => {
    const userId = 'user-root-e2e-1';
    const otherUserId = 'user-root-e2e-other';

    const journeyA = await authenticatedRequest()
      .post('/journeys')
      .send({
        name: 'Journey A',
        parent: { type: 'user', uid: userId },
      })
      .expect(201);
    await authenticatedRequest()
      .post('/journeys')
      .send({
        name: 'Journey B',
        parent: { type: 'user', uid: userId },
      })
      .expect(201);
    const nestedFolder = await authenticatedRequest()
      .post('/folders')
      .send({
        name: 'Nested Folder',
        parent: {
          type: 'journey',
          uid: (journeyA.body as unknown as ResourceBody).uid,
        },
      })
      .expect(201);
    await authenticatedRequest()
      .post('/folders')
      .send({
        name: 'Root Folder Late',
        orderIndex: 20,
        parent: { type: 'user', uid: userId },
      })
      .expect(201);
    await authenticatedRequest()
      .post('/folders')
      .send({
        name: 'Root Folder Early',
        orderIndex: 10,
        parent: { type: 'user', uid: userId },
      })
      .expect(201);
    const nestedTask = await authenticatedRequest()
      .post('/tasks')
      .send({
        isVisible: true,
        name: 'Nested Task',
        parent: {
          type: 'folder',
          uid: (nestedFolder.body as unknown as ResourceBody).uid,
        },
        state: 'pending',
      })
      .expect(201);
    await authenticatedRequest()
      .post('/tasks')
      .send({
        isVisible: true,
        name: 'Root Task Late',
        orderIndex: 20,
        parent: { type: 'user', uid: userId },
        state: 'pending',
      })
      .expect(201);
    await authenticatedRequest()
      .post('/tasks')
      .send({
        isVisible: true,
        name: 'Root Task Early',
        orderIndex: 10,
        parent: { type: 'user', uid: userId },
        state: 'pending',
      })
      .expect(201);
    await authenticatedRequest()
      .post('/journeys')
      .send({
        name: 'Other User Journey',
        parent: { type: 'user', uid: otherUserId },
      })
      .expect(201);

    await authenticatedRequest()
      .get(`/users/${userId}/root`)
      .expect(200)
      .expect((response) => {
        const body = response.body as {
          items: {
            tasks: Array<{ name: string; uid: string }>;
            folders: Array<{ name: string }>;
            journeys: Array<{ name: string }>;
          };
          registers: number;
        };

        expect(body.registers).toBe(3);
        expect(body.items.journeys.map((item) => item.name)).toEqual([
          'Journey A',
          'Journey B',
        ]);
        expect(body.items.folders.map((item) => item.name)).toEqual([
          'Root Folder Early',
          'Root Folder Late',
        ]);
        expect(body.items.tasks.map((item) => item.name)).toEqual([
          'Root Task Early',
          'Root Task Late',
        ]);
        expect(body.items.tasks.map((item) => item.uid)).not.toContain(
          (nestedTask.body as unknown as ResourceBody).uid,
        );
      });

    await authenticatedRequest()
      .get('/users/user-root-e2e-empty/root')
      .expect(200)
      .expect({
        items: { tasks: [], folders: [], journeys: [] },
        registers: 0,
      });
  });

  it('supports PATCH updates without calculating progress', async () => {
    const journeyResponse = await authenticatedRequest()
      .post('/journeys')
      .send({
        name: 'Initial Journey',
        parent: { type: 'user', uid: 'user-e2e-2' },
      })
      .expect(201);
    const journeyUid = (journeyResponse.body as unknown as ResourceBody).uid;

    await authenticatedRequest()
      .patch(`/journeys/${journeyUid}`)
      .send({ metadata: { reviewed: true }, name: 'Updated Journey' })
      .expect(200)
      .expect((response) => {
        const body = response.body as unknown as ResourceBody;
        expect(body.metadata).toEqual({ reviewed: true });
        expect(body.name).toBe('Updated Journey');
      });

    await authenticatedRequest()
      .put(`/journeys/${journeyUid}`)
      .send({ name: 'Should not be accepted' })
      .expect(404);
  });

  it('validates structured parent types and internal parent existence', async () => {
    await authenticatedRequest()
      .post('/journeys')
      .send({
        name: 'Invalid Journey parent',
        parent: { type: 'journey', uid: 'journey-parent' },
      })
      .expect(400);
    await authenticatedRequest()
      .post('/folders')
      .send({
        name: 'Invalid Folder parent',
        parent: { type: 'task', uid: 'task-parent' },
      })
      .expect(400);
    await authenticatedRequest()
      .post('/tasks')
      .send({
        isVisible: true,
        name: 'Invalid Task parent',
        parent: { type: 'task', uid: 'task-parent' },
        state: 'pending',
      })
      .expect(400);
    await authenticatedRequest()
      .post('/folders')
      .send({
        name: 'Missing Journey parent',
        parent: { type: 'journey', uid: 'missing-journey-parent' },
      })
      .expect(404);
    await authenticatedRequest()
      .post('/tasks')
      .send({
        isVisible: true,
        name: 'Missing Folder parent',
        parent: { type: 'folder', uid: 'missing-folder-parent' },
        state: 'pending',
      })
      .expect(404);
    await authenticatedRequest()
      .post('/journeys')
      .send({ name: 'Obsolete parent field', parentUid: 'user-legacy' })
      .expect(400);

    const journey = await authenticatedRequest()
      .post('/journeys')
      .send({
        name: 'Parent update target',
        parent: { type: 'user', uid: 'user-parent-update' },
      })
      .expect(201);
    const journeyUid = (journey.body as unknown as ResourceBody).uid;
    const folder = await authenticatedRequest()
      .post('/folders')
      .send({
        name: 'Parent update folder',
        parent: { type: 'journey', uid: journeyUid },
      })
      .expect(201);
    const folderUid = (folder.body as unknown as ResourceBody).uid;
    const task = await authenticatedRequest()
      .post('/tasks')
      .send({
        isVisible: true,
        name: 'Parent update task',
        parent: { type: 'folder', uid: folderUid },
        state: 'pending',
      })
      .expect(201);
    const taskUid = (task.body as unknown as ResourceBody).uid;

    await authenticatedRequest()
      .patch(`/folders/${folderUid}`)
      .send({ parent: { type: 'folder', uid: folderUid } })
      .expect(400);
    await authenticatedRequest()
      .patch(`/folders/${folderUid}`)
      .send({ parent: { type: 'journey', uid: 'missing-update-journey' } })
      .expect(404);
    await authenticatedRequest()
      .patch(`/tasks/${taskUid}`)
      .send({ parent: { type: 'task', uid: taskUid } })
      .expect(400);
    await authenticatedRequest()
      .patch(`/tasks/${taskUid}`)
      .send({ parent: { type: 'folder', uid: 'missing-update-folder' } })
      .expect(404);
  });

  it('allows authenticated requests without ownership filtering', async () => {
    const response = await authenticatedRequest()
      .post('/journeys')
      .send({
        name: 'Unprotected Journey',
        parent: { type: 'user', uid: 'user-e2e-owner' },
      })
      .expect(201);

    await authenticatedRequest()
      .get(`/journeys/${(response.body as unknown as ResourceBody).uid}`)
      .expect(200);
  });

  it('cascades Journey deletion and preserves unrelated resources', async () => {
    const journey = await authenticatedRequest()
      .post('/journeys')
      .send({
        name: 'Delete test',
        parent: { type: 'user', uid: 'user-e2e-delete' },
      })
      .expect(201);
    const journeyBody = journey.body as unknown as ResourceBody;
    const folder = await authenticatedRequest()
      .post('/folders')
      .send({
        name: 'Child folder',
        parent: { type: 'journey', uid: journeyBody.uid },
      })
      .expect(201);
    const folderBody = folder.body as unknown as ResourceBody;
    const nestedTask = await authenticatedRequest()
      .post('/tasks')
      .send({
        isVisible: true,
        name: 'Nested task',
        parent: { type: 'folder', uid: folderBody.uid },
        state: 'pending',
      })
      .expect(201);
    const directTask = await authenticatedRequest()
      .post('/tasks')
      .send({
        isVisible: true,
        name: 'Direct task',
        parent: { type: 'journey', uid: journeyBody.uid },
        state: 'pending',
      })
      .expect(201);
    const unrelatedJourney = await authenticatedRequest()
      .post('/journeys')
      .send({
        name: 'Unrelated journey',
        parent: { type: 'user', uid: 'user-e2e-other' },
      })
      .expect(201);
    const unrelatedFolder = await authenticatedRequest()
      .post('/folders')
      .send({
        name: 'Unrelated folder',
        parent: { type: 'user', uid: 'user-e2e-other' },
      })
      .expect(201);
    const unrelatedTask = await authenticatedRequest()
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

    await authenticatedRequest()
      .delete(`/journeys/${journeyBody.uid}`)
      .expect(204);

    await authenticatedRequest()
      .get(`/journeys/${journeyBody.uid}`)
      .expect(404);
    await authenticatedRequest().get(`/folders/${folderBody.uid}`).expect(404);
    await authenticatedRequest()
      .get(`/tasks/${(nestedTask.body as unknown as ResourceBody).uid}`)
      .expect(404);
    await authenticatedRequest()
      .get(`/tasks/${(directTask.body as unknown as ResourceBody).uid}`)
      .expect(404);
    await authenticatedRequest()
      .get(
        `/journeys/${(unrelatedJourney.body as unknown as ResourceBody).uid}`,
      )
      .expect(200);
    await authenticatedRequest()
      .get(`/folders/${(unrelatedFolder.body as unknown as ResourceBody).uid}`)
      .expect(200);
    await authenticatedRequest()
      .get(`/tasks/${(unrelatedTask.body as unknown as ResourceBody).uid}`)
      .expect(200);
    await authenticatedRequest()
      .delete('/journeys/missing-journey')
      .expect(404);
  });

  it('cascades Folder deletion and preserves unrelated Tasks', async () => {
    const folder = await authenticatedRequest()
      .post('/folders')
      .send({
        name: 'Folder to delete',
        parent: { type: 'user', uid: 'user-e2e-folder-delete' },
      })
      .expect(201);
    const folderUid = (folder.body as unknown as ResourceBody).uid;
    const childTask = await authenticatedRequest()
      .post('/tasks')
      .send({
        isVisible: true,
        name: 'Task to delete',
        parent: { type: 'folder', uid: folderUid },
        state: 'pending',
      })
      .expect(201);
    const unrelatedTask = await authenticatedRequest()
      .post('/tasks')
      .send({
        isVisible: true,
        name: 'Task to keep',
        parent: { type: 'user', uid: 'user-e2e-folder-delete' },
        state: 'pending',
      })
      .expect(201);

    await authenticatedRequest().delete(`/folders/${folderUid}`).expect(204);
    await authenticatedRequest().get(`/folders/${folderUid}`).expect(404);
    await authenticatedRequest()
      .get(`/tasks/${(childTask.body as unknown as ResourceBody).uid}`)
      .expect(404);
    await authenticatedRequest()
      .get(`/tasks/${(unrelatedTask.body as unknown as ResourceBody).uid}`)
      .expect(200);
    await authenticatedRequest().delete('/folders/missing-folder').expect(404);
  });

  it('exposes Swagger documentation without authentication requirements', async () => {
    await request(app.getHttpServer())
      .get('/docs-json')
      .expect(200)
      .expect((response) => {
        const document = response.body as {
          components: {
            schemas: Record<string, { properties?: Record<string, unknown> }>;
            securitySchemes: Record<
              string,
              { in?: string; name?: string; type?: string }
            >;
          };
          security: Array<Record<string, string[]>>;
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
                responses?: Record<
                  string,
                  {
                    content?: Record<
                      string,
                      { schema?: Record<string, unknown> }
                    >;
                  }
                >;
              };
              put?: unknown;
              delete?: { description?: string; summary?: string };
            }
          >;
        };

        expect(document.components.securitySchemes).toEqual({
          'X-API-Key': {
            description: 'Internal ms-journeys API key.',
            in: 'header',
            name: 'x-api-key',
            type: 'apiKey',
          },
          'X-User-Id': {
            description: 'Authenticated user identity propagated by the BFF.',
            in: 'header',
            name: 'x-user-id',
            type: 'apiKey',
          },
        });
        expect(document.security).toEqual([
          { 'X-API-Key': [], 'X-User-Id': [] },
        ]);

        for (const path of ['/journeys', '/folders', '/tasks']) {
          const parameters = document.paths[path]?.get?.parameters ?? [];
          expect(parameters).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ in: 'query', name: 'page' }),
              expect.objectContaining({ in: 'query', name: 'size' }),
            ]),
          );
          expect(parameters).toHaveLength(2);
          expect(
            parameters.some(
              (parameter) =>
                parameter.in === 'header' && parameter.name === 'x-user-id',
            ),
          ).toBe(false);
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

        const rootPath = document.paths['/users/{userId}/root'];
        expect(rootPath?.get?.parameters).toEqual([
          expect.objectContaining({
            in: 'path',
            name: 'userId',
            required: true,
          }),
        ]);
        expect(
          rootPath?.get?.responses?.['200']?.content?.['application/json']
            ?.schema,
        ).toEqual({
          $ref: '#/components/schemas/UserRootResponseDto',
        });
        const rootResponseProperties =
          document.components.schemas.UserRootResponseDto.properties;
        const registers = rootResponseProperties?.registers as
          { description?: string; enum?: number[]; type?: string } | undefined;
        expect(rootResponseProperties?.items).toEqual({
          $ref: '#/components/schemas/UserRootItemsDto',
        });
        expect(registers).toMatchObject({
          enum: [0, 1, 2, 3],
          type: 'integer',
        });
        expect(registers?.description).toContain('non-empty');
        expect(document.components.schemas.UserRootItemsDto.properties).toEqual(
          {
            tasks: {
              items: { $ref: '#/components/schemas/TaskResponseDto' },
              type: 'array',
            },
            folders: {
              items: { $ref: '#/components/schemas/FolderResponseDto' },
              type: 'array',
            },
            journeys: {
              items: { $ref: '#/components/schemas/JourneyResponseDto' },
              type: 'array',
            },
          },
        );
      });
  });
});
