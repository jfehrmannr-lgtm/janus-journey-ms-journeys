import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { validateEnvironment } from './config/configuration.js';
import { FoldersModule } from './modules/folders/folders.module.js';
import { JourneysModule } from './modules/journeys/journeys.module.js';
import { TasksModule } from './modules/tasks/tasks.module.js';
import { UserRootModule } from './modules/user-root/user-root.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validate: validateEnvironment,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        dbName: config.getOrThrow<string>('MONGODB_DATABASE_NAME'),
        serverSelectionTimeoutMS: config.getOrThrow<number>(
          'MONGODB_SERVER_SELECTION_TIMEOUT_MS',
        ),
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    JourneysModule,
    FoldersModule,
    TasksModule,
    UserRootModule,
  ],
})
export class AppModule {}
