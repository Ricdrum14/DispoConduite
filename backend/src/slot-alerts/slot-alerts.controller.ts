import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SlotAlertsService } from './slot-alerts.service';

@UseGuards(JwtAuthGuard)
@Controller('slot-alerts')
export class SlotAlertsController {
  constructor(private readonly slotAlertsService: SlotAlertsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.slotAlertsService.findAllForUser(req.user.id);
  }

  @Get('latest')
  findLatest(@Req() req: any) {
    return this.slotAlertsService.findLatestActiveForUser(req.user.id);
  }

  @Get('active')
  findActive(@Req() req: any) {
    return this.slotAlertsService.findActiveForUser(req.user.id);
  }
}
