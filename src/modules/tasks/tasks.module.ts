import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TasksController } from './controllers/tasks.controller.js';
import { TasksRepository } from './repositories/tasks.repository.js';
import { TaskSchema, TaskSchemaDefinition } from './schemas/task.schema.js';
import { TasksService } from './services/tasks.service.js';
import {
  JourneySchema,
  JourneySchemaDefinition,
} from '../journeys/schemas/journey.schema.js';
import {
  FolderSchema,
  FolderSchemaDefinition,
} from '../folders/schemas/folder.schema.js';

@Module({
  controllers: [TasksController],
  imports: [
    MongooseModule.forFeature([
      { name: TaskSchema.name, schema: TaskSchemaDefinition },
      { name: JourneySchema.name, schema: JourneySchemaDefinition },
      { name: FolderSchema.name, schema: FolderSchemaDefinition },
    ]),
  ],
  exports: [TasksRepository],
  providers: [TasksRepository, TasksService],
})
export class TasksModule {}
