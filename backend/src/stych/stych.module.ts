import { Module, forwardRef } from '@nestjs/common';
import { StychController } from './stych.controller';
import { StychService } from './stych.service';
import { StychClientService } from './stych-client.service';
import { PollingModule } from '../polling/polling.module';

@Module({
  imports: [forwardRef(() => PollingModule)],
  controllers: [StychController],
  providers: [StychService, StychClientService],
  exports: [StychService, StychClientService],
})
export class StychModule {}
