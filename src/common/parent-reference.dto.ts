import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsIn, IsString, Length } from 'class-validator';
import type { ParentReference, ParentType } from './parent-reference.js';

export class ParentReferenceDto implements ParentReference {
  @ApiProperty({ example: 'user-123' })
  @IsDefined()
  @IsString()
  @Length(1, 255)
  uid!: string;

  @ApiProperty({ enum: ['user', 'journey', 'folder', 'tasks'] })
  @IsDefined()
  @IsIn(['user', 'journey', 'folder', 'tasks'])
  type!: ParentType;
}
