import { Module } from '@nestjs/common';
import { FoldersModule } from '../folders/folders.module.js';
import { JourneysModule } from '../journeys/journeys.module.js';
import { TasksModule } from '../tasks/tasks.module.js';
import { UserRootController } from './controllers/user-root.controller.js';
import { UserRootService } from './services/user-root.service.js';

@Module({
  controllers: [UserRootController],
  imports: [JourneysModule, FoldersModule, TasksModule],
  providers: [UserRootService],
})
export class UserRootModule {}
