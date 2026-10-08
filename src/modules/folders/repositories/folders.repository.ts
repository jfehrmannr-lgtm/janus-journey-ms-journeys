import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { type Connection, type Model } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { CreateFolderDto } from '../dto/create-folder.dto.js';
import { UpdateFolderDto } from '../dto/update-folder.dto.js';
import { FolderDocument, FolderSchema } from '../schemas/folder.schema.js';
import { TaskDocument, TaskSchema } from '../../tasks/schemas/task.schema.js';
import type { Folder } from '@journeys/types/journey.types.js';
import type { CollectionResult } from '@common/collection-result.js';
import type { PaginationQueryDto } from '@common/pagination-query.dto.js';

@Injectable()
export class FoldersRepository {
  constructor(
    @InjectModel(FolderSchema.name)
    private readonly folderModel: Model<FolderDocument>,
    @InjectModel(TaskSchema.name)
    private readonly taskModel: Model<TaskDocument>,
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async create(input: CreateFolderDto): Promise<Folder> {
    try {
      const folder = await this.folderModel.create({
        description: input.description ?? null,
        metadata: input.metadata ?? {},
        name: input.name,
        orderIndex: input.orderIndex,
        parentUid: input.parentUid,
        type: 'folder',
        uid: `folder-${randomUUID()}`,
      });

      return this.toFolder(folder);
    } catch (error: unknown) {
      this.throwConflictForDuplicate(error);
      throw error;
    }
  }

  async findAll(query: PaginationQueryDto): Promise<CollectionResult<Folder>> {
    const [documents, totalRecords] = await Promise.all([
      this.folderModel
        .find()
        .skip((query.page - 1) * query.size)
        .limit(query.size)
        .lean<FolderSchema[]>()
        .exec(),
      this.folderModel.countDocuments().exec(),
    ]);

    return {
      items: documents.map((document) => this.toFolder(document)),
      totalRecords,
    };
  }

  async findByUid(uid: string): Promise<Folder> {
    const document = await this.folderModel
      .findOne({ uid })
      .lean<FolderSchema>()
      .exec();

    if (!document) {
      throw new NotFoundException(`Folder ${uid} was not found`);
    }

    return this.toFolder(document);
  }

  async update(uid: string, input: UpdateFolderDto): Promise<Folder> {
    const current = await this.findByUid(uid);
    const update: Record<string, unknown> = {};

    if (input.parentUid !== undefined) update.parentUid = input.parentUid;
    if (input.name !== undefined) update.name = input.name;
    if (input.description !== undefined) update.description = input.description;
    if (input.orderIndex !== undefined) update.orderIndex = input.orderIndex;
    if (input.metadata !== undefined) update.metadata = input.metadata;

    if (Object.keys(update).length === 0) {
      return current;
    }

    const document = await this.folderModel
      .findOneAndUpdate(
        { uid },
        { $set: update },
        {
          returnDocument: 'after',
          runValidators: true,
        },
      )
      .lean<FolderSchema>()
      .exec();

    if (!document) {
      throw new NotFoundException(`Folder ${uid} was not found`);
    }

    return this.toFolder(document);
  }

  async remove(uid: string): Promise<void> {
    const session = await this.connection.startSession();

    try {
      await session.withTransaction(async () => {
        const folder = await this.folderModel
          .findOne({ uid })
          .session(session)
          .select({ _id: 1 })
          .lean()
          .exec();

        if (!folder) {
          throw new NotFoundException(`Folder ${uid} was not found`);
        }

        await this.taskModel
          .deleteMany({ parentUid: uid })
          .session(session)
          .exec();
        await this.folderModel.deleteOne({ uid }).session(session).exec();
      });
    } finally {
      await session.endSession();
    }
  }

  private toFolder(document: FolderSchema): Folder {
    return {
      createdAt: document.createdAt,
      description: document.description ?? null,
      metadata: document.metadata ?? {},
      name: document.name,
      orderIndex: document.orderIndex,
      parentUid: document.parentUid,
      type: 'folder',
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
      throw new ConflictException(
        'The Folder violates a uniqueness constraint',
      );
    }
  }
}
