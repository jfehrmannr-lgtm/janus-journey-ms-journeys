import { Injectable } from '@nestjs/common';
import { CreateJourneyDto } from '../dto/create-journey.dto.js';
import { UpdateJourneyDto } from '../dto/update-journey.dto.js';
import { JourneysRepository } from '../repositories/journeys.repository.js';
import type { Journey } from '../types/journey.types.js';
import type { CollectionResult } from '@common/collection-result.js';
import {
  effectivePageSize,
  type PaginationQueryDto,
} from '@common/pagination-query.dto.js';

@Injectable()
export class JourneysService {
  constructor(private readonly journeysRepository: JourneysRepository) {}

  create(input: CreateJourneyDto): Promise<Journey> {
    return this.journeysRepository.create(input);
  }

  findAll(query: PaginationQueryDto): Promise<CollectionResult<Journey>> {
    return this.journeysRepository.findAll({
      ...query,
      size: effectivePageSize(query.size),
    });
  }

  findByUid(uid: string): Promise<Journey> {
    return this.journeysRepository.findByUid(uid);
  }

  update(uid: string, input: UpdateJourneyDto): Promise<Journey> {
    return this.journeysRepository.update(uid, input);
  }

  remove(uid: string): Promise<void> {
    return this.journeysRepository.remove(uid);
  }
}
