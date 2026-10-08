import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JourneysController } from './controllers/journeys.controller.js';
import { JourneysRepository } from './repositories/journeys.repository.js';
import {
  JourneySchema,
  JourneySchemaDefinition,
} from './schemas/journey.schema.js';
import {
  FolderSchema,
  FolderSchemaDefinition,
} from '../folders/schemas/folder.schema.js';
import {
  TaskSchema,
  TaskSchemaDefinition,
} from '../tasks/schemas/task.schema.js';
import { JourneysService } from './services/journeys.service.js';

@Module({
  controllers: [JourneysController],
  imports: [
    MongooseModule.forFeature([
      { name: JourneySchema.name, schema: JourneySchemaDefinition },
      { name: FolderSchema.name, schema: FolderSchemaDefinition },
      { name: TaskSchema.name, schema: TaskSchemaDefinition },
    ]),
  ],
  providers: [JourneysRepository, JourneysService],
})
export class JourneysModule {}
