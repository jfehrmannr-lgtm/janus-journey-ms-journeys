import { Injectable } from '@nestjs/common';
import { CreateJourneyDto } from '../dto/create-journey.dto.js';
import { UpdateJourneyDto } from '../dto/update-journey.dto.js';
import { JourneysRepository } from '../repositories/journeys.repository.js';
import type { Journey } from '../types/journey.types.js';

@Injectable()
export class JourneysService {
  constructor(private readonly journeysRepository: JourneysRepository) {}

  create(input: CreateJourneyDto): Promise<Journey> {
    return this.journeysRepository.create(input);
  }

  findAll(): Promise<Journey[]> {
    return this.journeysRepository.findAll();
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
