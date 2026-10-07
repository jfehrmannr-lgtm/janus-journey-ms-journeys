import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, type HydratedDocument } from 'mongoose';
import type { TaskState } from '../../journeys/types/journey.types.js';

export type TaskDocument = HydratedDocument<TaskSchema>;

@Schema({ collection: 'tasks', timestamps: true, versionKey: false })
export class TaskSchema {
  @Prop({ required: true, type: String })
  parentUid!: string;

  @Prop({ required: true, type: String })
  name!: string;

  @Prop({ default: null, type: String })
  description!: string | null;

  @Prop({ default: null, type: String })
  taskType!: null;

  @Prop({
    enum: ['pending', 'in-progress', 'complete', 'in-pause', 'discarded'],
    required: true,
    type: String,
  })
  state!: TaskState;

  @Prop({ required: true, type: Boolean })
  isVisible!: boolean;

  @Prop({ type: MongooseSchema.Types.Mixed })
  orderIndex!: unknown;

  @Prop({ default: {}, type: Object })
  metadata!: Record<string, unknown>;

  @Prop({ required: true, type: String, unique: true })
  uid!: string;

  @Prop({ default: 'task', enum: ['task'], required: true, type: String })
  type!: 'task';

  createdAt!: Date;

  updatedAt!: Date;
}

export const TaskSchemaDefinition = SchemaFactory.createForClass(TaskSchema);
TaskSchemaDefinition.index({ parentUid: 1, orderIndex: 1 });
