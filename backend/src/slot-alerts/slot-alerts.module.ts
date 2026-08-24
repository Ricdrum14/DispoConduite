import { Module } from '@nestjs/common';
import { SlotAlertsController } from './slot-alerts.controller';
import { SlotAlertsService } from './slot-alerts.service';

@Module({
  controllers: [SlotAlertsController],
  providers: [SlotAlertsService],
  exports: [SlotAlertsService],
})
export class SlotAlertsModule {}
