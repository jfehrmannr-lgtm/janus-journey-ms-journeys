import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsDefined, IsInt, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @ApiProperty({
    minimum: 1,
    required: true,
    description: 'Requested collection page.',
    default: 1,
    example: 1,
  })
  @IsDefined()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page!: number;

  @ApiProperty({
    minimum: 1,
    required: true,
    description: 'Requested page size. Values above 200 are normalized to 200.',
    default: 20,
    example: 20,
  })
  @IsDefined()
  @IsInt()
  @Min(1)
  @Max(200)
  @Transform(({ value }: { value: unknown }) => {
    const numericValue = Number(value);

    return Number.isInteger(numericValue) && numericValue > 200 ? 200 : value;
  })
  @Type(() => Number)
  size!: number;
}
