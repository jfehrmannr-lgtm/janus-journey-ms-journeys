import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, Length } from 'class-validator';
import type { ParentReference, ParentType } from './parent-reference.js';

export class ParentReferenceDto implements ParentReference {
  @ApiProperty({ example: 'journey-123' })
  @IsString()
  @Length(1, 255)
  uid!: string;

  @ApiProperty({ enum: ['user', 'journey', 'folder'] })
  @IsIn(['user', 'journey', 'folder'])
  type!: ParentType;
}
