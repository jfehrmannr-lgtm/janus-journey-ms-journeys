import { Prop, Schema } from '@nestjs/mongoose';
import type { ParentReference, ParentType } from './parent-reference.js';

@Schema({ _id: false })
export class ParentReferenceSchema implements ParentReference {
  @Prop({ required: true, type: String })
  uid!: string;

  @Prop({
    enum: ['user', 'journey', 'folder'],
    required: true,
    type: String,
  })
  type!: ParentType;
}
