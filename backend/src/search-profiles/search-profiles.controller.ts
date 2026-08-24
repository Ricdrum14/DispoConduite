import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SearchProfilesService } from './search-profiles.service';
import { CreateSearchProfileDto } from './dto/create-search-profile.dto';
import { UpdateSearchProfileDto } from './dto/update-search-profile.dto';

@UseGuards(JwtAuthGuard)
@Controller('search-profiles')
export class SearchProfilesController {
  constructor(private readonly searchProfilesService: SearchProfilesService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.searchProfilesService.findAllForUser(req.user.id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateSearchProfileDto) {
    return this.searchProfilesService.create(req.user.id, dto);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateSearchProfileDto) {
    return this.searchProfilesService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.searchProfilesService.remove(req.user.id, id);
  }
}
