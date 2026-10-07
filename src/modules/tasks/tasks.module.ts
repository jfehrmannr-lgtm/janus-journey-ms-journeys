import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TasksController } from './controllers/tasks.controller.js';
import { TasksRepository } from './repositories/tasks.repository.js';
import { TaskSchema, TaskSchemaDefinition } from './schemas/task.schema.js';
import { TasksService } from './services/tasks.service.js';

@Module({
  controllers: [TasksController],
  imports: [
    MongooseModule.forFeature([
      { name: TaskSchema.name, schema: TaskSchemaDefinition },
    ]),
  ],
  providers: [TasksRepository, TasksService],
})
export class TasksModule {}
