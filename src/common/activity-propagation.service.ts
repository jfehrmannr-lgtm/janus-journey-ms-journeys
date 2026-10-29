import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { ClientSession, Model } from 'mongoose';
import type { ParentReference } from './parent-reference.js';
import {
  JourneyDocument,
  JourneySchema,
} from '@journeys/schemas/journey.schema.js';
import {
  FolderDocument,
  FolderSchema,
} from '@folders/schemas/folder.schema.js';

export type ActivityAncestor = {
  type: 'journey' | 'folder';
  uid: string;
};

@Injectable()
export class ActivityPropagationService {
  constructor(
    @InjectModel(JourneySchema.name)
    private readonly journeyModel: Model<JourneyDocument>,
    @InjectModel(FolderSchema.name)
    private readonly folderModel: Model<FolderDocument>,
  ) {}

  async resolveAncestors(
    parent: ParentReference,
    ownerUid: string,
    session?: ClientSession,
  ): Promise<ActivityAncestor[]> {
    const ancestors: ActivityAncestor[] = [];
    const seen = new Set<string>();
    let current = parent;

    while (current.type !== 'user') {
      if (current.type !== 'journey' && current.type !== 'folder') break;

      const key = `${current.type}:${current.uid}`;
      if (seen.has(key)) break;
      seen.add(key);
      const ancestor: ActivityAncestor = {
        type: current.type,
        uid: current.uid,
      };
      ancestors.push(ancestor);

      const document = await this.findParent(ancestor, ownerUid, session);
      if (!document?.parent) break;
      current = document.parent;
    }

    return ancestors;
  }

  async propagate(
    ancestors: ActivityAncestor[],
    ownerUid: string,
    activityAt: Date,
    session?: ClientSession,
  ): Promise<void> {
    const touched = new Set<string>();

    for (const ancestor of ancestors) {
      const key = `${ancestor.type}:${ancestor.uid}`;
      if (touched.has(key)) continue;
      touched.add(key);

      await this.touch(ancestor, ownerUid, activityAt, session);
    }
  }

  private findParent(
    parent: ActivityAncestor,
    ownerUid: string,
    session?: ClientSession,
  ): Promise<{ parent?: ParentReference } | null> {
    if (parent.type === 'journey') {
      const query = this.journeyModel
        .findOne({ uid: parent.uid, type: parent.type, ownerUid })
        .select({ parent: 1 })
        .lean<{ parent?: ParentReference }>();

      if (session) query.session(session);

      return query.exec();
    }

    const query = this.folderModel
      .findOne({ uid: parent.uid, type: parent.type, ownerUid })
      .select({ parent: 1 })
      .lean<{ parent?: ParentReference }>();

    if (session) query.session(session);

    return query.exec();
  }

  private async touch(
    ancestor: ActivityAncestor,
    ownerUid: string,
    activityAt: Date,
    session?: ClientSession,
  ): Promise<void> {
    if (ancestor.type === 'journey') {
      const query = this.journeyModel
        .findOneAndUpdate(
          { uid: ancestor.uid, type: ancestor.type, ownerUid },
          { $max: { lastActivityAt: activityAt } },
          { returnDocument: 'after', timestamps: false },
        )
        .select({ _id: 1 })
        .lean();

      if (session) query.session(session);

      await query.exec();
      return;
    }

    const query = this.folderModel
      .findOneAndUpdate(
        { uid: ancestor.uid, type: ancestor.type, ownerUid },
        { $max: { lastActivityAt: activityAt } },
        { returnDocument: 'after', timestamps: false },
      )
      .select({ _id: 1 })
      .lean();

    if (session) query.session(session);

    await query.exec();
  }
}
