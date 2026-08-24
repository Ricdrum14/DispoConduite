import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StychModule } from './stych/stych.module';
import { SearchProfilesModule } from './search-profiles/search-profiles.module';
import { SlotAlertsModule } from './slot-alerts/slot-alerts.module';
import { BookingsModule } from './bookings/bookings.module';
import { PollingModule } from './polling/polling.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60000, // fenêtre de 1 minute
        limit: 100, // 100 requêtes/minute par IP (usage normal)
      },
      {
        name: 'auth',
        ttl: 60000, // fenêtre de 1 minute
        limit: 10, // 10 tentatives/minute max sur les routes auth
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    StychModule,
    SearchProfilesModule,
    SlotAlertsModule,
    BookingsModule,
    PollingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
