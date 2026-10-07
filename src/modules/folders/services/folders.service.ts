import { Injectable } from '@nestjs/common';
import { CreateFolderDto } from '../dto/create-folder.dto.js';
import { UpdateFolderDto } from '../dto/update-folder.dto.js';
import { FoldersRepository } from '../repositories/folders.repository.js';
import type { Folder } from '@journeys/types/journey.types.js';
import type { CollectionResult } from '@common/collection-result.js';
import type { PaginationQueryDto } from '@common/pagination-query.dto.js';

@Injectable()
export class FoldersService {
  constructor(private readonly foldersRepository: FoldersRepository) {}

  create(input: CreateFolderDto): Promise<Folder> {
    return this.foldersRepository.create(input);
  }

  findAll(query: PaginationQueryDto): Promise<CollectionResult<Folder>> {
    return this.foldersRepository.findAll(query);
  }

  findByUid(uid: string): Promise<Folder> {
    return this.foldersRepository.findByUid(uid);
  }

  update(uid: string, input: UpdateFolderDto): Promise<Folder> {
    return this.foldersRepository.update(uid, input);
  }

  remove(uid: string): Promise<void> {
    return this.foldersRepository.remove(uid);
  }
}
