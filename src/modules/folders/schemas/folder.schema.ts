import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, type HydratedDocument } from 'mongoose';
import { ParentReferenceSchema } from '@common/parent-reference.schema.js';

export type FolderDocument = HydratedDocument<FolderSchema>;

@Schema({ collection: 'folders', timestamps: true, versionKey: false })
export class FolderSchema {
  @Prop({ required: true, type: ParentReferenceSchema })
  parent!: ParentReferenceSchema;

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
FolderSchemaDefinition.index({
  'parent.uid': 1,
  'parent.type': 1,
  orderIndex: 1,
});
