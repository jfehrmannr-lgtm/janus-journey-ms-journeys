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

  findAll(
    query: PaginationQueryDto,
    ownerUid: string,
  ): Promise<CollectionResult<Journey>> {
    return this.journeysRepository.findAll(
      {
        ...query,
        size: effectivePageSize(query.size),
      },
      ownerUid,
    );
  }

  findByUid(uid: string, ownerUid: string): Promise<Journey> {
    return this.journeysRepository.findByUid(uid, ownerUid);
  }

  update(uid: string, input: UpdateJourneyDto): Promise<Journey> {
    return this.journeysRepository.update(uid, input);
  }

  remove(uid: string): Promise<void> {
    return this.journeysRepository.remove(uid);
  }
}
