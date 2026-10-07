import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, type HydratedDocument } from 'mongoose';

export type FolderDocument = HydratedDocument<FolderSchema>;

@Schema({ collection: 'folders', timestamps: true, versionKey: false })
export class FolderSchema {
  @Prop({ required: true, type: String })
  parentUid!: string;

  @Prop({ required: true, type: String })
  name!: string;

  @Prop({ default: null, type: String })
  description!: string | null;

  @Prop({ type: MongooseSchema.Types.Mixed })
  orderIndex!: unknown;

  @Prop({ default: {}, type: Object })
  metadata!: Record<string, unknown>;

  @Prop({ required: true, type: String, unique: true })
  uid!: string;

  @Prop({ default: 'folder', enum: ['folder'], required: true, type: String })
  type!: 'folder';

  createdAt!: Date;

  updatedAt!: Date;
}

export const FolderSchemaDefinition =
  SchemaFactory.createForClass(FolderSchema);
FolderSchemaDefinition.index({ parentUid: 1, orderIndex: 1 });
