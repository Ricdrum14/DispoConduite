import { Module } from '@nestjs/common';
import { SearchProfilesController } from './search-profiles.controller';
import { SearchProfilesService } from './search-profiles.service';

@Module({
  controllers: [SearchProfilesController],
  providers: [SearchProfilesService],
  exports: [SearchProfilesService],
})
export class SearchProfilesModule {}
