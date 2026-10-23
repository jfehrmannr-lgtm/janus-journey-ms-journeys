import { Injectable } from '@nestjs/common';
import { BulkCreateFolderItemDto } from '../dto/bulk-create-folder.dto.js';
import { CreateFolderDto } from '../dto/create-folder.dto.js';
import { UpdateFolderDto } from '../dto/update-folder.dto.js';
import { FoldersRepository } from '../repositories/folders.repository.js';
import type { Folder } from '@journeys/types/journey.types.js';
import type { CollectionResult } from '@common/collection-result.js';
import {
  effectivePageSize,
  type PaginationQueryDto,
} from '@common/pagination-query.dto.js';

@Injectable()
export class FoldersService {
  constructor(private readonly foldersRepository: FoldersRepository) {}

  create(input: CreateFolderDto, ownerUid: string): Promise<Folder> {
    return this.foldersRepository.create(input, ownerUid);
  }

  bulkCreate(
    inputs: BulkCreateFolderItemDto[],
    ownerUid: string,
  ): Promise<Array<{ clientId?: string; resource: Folder }>> {
    return this.foldersRepository.bulkCreate(inputs, ownerUid);
  }

  findAll(
    query: PaginationQueryDto,
    ownerUid: string,
  ): Promise<CollectionResult<Folder>> {
    return this.foldersRepository.findAll(
      {
        ...query,
        size: effectivePageSize(query.size),
      },
      ownerUid,
    );
  }

  findByUid(uid: string, ownerUid: string): Promise<Folder> {
    return this.foldersRepository.findByUid(uid, ownerUid);
  }

  update(
    uid: string,
    input: UpdateFolderDto,
    ownerUid: string,
  ): Promise<Folder> {
    return this.foldersRepository.update(uid, input, ownerUid);
  }

  remove(uid: string): Promise<void> {
    return this.foldersRepository.remove(uid);
  }

  deleteBulk(ids: string[]): Promise<void> {
    return this.foldersRepository.deleteBulk(ids);
  }
}
