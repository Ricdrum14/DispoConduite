import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { StychModule } from '../stych/stych.module';

@Module({
  imports: [StychModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
