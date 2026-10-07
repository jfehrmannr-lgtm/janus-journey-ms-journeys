import { Injectable } from '@nestjs/common';
import { CreateFolderDto } from '../dto/create-folder.dto.js';
import { UpdateFolderDto } from '../dto/update-folder.dto.js';
import { FoldersRepository } from '../repositories/folders.repository.js';
import type { Folder } from '../../journeys/types/journey.types.js';

@Injectable()
export class FoldersService {
  constructor(private readonly foldersRepository: FoldersRepository) {}

  create(input: CreateFolderDto): Promise<Folder> {
    return this.foldersRepository.create(input);
  }

  findAll(): Promise<Folder[]> {
    return this.foldersRepository.findAll();
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
