import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type JourneyDocument = HydratedDocument<JourneySchema>;

@Schema({ collection: 'journeys', timestamps: true, versionKey: false })
export class JourneySchema {
  @Prop({ required: true, type: String })
  parentUid!: string;

  @Prop({ required: true, type: String })
  name!: string;

  @Prop({ default: null, type: String })
  description!: string | null;

  @Prop({ default: {}, type: Object })
  metadata!: Record<string, unknown>;

  @Prop({ required: true, type: String, unique: true })
  uid!: string;

  @Prop({ default: 'journey', enum: ['journey'], required: true, type: String })
  type!: 'journey';

  createdAt!: Date;

  updatedAt!: Date;
}

export const JourneySchemaDefinition =
  SchemaFactory.createForClass(JourneySchema);
JourneySchemaDefinition.index({ parentUid: 1 });
