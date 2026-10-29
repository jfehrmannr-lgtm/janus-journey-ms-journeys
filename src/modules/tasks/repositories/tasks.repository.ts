import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { type Connection, type Model } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { BulkCreateTaskItemDto } from '../dto/bulk-create-task.dto.js';
import { CreateTaskDto } from '../dto/create-task.dto.js';
import { UpdateTaskDto } from '../dto/update-task.dto.js';
import { TaskDocument, TaskSchema } from '../schemas/task.schema.js';
import {
  JourneyDocument,
  JourneySchema,
} from '../../journeys/schemas/journey.schema.js';
import {
  FolderDocument,
  FolderSchema,
} from '../../folders/schemas/folder.schema.js';
import type { ParentReference } from '@common/parent-reference.js';
import type { Task } from '@journeys/types/journey.types.js';
import type { CollectionResult } from '@common/collection-result.js';
import type { PaginationQueryDto } from '@common/pagination-query.dto.js';
import { ActivityPropagationService } from '@common/activity-propagation.service.js';

@Injectable()
export class TasksRepository {
  constructor(
    @InjectModel(TaskSchema.name)
    private readonly taskModel: Model<TaskDocument>,
    @InjectModel(JourneySchema.name)
    private readonly journeyModel: Model<JourneyDocument>,
    @InjectModel(FolderSchema.name)
    private readonly folderModel: Model<FolderDocument>,
    @InjectConnection()
    private readonly connection: Connection,
    @Optional()
    private readonly activityPropagation?: ActivityPropagationService,
  ) {}

  async create(input: CreateTaskDto, ownerUid: string): Promise<Task> {
    await this.validateParent(input.parent, ownerUid);
    const activityAt = new Date();
    const ancestors = this.activityPropagation
      ? await this.activityPropagation.resolveAncestors(input.parent, ownerUid)
      : [];

    try {
      const task = await this.taskModel.create({
        description: input.description ?? null,
        isVisible: input.isVisible,
        metadata: input.metadata ?? {},
        name: input.name,
        orderIndex: input.orderIndex,
        ownerUid,
        parent: input.parent,
        lastActivityAt: activityAt,
        state: input.state,
        taskType: null,
        type: 'task',
        uid: `task-${randomUUID()}`,
      });

      if (this.activityPropagation) {
        await this.activityPropagation.propagate(
          ancestors,
          ownerUid,
          activityAt,
        );
      }

      return this.toTask(task);
    } catch (error: unknown) {
      this.throwConflictForDuplicate(error);
      throw error;
    }
  }

  async bulkCreate(
    inputs: BulkCreateTaskItemDto[],
    ownerUid: string,
  ): Promise<Array<{ clientId?: string; resource: Task }>> {
    this.validateClientIds(inputs);

    const invalidParentItems = inputs.filter(
      (input) =>
        input.parent.type !== 'user' &&
        input.parent.type !== 'journey' &&
        input.parent.type !== 'folder',
    );

    if (invalidParentItems.length > 0) {
      throw new BadRequestException(
        `Bulk Task items must use Journey, Folder, or User parents: ${invalidParentItems
          .map((input) => input.clientId ?? '<unassigned>')
          .join(', ')}`,
      );
    }

    const foreignUserParentItems = inputs.filter(
      (input) => input.parent.type === 'user' && input.parent.uid !== ownerUid,
    );

    if (foreignUserParentItems.length > 0) {
      throw new NotFoundException(
        `User parents were not found for bulk Task items: ${foreignUserParentItems
          .map(
            (input) =>
              `${input.clientId ?? '<unassigned>'} (${input.parent.uid})`,
          )
          .join(', ')}`,
      );
    }

    const journeyUids = [
      ...new Set(
        inputs
          .filter((input) => input.parent.type === 'journey')
          .map((input) => input.parent.uid),
      ),
    ];
    const folderUids = [
      ...new Set(
        inputs
          .filter((input) => input.parent.type === 'folder')
          .map((input) => input.parent.uid),
      ),
    ];
    const [journeys, folders] = await Promise.all([
      journeyUids.length === 0
        ? Promise.resolve([] as Array<{ uid: string }>)
        : this.journeyModel
            .find({
              uid: { $in: journeyUids },
              type: 'journey',
              ownerUid,
            })
            .select({ uid: 1 })
            .lean<{ uid: string }[]>()
            .exec(),
      folderUids.length === 0
        ? Promise.resolve([] as Array<{ uid: string }>)
        : this.folderModel
            .find({
              uid: { $in: folderUids },
              type: 'folder',
              ownerUid,
            })
            .select({ uid: 1 })
            .lean<{ uid: string }[]>()
            .exec(),
    ]);
    const existingJourneyUids = new Set(journeys.map((journey) => journey.uid));
    const existingFolderUids = new Set(folders.map((folder) => folder.uid));
    const missingParentItems = inputs.filter((input) =>
      input.parent.type === 'journey'
        ? !existingJourneyUids.has(input.parent.uid)
        : input.parent.type === 'folder' &&
          !existingFolderUids.has(input.parent.uid),
    );

    if (missingParentItems.length > 0) {
      throw new NotFoundException(
        `Parents were not found for bulk Task items: ${missingParentItems
          .map(
            (input) =>
              `${input.clientId ?? '<unassigned>'} (${input.parent.type}:${input.parent.uid})`,
          )
          .join(', ')}`,
      );
    }

    const activityAt = new Date();
    const ancestors = this.activityPropagation
      ? (
          await Promise.all(
            [
              ...new Map(
                inputs.map((input) => [
                  `${input.parent.type}:${input.parent.uid}`,
                  input.parent,
                ]),
              ).values(),
            ].map((parent) =>
              this.activityPropagation!.resolveAncestors(parent, ownerUid),
            ),
          )
        ).flat()
      : [];

    const prepared = inputs.map((input) => ({
      clientId: input.clientId,
      document: {
        description: input.description ?? null,
        isVisible: input.isVisible,
        metadata: input.metadata ?? {},
        name: input.name,
        orderIndex: input.orderIndex,
        ownerUid,
        parent: input.parent,
        lastActivityAt: activityAt,
        state: input.state,
        taskType: null,
        type: 'task' as const,
        uid: `task-${randomUUID()}`,
      },
    }));

    try {
      const documents = await this.taskModel.insertMany(
        prepared.map((item) => item.document),
        { ordered: true },
      );
      const documentsByUid = new Map(
        documents.map((document) => [document.uid, document]),
      );

      if (this.activityPropagation) {
        await this.activityPropagation.propagate(
          ancestors,
          ownerUid,
          activityAt,
        );
      }

      return prepared.map((item) => {
        const document = documentsByUid.get(item.document.uid);

        if (!document) {
          throw new Error(
            `Bulk Task ${item.clientId} was not returned after insertion`,
          );
        }

        const result = { resource: this.toTask(document) };

        if (item.clientId !== undefined) {
          return { clientId: item.clientId, ...result };
        }

        return result;
      });
    } catch (error: unknown) {
      this.throwConflictForDuplicate(error);
      throw error;
    }
  }

  async findAll(
    query: PaginationQueryDto,
    ownerUid: string,
  ): Promise<CollectionResult<Task>> {
    const [documents, totalRecords] = await Promise.all([
      this.taskModel
        .find({ ownerUid })
        .skip((query.page - 1) * query.size)
        .limit(query.size)
        .lean<TaskSchema[]>()
        .exec(),
      this.taskModel.countDocuments({ ownerUid }).exec(),
    ]);

    return {
      items: documents.map((document) => this.toTask(document)),
      totalRecords,
    };
  }

  async findByUid(uid: string, ownerUid?: string): Promise<Task> {
    const document = await this.taskModel
      .findOne(ownerUid === undefined ? { uid } : { uid, ownerUid })
      .lean<TaskSchema>()
      .exec();

    if (!document) {
      throw new NotFoundException(`Task ${uid} was not found`);
    }

    return this.toTask(document);
  }

  async findByUserId(userId: string): Promise<Task[]> {
    const documents = await this.taskModel
      .find({
        'parent.uid': userId,
        'parent.type': 'user',
        ownerUid: userId,
      })
      .sort({ orderIndex: 1, uid: 1 })
      .lean<TaskSchema[]>()
      .exec();

    return documents.map((document) => this.toTask(document));
  }

  async findByParentUids(
    parents: Array<{ uid: string; type: 'journey' | 'folder' }>,
    ownerUid: string,
  ): Promise<Task[]> {
    if (parents.length === 0) return [];

    const documents = await this.taskModel
      .find({
        ownerUid,
        $or: parents.map((parent) => ({
          'parent.uid': parent.uid,
          'parent.type': parent.type,
        })),
      })
      .sort({ orderIndex: 1, uid: 1 })
      .lean<TaskSchema[]>()
      .exec();

    return documents.map((document) => this.toTask(document));
  }

  async update(
    uid: string,
    input: UpdateTaskDto,
    ownerUid: string,
  ): Promise<Task> {
    const current = await this.findByUid(uid, ownerUid);
    const update: Record<string, unknown> = {};

    if (input.parent !== undefined) {
      await this.validateParent(input.parent, ownerUid);
      update.parent = input.parent;
    }
    if (input.name !== undefined) update.name = input.name;
    if (input.description !== undefined) update.description = input.description;
    if (input.state !== undefined) update.state = input.state;
    if (input.isVisible !== undefined) update.isVisible = input.isVisible;
    if (input.orderIndex !== undefined) update.orderIndex = input.orderIndex;
    if (input.metadata !== undefined) update.metadata = input.metadata;

    if (Object.keys(update).length === 0) {
      return current;
    }

    const activityAt = new Date();
    const ancestors = this.activityPropagation
      ? await this.activityPropagation.resolveAncestors(
          input.parent ?? current.parent,
          ownerUid,
        )
      : [];

    const document = await this.taskModel
      .findOneAndUpdate(
        { uid, ownerUid },
        this.activityPropagation
          ? { $set: update, $max: { lastActivityAt: activityAt } }
          : { $set: update },
        {
          returnDocument: 'after',
          runValidators: true,
        },
      )
      .lean<TaskSchema>()
      .exec();

    if (!document) {
      throw new NotFoundException(`Task ${uid} was not found`);
    }

    if (this.activityPropagation) {
      await this.activityPropagation.propagate(ancestors, ownerUid, activityAt);
    }

    return this.toTask(document);
  }

  async remove(uid: string, ownerUid: string): Promise<void> {
    if (this.activityPropagation) {
      const task = await this.taskModel
        .findOne({ uid, ownerUid })
        .select({ parent: 1 })
        .lean<{ parent: ParentReference }>()
        .exec();

      if (!task) {
        throw new NotFoundException(`Task ${uid} was not found`);
      }

      const ancestors = await this.activityPropagation.resolveAncestors(
        task.parent,
        ownerUid,
      );
      const result = await this.taskModel.deleteOne({ uid, ownerUid }).exec();

      if (result.deletedCount === 0) {
        throw new NotFoundException(`Task ${uid} was not found`);
      }

      await this.activityPropagation.propagate(ancestors, ownerUid, new Date());
      return;
    }

    const result = await this.taskModel.deleteOne({ uid, ownerUid }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Task ${uid} was not found`);
    }
  }

  async deleteBulk(ids: string[], ownerUid: string): Promise<void> {
    const session = await this.connection.startSession();

    try {
      await session.withTransaction(async () => {
        const tasks = await this.taskModel
          .find({ uid: { $in: ids }, type: 'task' })
          .session(session)
          .select({ _id: 0, uid: 1, ownerUid: 1, parent: 1 })
          .lean<
            Array<{
              uid: string;
              ownerUid: string;
              parent: ParentReference;
            }>
          >()
          .exec();
        const foreignTasks = tasks.filter((task) => task.ownerUid !== ownerUid);

        if (foreignTasks.length > 0) {
          throw new NotFoundException(
            `Task ${foreignTasks[0].uid} was not found`,
          );
        }

        if (tasks.length === 0) return;

        const ancestors = this.activityPropagation
          ? (
              await Promise.all(
                [
                  ...new Map(
                    tasks.map((task) => [
                      `${task.parent.type}:${task.parent.uid}`,
                      task.parent,
                    ]),
                  ).values(),
                ].map((parent) =>
                  this.activityPropagation!.resolveAncestors(
                    parent,
                    ownerUid,
                    session,
                  ),
                ),
              )
            ).flat()
          : [];

        await this.taskModel
          .deleteMany({
            uid: { $in: tasks.map((task) => task.uid) },
            type: 'task',
            ownerUid,
          })
          .session(session)
          .exec();

        if (this.activityPropagation) {
          await this.activityPropagation.propagate(
            ancestors,
            ownerUid,
            new Date(),
            session,
          );
        }
      });
    } finally {
      await session.endSession();
    }
  }

  private toTask(document: TaskSchema): Task {
    return {
      createdAt: document.createdAt,
      description: document.description ?? null,
      isVisible: document.isVisible,
      metadata: document.metadata ?? {},
      name: document.name,
      orderIndex: document.orderIndex,
      ownerUid: document.ownerUid,
      parent: document.parent,
      lastActivityAt: document.lastActivityAt ?? document.createdAt,
      state: document.state,
      taskType: null,
      type: 'task',
      uid: document.uid,
      updatedAt: document.updatedAt,
    };
  }

  private throwConflictForDuplicate(error: unknown): void {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    ) {
      throw new ConflictException('The Task violates a uniqueness constraint');
    }
  }

  private validateClientIds(inputs: BulkCreateTaskItemDto[]): void {
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    for (const input of inputs) {
      if (input.clientId === undefined) {
        continue;
      }

      if (seen.has(input.clientId)) {
        duplicates.add(input.clientId);
      }
      seen.add(input.clientId);
    }

    if (duplicates.size > 0) {
      throw new BadRequestException(
        `Bulk Task clientId values must be unique: ${[...duplicates].join(', ')}`,
      );
    }
  }

  private async validateParent(
    parent: ParentReference,
    ownerUid?: string,
  ): Promise<void> {
    if (parent.type === 'user') {
      if (ownerUid !== undefined && parent.uid !== ownerUid) {
        throw new NotFoundException(`User ${parent.uid} was not found`);
      }
      return;
    }

    if (parent.type === 'journey') {
      const journey = await this.journeyModel
        .findOne({
          uid: parent.uid,
          type: 'journey',
          ...(ownerUid === undefined ? {} : { ownerUid }),
        })
        .select({ _id: 1 })
        .lean()
        .exec();

      if (!journey) {
        throw new NotFoundException(`Journey ${parent.uid} was not found`);
      }
      return;
    }

    if (parent.type === 'folder') {
      const folder = await this.folderModel
        .findOne({
          uid: parent.uid,
          type: 'folder',
          ...(ownerUid === undefined ? {} : { ownerUid }),
        })
        .select({ _id: 1 })
        .lean()
        .exec();

      if (!folder) {
        throw new NotFoundException(`Folder ${parent.uid} was not found`);
      }
      return;
    }

    throw new BadRequestException(
      'Task parent must be a User, Journey, or Folder',
    );
  }
}
