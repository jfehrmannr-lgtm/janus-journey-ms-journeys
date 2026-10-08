import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FoldersController } from './controllers/folders.controller.js';
import { FoldersRepository } from './repositories/folders.repository.js';
import {
  FolderSchema,
  FolderSchemaDefinition,
} from './schemas/folder.schema.js';
import {
  TaskSchema,
  TaskSchemaDefinition,
} from '../tasks/schemas/task.schema.js';
import {
  JourneySchema,
  JourneySchemaDefinition,
} from '../journeys/schemas/journey.schema.js';
import { FoldersService } from './services/folders.service.js';

@Module({
  controllers: [FoldersController],
  imports: [
    MongooseModule.forFeature([
      { name: FolderSchema.name, schema: FolderSchemaDefinition },
      { name: TaskSchema.name, schema: TaskSchemaDefinition },
      { name: JourneySchema.name, schema: JourneySchemaDefinition },
    ]),
  ],
  providers: [FoldersRepository, FoldersService],
})
export class FoldersModule {}
