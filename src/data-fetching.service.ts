import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from './prisma.service';

@Injectable()
export class DataFetchingService {
  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async fetchData() {
    const leagues = await this.fetchLeagues();
    await this.prisma.league.createMany({ data: leagues });

    for (const league of leagues) {
      const teams = await this.fetchTeams(league.name);
      await this.prisma.team.createMany({ data: teams });
    }
  }

  async fetchLeagues() {
    const response = await firstValueFrom(this.httpService.get('https://www.thesportsdb.com/api/v1/json/3/all_sports.php'));
    const leagues = response.data.leagues.map(league => ({
      externalId: league.idLeague,
      name: league.strLeague,
      sport: league.strSport,
    }));
    return leagues;
  }

  async fetchTeams(leagueName: string) {
    const response = await firstValueFrom(this.httpService.get(`https://www.thesportsdb.com/api/v1/json/3/search_all_teams.php?l=${leagueName}`));
    const teams = response.data.teams.map(team => ({
      externalId: team.idTeam,
      name: team.strTeam,
      leagueId: team.idLeague,
    }));
    return teams;
  }
}
