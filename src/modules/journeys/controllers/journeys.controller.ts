import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateJourneyDto } from '../dto/create-journey.dto.js';
import { JourneyResponseDto } from '../dto/journey-response.dto.js';
import { UpdateJourneyDto } from '../dto/update-journey.dto.js';
import { JourneysService } from '../services/journeys.service.js';
import { PaginationQueryDto } from '@common/pagination-query.dto.js';

@ApiTags('Journeys')
@Controller('journeys')
export class JourneysController {
  constructor(private readonly journeysService: JourneysService) {}

  @ApiOperation({ summary: 'Create a Journey' })
  @ApiBadRequestResponse({ description: 'Invalid Journey request payload' })
  @ApiConflictResponse({
    description: 'Journey violates a uniqueness constraint',
  })
  @ApiResponse({ status: 201, type: JourneyResponseDto })
  @Post()
  create(@Body() input: CreateJourneyDto): Promise<JourneyResponseDto> {
    return this.journeysService.create(input);
  }

  @ApiOperation({ summary: 'List Journeys' })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { $ref: '#/components/schemas/JourneyResponseDto' },
        },
        totalRecords: { type: 'integer' },
      },
    },
  })
  @Get()
  findAll(
    @Query() query: PaginationQueryDto,
  ): Promise<{ items: JourneyResponseDto[]; totalRecords: number }> {
    return this.journeysService.findAll(query);
  }

  @ApiOperation({ summary: 'Get a Journey by UID' })
  @ApiNotFoundResponse({ description: 'Journey not found' })
  @ApiResponse({
    status: 200,
    schema: {
      properties: {
        items: { $ref: '#/components/schemas/JourneyResponseDto' },
      },
      type: 'object',
    },
  })
  @Get(':uid')
  async findByUid(
    @Param('uid') uid: string,
  ): Promise<{ items: JourneyResponseDto }> {
    return { items: await this.journeysService.findByUid(uid) };
  }

  @ApiOperation({ summary: 'Partially update a Journey' })
  @ApiNotFoundResponse({ description: 'Journey not found' })
  @ApiResponse({ status: 200, type: JourneyResponseDto })
  @Patch(':uid')
  patch(
    @Param('uid') uid: string,
    @Body() input: UpdateJourneyDto,
  ): Promise<JourneyResponseDto> {
    return this.journeysService.update(uid, input);
  }

  @ApiOperation({
    summary: 'Delete a Journey and its descendants',
    description:
      'Deletes the Journey, its direct Folders, direct Tasks, and Tasks belonging to those Folders in one transaction.',
  })
  @ApiNoContentResponse({
    description: 'Journey and all of its Folders and Tasks deleted',
  })
  @ApiNotFoundResponse({ description: 'Journey not found' })
  @Delete(':uid')
  @HttpCode(204)
  async remove(@Param('uid') uid: string): Promise<void> {
    await this.journeysService.remove(uid);
  }
}
