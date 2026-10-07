import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { CreateJourneyDto } from '../dto/create-journey.dto.js';
import { UpdateJourneyDto } from '../dto/update-journey.dto.js';
import { JourneyDocument, JourneySchema } from '../schemas/journey.schema.js';
import type { Journey } from '../types/journey.types.js';
import type { CollectionResult } from '@common/collection-result.js';
import type { PaginationQueryDto } from '@common/pagination-query.dto.js';

@Injectable()
export class JourneysRepository {
  constructor(
    @InjectModel(JourneySchema.name)
    private readonly journeyModel: Model<JourneyDocument>,
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
    const result = await this.journeyModel.deleteOne({ uid }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Journey ${uid} was not found`);
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
