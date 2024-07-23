import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from './prisma.service';
import { DEFAULT_SPORTS_API_KEY, REDIS_CACHE_TIME } from './constants';
import { KafkaService } from './kafka/kafka.service';
import { RedisService } from './redis/redis.service';

interface LeagueResponse {
  idLeague: string;
  strLeague: string;
  strSport: string;
}

interface TeamResponse {
  idTeam: string;
  strTeam: string;
  idLeague: string;
}

interface League {
  externalId: string;
  name: string;
  sport: string;
}

interface Team {
  externalId: string;
  name: string;
  leagueId: number;
}

@ApiTags('Data Fetching')
@Injectable()
export class DataFetchingService {
  private readonly logger = new Logger(DataFetchingService.name);
  private apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly kafkaService: KafkaService,
    private readonly redisService: RedisService,
  ) {
    this.apiKey = this.configService.get<string>('THESPORTSDB_API_KEY', DEFAULT_SPORTS_API_KEY)
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  @ApiOperation({ summary: 'Fetch data from external sports API every 5 minutes' })
  async fetchData() {
    const leagues = await this.fetchLeagues();

    if (leagues && leagues.length > 0) {
      await this.prisma.$transaction(async (prisma) => {
        const existingLeagues = await prisma.league.findMany({
          where: {
            externalId: { in: leagues.map((league: League) => league.externalId) },
          },
        });

        const newLeagues = leagues.filter(
          (league: League) => !existingLeagues.some(el => el.externalId === league.externalId)
        );

        if (newLeagues.length > 0) {
          await prisma.league.createMany({ data: newLeagues });
          await this.kafkaService.sendMessage('leagues-topic', newLeagues);
        }
      });

      await this.prisma.$disconnect();

      for (const league of leagues) {
        const teams = await this.fetchTeams(league.name);

        if (teams && teams.length > 0) {
          await this.prisma.$transaction(async (prisma) => {
            const leagueRecord = await prisma.league.findUnique({
              where: { externalId: league.externalId },
            });

            if (leagueRecord) {
              const existingTeams = await prisma.team.findMany({
                where: {
                  externalId: { in: teams.map((team: Team) => team.externalId) },
                },
              });

              const newTeams = teams.filter(
                (team: Team) => !existingTeams.some(et => et.externalId === team.externalId)
              );

              if (newTeams.length > 0) {
                const teamsWithLeagueId = newTeams.map((team: Team) => ({
                  ...team,
                  leagueId: leagueRecord.id,
                }));

                await prisma.team.createMany({ data: teamsWithLeagueId });
                await this.kafkaService.sendMessage('teams-topic', teamsWithLeagueId);
              }
            } else {
              this.logger.error(`League with externalId ${league.externalId} not found.`)
              throw new Error();
            }
          });
        }
      }
    }
  }

  async fetchLeagues() {
    const cacheKey = 'leagues';
    const cachedLeagues = await this.redisService.get(cacheKey);

    if (cachedLeagues) {
      return JSON.parse(cachedLeagues);
    }

    const response = await firstValueFrom(
      this.httpService.get<{ leagues: LeagueResponse[] }>(
        `https://www.thesportsdb.com/api/v1/json/${this.apiKey}/all_leagues.php`
      )
    );
    if (response.data && response.data.leagues) {
      const leagues = response.data.leagues.map((league: LeagueResponse) => ({
        externalId: league.idLeague,
        name: league.strLeague,
        sport: league.strSport,
      }));

      await this.redisService.set(cacheKey, JSON.stringify(leagues), REDIS_CACHE_TIME);
      return leagues;
    }
    return [];
  }

  async fetchTeams(leagueName: string) {
    const cacheKey = `teams_${leagueName}`;

    const cachedTeams = await this.redisService.get(cacheKey);

    if (cachedTeams) {
      return JSON.parse(cachedTeams);
    }

    const response = await firstValueFrom(
      this.httpService.get<{ teams: TeamResponse[] }>(
        `https://www.thesportsdb.com/api/v1/json/${this.apiKey}/search_all_teams.php?l=${leagueName}`
      )
    );
    if (response.data && response.data.teams) {
      const teams = response.data.teams.map((team: TeamResponse) => ({
        externalId: team.idTeam,
        name: team.strTeam,
        leagueId: parseInt(team.idLeague, 10),
      }));

      await this.redisService.set(cacheKey, JSON.stringify(teams), REDIS_CACHE_TIME);
      return teams;
    }
    return [];
  }
}
