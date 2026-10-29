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
import { BulkCreateFolderItemDto } from '../dto/bulk-create-folder.dto.js';
import { CreateFolderDto } from '../dto/create-folder.dto.js';
import { UpdateFolderDto } from '../dto/update-folder.dto.js';
import { FolderDocument, FolderSchema } from '../schemas/folder.schema.js';
import { TaskDocument, TaskSchema } from '../../tasks/schemas/task.schema.js';
import {
  JourneyDocument,
  JourneySchema,
} from '../../journeys/schemas/journey.schema.js';
import type { ParentReference } from '@common/parent-reference.js';
import type { Folder } from '@journeys/types/journey.types.js';
import type { CollectionResult } from '@common/collection-result.js';
import type { PaginationQueryDto } from '@common/pagination-query.dto.js';
import { ActivityPropagationService } from '@common/activity-propagation.service.js';

@Injectable()
export class FoldersRepository {
  constructor(
    @InjectModel(FolderSchema.name)
    private readonly folderModel: Model<FolderDocument>,
    @InjectModel(TaskSchema.name)
    private readonly taskModel: Model<TaskDocument>,
    @InjectModel(JourneySchema.name)
    private readonly journeyModel: Model<JourneyDocument>,
    @InjectConnection()
    private readonly connection: Connection,
    @Optional()
    private readonly activityPropagation?: ActivityPropagationService,
  ) {}

  async create(input: CreateFolderDto, ownerUid: string): Promise<Folder> {
    await this.validateParent(input.parent, ownerUid);
    const activityAt = new Date();
    const ancestors = this.activityPropagation
      ? await this.activityPropagation.resolveAncestors(input.parent, ownerUid)
      : [];

    try {
      const folder = await this.folderModel.create({
        description: input.description ?? null,
        metadata: input.metadata ?? {},
        name: input.name,
        orderIndex: input.orderIndex,
        ownerUid,
        parent: input.parent,
        lastActivityAt: activityAt,
        type: 'folder',
        uid: `folder-${randomUUID()}`,
      });

      if (this.activityPropagation) {
        await this.activityPropagation.propagate(
          ancestors,
          ownerUid,
          activityAt,
        );
      }

      return this.toFolder(folder);
    } catch (error: unknown) {
      this.throwConflictForDuplicate(error);
      throw error;
    }
  }

  async bulkCreate(
    inputs: BulkCreateFolderItemDto[],
    ownerUid: string,
  ): Promise<Array<{ clientId?: string; resource: Folder }>> {
    this.validateClientIds(inputs);

    const invalidParentItems = inputs.filter(
      (input) =>
        input.parent.type !== 'user' &&
        input.parent.type !== 'journey' &&
        input.parent.type !== 'folder',
    );

    if (invalidParentItems.length > 0) {
      throw new BadRequestException(
        `Folder parent must be a User, Journey, or Folder: ${invalidParentItems
          .map((input) => input.clientId ?? '<unassigned>')
          .join(', ')}`,
      );
    }

    const foreignUserParentItems = inputs.filter(
      (input) => input.parent.type === 'user' && input.parent.uid !== ownerUid,
    );

    if (foreignUserParentItems.length > 0) {
      throw new NotFoundException(
        `User parents were not found for bulk Folder items: ${foreignUserParentItems
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
        `Folder parents were not found for bulk Folder items: ${missingParentItems
          .map(
            (input) =>
              `${input.clientId ?? '<unassigned>'} (${input.parent.uid})`,
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
        metadata: input.metadata ?? {},
        name: input.name,
        orderIndex: input.orderIndex,
        ownerUid,
        parent: input.parent,
        lastActivityAt: activityAt,
        type: 'folder' as const,
        uid: `folder-${randomUUID()}`,
      },
    }));

    try {
      const documents = await this.folderModel.insertMany(
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
            `Bulk Folder ${item.clientId} was not returned after insertion`,
          );
        }

        const result = { resource: this.toFolder(document) };

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
  ): Promise<CollectionResult<Folder>> {
    const [documents, totalRecords] = await Promise.all([
      this.folderModel
        .find({ ownerUid })
        .skip((query.page - 1) * query.size)
        .limit(query.size)
        .lean<FolderSchema[]>()
        .exec(),
      this.folderModel.countDocuments({ ownerUid }).exec(),
    ]);

    return {
      items: documents.map((document) => this.toFolder(document)),
      totalRecords,
    };
  }

  async findByUid(uid: string, ownerUid?: string): Promise<Folder> {
    const document = await this.folderModel
      .findOne(ownerUid === undefined ? { uid } : { uid, ownerUid })
      .lean<FolderSchema>()
      .exec();

    if (!document) {
      throw new NotFoundException(`Folder ${uid} was not found`);
    }

    return this.toFolder(document);
  }

  async findByUserId(userId: string): Promise<Folder[]> {
    const documents = await this.folderModel
      .find({
        'parent.uid': userId,
        'parent.type': 'user',
        ownerUid: userId,
      })
      .sort({ orderIndex: 1, uid: 1 })
      .lean<FolderSchema[]>()
      .exec();

    return documents.map((document) => this.toFolder(document));
  }

  async findByJourneyUid(
    journeyUid: string,
    ownerUid: string,
  ): Promise<Folder[]> {
    const documents = await this.folderModel
      .find({
        'parent.uid': journeyUid,
        'parent.type': 'journey',
        ownerUid,
      })
      .sort({ orderIndex: 1, uid: 1 })
      .lean<FolderSchema[]>()
      .exec();

    return documents.map((document) => this.toFolder(document));
  }

  async findByParentUids(
    parents: Array<{ uid: string; type: 'journey' | 'folder' }>,
    ownerUid: string,
  ): Promise<Folder[]> {
    if (parents.length === 0) return [];

    const documents = await this.folderModel
      .find({
        ownerUid,
        $or: parents.map((parent) => ({
          'parent.uid': parent.uid,
          'parent.type': parent.type,
        })),
      })
      .sort({ orderIndex: 1, uid: 1 })
      .lean<FolderSchema[]>()
      .exec();

    return documents.map((document) => this.toFolder(document));
  }

  async update(
    uid: string,
    input: UpdateFolderDto,
    ownerUid: string,
  ): Promise<Folder> {
    const current = await this.findByUid(uid, ownerUid);
    const update: Record<string, unknown> = {};

    if (input.parent !== undefined) {
      await this.validateParent(input.parent, ownerUid);
      update.parent = input.parent;
    }
    if (input.name !== undefined) update.name = input.name;
    if (input.description !== undefined) update.description = input.description;
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

    const document = await this.folderModel
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
      .lean<FolderSchema>()
      .exec();

    if (!document) {
      throw new NotFoundException(`Folder ${uid} was not found`);
    }

    if (this.activityPropagation) {
      await this.activityPropagation.propagate(ancestors, ownerUid, activityAt);
    }

    return this.toFolder(document);
  }

  async remove(uid: string, ownerUid: string): Promise<void> {
    const session = await this.connection.startSession();

    try {
      await session.withTransaction(async () => {
        const folder = await this.folderModel
          .findOne({ uid, type: 'folder', ownerUid })
          .session(session)
          .select({ _id: 1, parent: 1 })
          .lean()
          .exec();

        if (!folder) {
          throw new NotFoundException(`Folder ${uid} was not found`);
        }

        const ancestors =
          this.activityPropagation && folder.parent
            ? await this.activityPropagation.resolveAncestors(
                folder.parent,
                ownerUid,
                session,
              )
            : [];

        await this.taskModel
          .deleteMany({
            'parent.uid': uid,
            'parent.type': 'folder',
            ownerUid,
          })
          .session(session)
          .exec();
        await this.folderModel
          .deleteOne({ uid, ownerUid })
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

  async deleteBulk(ids: string[], ownerUid: string): Promise<void> {
    const session = await this.connection.startSession();

    try {
      await session.withTransaction(async () => {
        const folders = await this.folderModel
          .find({ uid: { $in: ids }, type: 'folder' })
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
        const foreignFolders = folders.filter(
          (folder) => folder.ownerUid !== ownerUid,
        );

        if (foreignFolders.length > 0) {
          throw new NotFoundException(
            `Folder ${foreignFolders[0].uid} was not found`,
          );
        }

        const folderUids = folders.map((folder) => folder.uid);

        if (folderUids.length === 0) return;

        const ancestors = this.activityPropagation
          ? (
              await Promise.all(
                [
                  ...new Map(
                    folders.map((folder) => [
                      `${folder.parent.type}:${folder.parent.uid}`,
                      folder.parent,
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
            'parent.uid': { $in: folderUids },
            'parent.type': 'folder',
            ownerUid,
          })
          .session(session)
          .exec();
        await this.folderModel
          .deleteMany({
            uid: { $in: folderUids },
            type: 'folder',
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

  private toFolder(document: FolderSchema): Folder {
    return {
      createdAt: document.createdAt,
      description: document.description ?? null,
      metadata: document.metadata ?? {},
      name: document.name,
      orderIndex: document.orderIndex,
      ownerUid: document.ownerUid,
      parent: document.parent,
      lastActivityAt: document.lastActivityAt ?? document.createdAt,
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

  private validateClientIds(inputs: BulkCreateFolderItemDto[]): void {
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
        `Bulk Folder clientId values must be unique: ${[...duplicates].join(', ')}`,
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

    if (parent.type !== 'journey' && parent.type !== 'folder') {
      throw new BadRequestException(
        'Folder parent must be a User, Journey, or Folder',
      );
    }

    const resource =
      parent.type === 'journey'
        ? await this.journeyModel
            .findOne({
              uid: parent.uid,
              type: parent.type,
              ...(ownerUid === undefined ? {} : { ownerUid }),
            })
            .select({ _id: 1 })
            .lean()
            .exec()
        : await this.folderModel
            .findOne({
              uid: parent.uid,
              type: parent.type,
              ...(ownerUid === undefined ? {} : { ownerUid }),
            })
            .select({ _id: 1 })
            .lean()
            .exec();

    if (!resource) {
      throw new NotFoundException(
        `${parent.type === 'journey' ? 'Journey' : 'Folder'} ${parent.uid} was not found`,
      );
    }
  }
}
