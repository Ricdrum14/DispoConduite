import { Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BookingsService } from './bookings.service';

@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.bookingsService.findAllForUser(req.user.id);
  }

  @Post('from-alert/:slotAlertId')
  confirmFromAlert(@Req() req: any, @Param('slotAlertId') slotAlertId: string) {
    return this.bookingsService.confirmFromAlert(req.user.id, slotAlertId);
  }

  @Patch(':id/cancel')
  cancel(@Req() req: any, @Param('id') id: string) {
    return this.bookingsService.cancel(req.user.id, id);
  }
}
