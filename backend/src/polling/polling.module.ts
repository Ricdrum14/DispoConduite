import { Module, forwardRef } from '@nestjs/common';
import { PollingService } from './polling.service';
import { StychModule } from '../stych/stych.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [forwardRef(() => StychModule), EmailModule],
  providers: [PollingService],
  exports: [PollingService],
})
export class PollingModule {}
