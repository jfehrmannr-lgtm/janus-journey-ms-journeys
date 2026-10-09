import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  ResourceParamsDto,
  UserRootParamsDto,
} from '../dto/user-root-params.dto.js';
import {
  FolderResourceResponseDto,
  JourneyResourceResponseDto,
  ResourceResponseDto,
  UserRootResponseDto,
} from '../dto/user-root-response.dto.js';
import { UserRootService } from '../services/user-root.service.js';

@ApiTags('User Root Resources')
@ApiExtraModels(
  FolderResourceResponseDto,
  JourneyResourceResponseDto,
  ResourceResponseDto,
)
@Controller('users')
export class UserRootController {
  constructor(private readonly userRootService: UserRootService) {}

  @ApiOperation({
    summary: 'Get a complete resource by type and UID',
    description:
      'Returns a Journey with nested Folders and Tasks, a Folder with direct Tasks, or a Task.',
  })
  @ApiParam({
    description: 'Resource type to retrieve.',
    enum: ['journey', 'folder', 'task'],
    name: 'resourceType',
    required: true,
  })
  @ApiParam({
    description: 'Stable resource UID.',
    name: 'resourceId',
    required: true,
    type: String,
  })
  @ApiResponse({ status: 200, type: ResourceResponseDto })
  @ApiBadRequestResponse({
    description: 'The resource type or resource ID path parameter is invalid.',
  })
  @Get('resources/:resourceType/:resourceId')
  findResource(
    @Param() params: ResourceParamsDto,
  ): Promise<ResourceResponseDto> {
    return this.userRootService.findResource(params);
  }

  @ApiOperation({
    summary: 'List resources directly owned by a User',
    description:
      'Returns direct root Journeys, Folders, and Tasks for a User. Nested descendants and resources owned by other Users are excluded.',
  })
  @ApiParam({
    description: 'User identifier used by the direct parent reference.',
    name: 'userId',
    required: true,
    type: String,
  })
  @ApiResponse({ status: 200, type: UserRootResponseDto })
  @ApiBadRequestResponse({
    description: 'The userId path parameter is invalid.',
  })
  @Get(':userId/root')
  findByUserId(
    @Param() params: UserRootParamsDto,
  ): Promise<UserRootResponseDto> {
    return this.userRootService.findByUserId(params.userId);
  }
}
