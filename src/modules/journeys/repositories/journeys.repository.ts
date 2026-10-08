import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { type Connection, type Model } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { CreateJourneyDto } from '../dto/create-journey.dto.js';
import { UpdateJourneyDto } from '../dto/update-journey.dto.js';
import { JourneyDocument, JourneySchema } from '../schemas/journey.schema.js';
import {
  FolderDocument,
  FolderSchema,
} from '../../folders/schemas/folder.schema.js';
import { TaskDocument, TaskSchema } from '../../tasks/schemas/task.schema.js';
import type { Journey } from '../types/journey.types.js';
import type { CollectionResult } from '@common/collection-result.js';
import type { PaginationQueryDto } from '@common/pagination-query.dto.js';

@Injectable()
export class JourneysRepository {
  constructor(
    @InjectModel(JourneySchema.name)
    private readonly journeyModel: Model<JourneyDocument>,
    @InjectModel(FolderSchema.name)
    private readonly folderModel: Model<FolderDocument>,
    @InjectModel(TaskSchema.name)
    private readonly taskModel: Model<TaskDocument>,
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async create(input: CreateJourneyDto): Promise<Journey> {
    try {
      const journey = await this.journeyModel.create({
        description: input.description ?? null,
        metadata: input.metadata ?? {},
        name: input.name,
        parentUid: input.parentUid,
        type: 'journey',
        uid: `journey-${randomUUID()}`,
      });

      return this.toJourney(journey);
    } catch (error: unknown) {
      this.throwConflictForDuplicate(error);
      throw error;
    }
  }

  async findAll(query: PaginationQueryDto): Promise<CollectionResult<Journey>> {
    const [documents, totalRecords] = await Promise.all([
      this.journeyModel
        .find()
        .skip((query.page - 1) * query.size)
        .limit(query.size)
        .lean<JourneySchema[]>()
        .exec(),
      this.journeyModel.countDocuments().exec(),
    ]);

    return {
      items: documents.map((document) => this.toJourney(document)),
      totalRecords,
    };
  }

  async findByUid(uid: string): Promise<Journey> {
    const document = await this.journeyModel
      .findOne({ uid })
      .lean<JourneySchema>()
      .exec();

    if (!document) {
      throw new NotFoundException(`Journey ${uid} was not found`);
    }

    return this.toJourney(document);
  }

  async update(uid: string, input: UpdateJourneyDto): Promise<Journey> {
    const current = await this.findByUid(uid);
    const update: Record<string, unknown> = {};

    if (input.parentUid !== undefined) update.parentUid = input.parentUid;
    if (input.name !== undefined) update.name = input.name;
    if (input.description !== undefined) update.description = input.description;
    if (input.metadata !== undefined) update.metadata = input.metadata;

    if (Object.keys(update).length === 0) {
      return current;
    }

    const document = await this.journeyModel
      .findOneAndUpdate(
        { uid },
        { $set: update },
        {
          returnDocument: 'after',
          runValidators: true,
        },
      )
      .lean<JourneySchema>()
      .exec();

    if (!document) {
      throw new NotFoundException(`Journey ${uid} was not found`);
    }

    return this.toJourney(document);
  }

  async remove(uid: string): Promise<void> {
    const session = await this.connection.startSession();

    try {
      await session.withTransaction(async () => {
        const journey = await this.journeyModel
          .findOne({ uid })
          .session(session)
          .select({ _id: 1 })
          .lean()
          .exec();

        if (!journey) {
          throw new NotFoundException(`Journey ${uid} was not found`);
        }

        const folders = await this.folderModel
          .find({ parentUid: uid })
          .session(session)
          .select({ _id: 0, uid: 1 })
          .lean<{ uid: string }[]>()
          .exec();
        const parentUids = [uid, ...folders.map((folder) => folder.uid)];

        await this.taskModel
          .deleteMany({ parentUid: { $in: parentUids } })
          .session(session)
          .exec();
        await this.folderModel
          .deleteMany({ parentUid: uid })
          .session(session)
          .exec();
        await this.journeyModel.deleteOne({ uid }).session(session).exec();
      });
    } finally {
      await session.endSession();
    }
  }

  private toJourney(document: JourneySchema): Journey {
    return {
      createdAt: document.createdAt,
      description: document.description ?? null,
      metadata: document.metadata ?? {},
      name: document.name,
      parentUid: document.parentUid,
      type: 'journey',
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
        'The Journey violates a uniqueness constraint',
      );
    }
  }
}
