import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsObject,
  IsOptional,
  IsString,
  Length,
  ValidateIf,
} from 'class-validator';

export class CreateFolderDto {
  @ApiProperty({ description: 'UID of the owning User or Journey.' })
  @IsString()
  @Length(1, 255)
  parentUid!: string;

  @ApiProperty({ example: 'HTML and CSS' })
  @IsString()
  @Length(1, 255)
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_, value: unknown) => value !== null && value !== undefined)
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  orderIndex?: unknown;

  @ApiPropertyOptional({ type: Object })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
