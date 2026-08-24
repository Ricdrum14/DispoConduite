import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ensureOwnership } from '../common/ensure-ownership';
import { CreateSearchProfileDto } from './dto/create-search-profile.dto';
import { UpdateSearchProfileDto } from './dto/update-search-profile.dto';

@Injectable()
export class SearchProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  findAllForUser(userId: string) {
    return this.prisma.searchProfile.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'asc' },
    });
  }

  async create(userId: string, dto: CreateSearchProfileDto) {
    return this.prisma.searchProfile.create({
      data: { ...dto, user_id: userId },
    });
  }

  async update(userId: string, id: string, dto: UpdateSearchProfileDto) {
    await this.ensureOwnership(userId, id);
    return this.prisma.searchProfile.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    await this.ensureOwnership(userId, id);
    return this.prisma.searchProfile.delete({ where: { id } });
  }

  private async ensureOwnership(userId: string, id: string) {
    const profile = await this.prisma.searchProfile.findUnique({ where: { id } });
    return ensureOwnership(profile, userId, 'Profil de recherche introuvable');
  }
}
