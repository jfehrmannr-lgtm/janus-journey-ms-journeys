import { IsString, Length } from 'class-validator';

export class UserRootParamsDto {
  @IsString()
  @Length(1, 255)
  userId!: string;
}
