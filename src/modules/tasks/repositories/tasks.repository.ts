import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'node:crypto';
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

@Injectable()
export class TasksRepository {
  constructor(
    @InjectModel(TaskSchema.name)
    private readonly taskModel: Model<TaskDocument>,
    @InjectModel(JourneySchema.name)
    private readonly journeyModel: Model<JourneyDocument>,
    @InjectModel(FolderSchema.name)
    private readonly folderModel: Model<FolderDocument>,
  ) {}

  async create(input: CreateTaskDto): Promise<Task> {
    await this.validateParent(input.parent);

    try {
      const task = await this.taskModel.create({
        description: input.description ?? null,
        isVisible: input.isVisible,
        metadata: input.metadata ?? {},
        name: input.name,
        orderIndex: input.orderIndex,
        parent: input.parent,
        state: input.state,
        taskType: null,
        type: 'task',
        uid: `task-${randomUUID()}`,
      });

      return this.toTask(task);
    } catch (error: unknown) {
      this.throwConflictForDuplicate(error);
      throw error;
    }
  }

  async findAll(query: PaginationQueryDto): Promise<CollectionResult<Task>> {
    const [documents, totalRecords] = await Promise.all([
      this.taskModel
        .find()
        .skip((query.page - 1) * query.size)
        .limit(query.size)
        .lean<TaskSchema[]>()
        .exec(),
      this.taskModel.countDocuments().exec(),
    ]);

    return {
      items: documents.map((document) => this.toTask(document)),
      totalRecords,
    };
  }

  async findByUid(uid: string): Promise<Task> {
    const document = await this.taskModel
      .findOne({ uid })
      .lean<TaskSchema>()
      .exec();

    if (!document) {
      throw new NotFoundException(`Task ${uid} was not found`);
    }

    return this.toTask(document);
  }

  async findByUserId(userId: string): Promise<Task[]> {
    const documents = await this.taskModel
      .find({ 'parent.uid': userId, 'parent.type': 'user' })
      .sort({ orderIndex: 1, uid: 1 })
      .lean<TaskSchema[]>()
      .exec();

    return documents.map((document) => this.toTask(document));
  }

  async update(uid: string, input: UpdateTaskDto): Promise<Task> {
    const current = await this.findByUid(uid);
    const update: Record<string, unknown> = {};

    if (input.parent !== undefined) {
      await this.validateParent(input.parent);
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

    const document = await this.taskModel
      .findOneAndUpdate(
        { uid },
        { $set: update },
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

    return this.toTask(document);
  }

  async remove(uid: string): Promise<void> {
    const result = await this.taskModel.deleteOne({ uid }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Task ${uid} was not found`);
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
      parent: document.parent,
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

  private async validateParent(parent: ParentReference): Promise<void> {
    if (parent.type === 'user') return;

    if (parent.type === 'journey') {
      const journey = await this.journeyModel
        .findOne({ uid: parent.uid, type: 'journey' })
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
        .findOne({ uid: parent.uid, type: 'folder' })
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
