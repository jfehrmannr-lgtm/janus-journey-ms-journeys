import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRootParamsDto } from '../dto/user-root-params.dto.js';
import { UserRootResponseDto } from '../dto/user-root-response.dto.js';
import { UserRootService } from '../services/user-root.service.js';

@ApiTags('User Root Resources')
@Controller('users')
export class UserRootController {
  constructor(private readonly userRootService: UserRootService) {}

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
