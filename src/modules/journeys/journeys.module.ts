import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JourneysController } from './controllers/journeys.controller.js';
import { JourneysRepository } from './repositories/journeys.repository.js';
import {
  JourneySchema,
  JourneySchemaDefinition,
} from './schemas/journey.schema.js';
import { JourneysService } from './services/journeys.service.js';

@Module({
  controllers: [JourneysController],
  imports: [
    MongooseModule.forFeature([
      { name: JourneySchema.name, schema: JourneySchemaDefinition },
    ]),
  ],
  providers: [JourneysRepository, JourneysService],
})
export class JourneysModule {}
