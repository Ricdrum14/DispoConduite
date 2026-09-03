import { BadRequestException, Body, Controller, Delete, forwardRef, Get, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EmailVerifiedGuard } from '../auth/email-verified.guard';
import { StychService } from './stych.service';
import { ConnectStychDto } from './dto/connect-stych.dto';
import { PollingService } from '../polling/polling.service';

@UseGuards(JwtAuthGuard)
@Controller('stych')
export class StychController {
  constructor(
    private readonly stychService: StychService,
    @Inject(forwardRef(() => PollingService))
    private readonly pollingService: PollingService,
  ) {}

  @Get('status')
  getStatus(@Req() req: any) {
    return this.stychService.getStatus(req.user.id);
  }

  @UseGuards(EmailVerifiedGuard)
  @Post('connect')
  async connect(@Req() req: any, @Body() dto: ConnectStychDto) {
    const result = await this.stychService.connect(req.user.id, dto);
    // Vérification immédiate en tâche de fond — ne fait pas attendre la
    // réponse HTTP, et ses erreurs sont déjà gérées/logguées par pollUser.
    this.pollingService.pollUserNow(req.user.id).catch(() => {});
    return result;
  }

  /**
   * Connexion sans copier-coller manuel — login scripté (email/mdp/token_csrf
   * figés en env, voir StychService.tryAutoRelogin), pensé pour éviter à
   * Ricardo de repasser par le formulaire DevTools à chaque expiration.
   */
  @UseGuards(EmailVerifiedGuard)
  @Post('auto-connect')
  async autoConnect(@Req() req: any) {
    const ok = await this.stychService.tryAutoRelogin(req.user.id);
    if (!ok) {
      throw new BadRequestException(
        'Connexion automatique impossible — identifiants Stych non configurés côté serveur ou refusés.',
      );
    }
    this.pollingService.pollUserNow(req.user.id).catch(() => {});
    return { connected: true };
  }

  @Delete('connect')
  disconnect(@Req() req: any) {
    return this.stychService.disconnect(req.user.id);
  }

  @Post('pause')
  pause(@Req() req: any) {
    return this.stychService.setPollingPaused(req.user.id, true);
  }

  @Post('resume')
  resume(@Req() req: any) {
    return this.stychService.setPollingPaused(req.user.id, false);
  }

  @Post('auto-booking/enable')
  enableAutoBooking(@Req() req: any) {
    return this.stychService.setAutoBooking(req.user.id, true);
  }

  @Post('auto-booking/disable')
  disableAutoBooking(@Req() req: any) {
    return this.stychService.setAutoBooking(req.user.id, false);
  }

  // Rafraîchissement manuel ("Vérifier maintenant" côté dashboard), en plus
  // du cycle de veille automatique (voir polling/).
  @Get('slots')
  fetchSlots(@Req() req: any) {
    return this.stychService.fetchSlotsForUser(req.user.id);
  }
}
