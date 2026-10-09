import { IsEnum, IsString, Length } from 'class-validator';

export class UserRootParamsDto {
  @IsString()
  @Length(1, 255)
  userId!: string;
}

export class ResourceParamsDto {
  @IsEnum(['journey', 'folder', 'task'])
  resourceType!: 'journey' | 'folder' | 'task';

  @IsString()
  @Length(1, 255)
  resourceId!: string;
}
