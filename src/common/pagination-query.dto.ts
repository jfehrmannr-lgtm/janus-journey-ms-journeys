import { Type } from 'class-transformer';
import { IsDefined, IsInt, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsDefined()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page!: number;

  @IsDefined()
  @IsInt()
  @Min(1)
  @Max(200)
  @Type(() => Number)
  size!: number;
}
