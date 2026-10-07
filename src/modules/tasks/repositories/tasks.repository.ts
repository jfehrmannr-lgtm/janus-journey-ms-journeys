import {
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
import type { Task } from '@journeys/types/journey.types.js';
import type { CollectionResult } from '@common/collection-result.js';
import type { PaginationQueryDto } from '@common/pagination-query.dto.js';

@Injectable()
export class TasksRepository {
  constructor(
    @InjectModel(TaskSchema.name)
    private readonly taskModel: Model<TaskDocument>,
  ) {}

  async create(input: CreateTaskDto): Promise<Task> {
    try {
      const task = await this.taskModel.create({
        description: input.description ?? null,
        isVisible: input.isVisible,
        metadata: input.metadata ?? {},
        name: input.name,
        orderIndex: input.orderIndex,
        parentUid: input.parentUid,
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

  async update(uid: string, input: UpdateTaskDto): Promise<Task> {
    const current = await this.findByUid(uid);
    const update: Record<string, unknown> = {};

    if (input.parentUid !== undefined) update.parentUid = input.parentUid;
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
      parentUid: document.parentUid,
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
}
