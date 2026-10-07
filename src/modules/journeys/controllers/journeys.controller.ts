import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
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

@ApiTags('Journeys')
@Controller('journeys')
export class JourneysController {
  constructor(private readonly journeysService: JourneysService) {}

  @ApiOperation({ summary: 'Create a Journey' })
  @ApiResponse({ status: 201, type: JourneyResponseDto })
  @Post()
  create(@Body() input: CreateJourneyDto): Promise<JourneyResponseDto> {
    return this.journeysService.create(input);
  }

  @ApiOperation({ summary: 'List Journeys' })
  @ApiResponse({ isArray: true, status: 200, type: JourneyResponseDto })
  @Get()
  findAll(): Promise<JourneyResponseDto[]> {
    return this.journeysService.findAll();
  }

  @ApiOperation({ summary: 'Get a Journey by UID' })
  @ApiNotFoundResponse({ description: 'Journey not found' })
  @ApiResponse({ status: 200, type: JourneyResponseDto })
  @Get(':uid')
  findByUid(@Param('uid') uid: string): Promise<JourneyResponseDto> {
    return this.journeysService.findByUid(uid);
  }

  @ApiOperation({ summary: 'Replace mutable Journey fields' })
  @ApiNotFoundResponse({ description: 'Journey not found' })
  @ApiResponse({ status: 200, type: JourneyResponseDto })
  @Put(':uid')
  update(
    @Param('uid') uid: string,
    @Body() input: UpdateJourneyDto,
  ): Promise<JourneyResponseDto> {
    return this.journeysService.update(uid, input);
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

  @ApiOperation({ summary: 'Delete a Journey without cascading' })
  @ApiNoContentResponse({ description: 'Journey deleted' })
  @ApiNotFoundResponse({ description: 'Journey not found' })
  @Delete(':uid')
  @HttpCode(204)
  async remove(@Param('uid') uid: string): Promise<void> {
    await this.journeysService.remove(uid);
  }
}
