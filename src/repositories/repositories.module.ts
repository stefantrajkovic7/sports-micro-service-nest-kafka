import { Module } from '@nestjs/common';
import { LeagueRepository } from './league.repository';
import { TeamRepository } from './team.repository';
import { PrismaService } from './../services/prisma/prisma.service';

@Module({
  providers: [PrismaService, LeagueRepository, TeamRepository],
  exports: [LeagueRepository, TeamRepository],
})
export class RepositoriesModule {}