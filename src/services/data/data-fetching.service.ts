import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_SPORTS_API_KEY, REDIS_CACHE_TIME, SPORTS_BASE_API } from '../../constants';
import { KafkaService } from '../kafka/kafka.service';
import { RedisService } from '../redis/redis.service';
import { TeamRepository } from './../../repositories/team.repository';
import { LeagueRepository } from './../../repositories/league.repository';

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
    private readonly leagueRepository: LeagueRepository,
    private readonly teamRepository: TeamRepository,
  ) {
    this.apiKey = this.configService.get<string>('THESPORTSDB_API_KEY', DEFAULT_SPORTS_API_KEY)
  }

  /**
   * Scheduled method to fetch data every 5 minutes.
   * Fetches leagues and teams data from the external sports API,
   * stores it in the database, and handles updates.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  @ApiOperation({ summary: 'Fetch data from external sports API every 5 minutes' })
  async fetchData() {
    const leagues = await this.fetchLeagues();

    if (leagues && leagues.length > 0) {
      await this.prisma.$transaction(async (prisma) => {
        const existingLeagues = await this.leagueRepository.findLeaguesByExternalIds(
          leagues.map((league: League) => league.externalId),
        );

        const newLeagues = leagues.filter(
          (league: League) => !existingLeagues.some((el) => el.externalId === league.externalId),
        );

        if (newLeagues.length > 0) {
          await this.leagueRepository.createLeagues(newLeagues);
          await this.kafkaService.sendMessage('leagues-topic', newLeagues);
        }
      });

      await this.prisma.$disconnect();

      for (const league of leagues) {
        const teams = await this.fetchTeams(league.name);

        if (teams && teams.length > 0) {
          await this.prisma.$transaction(async (prisma) => {
            const leagueRecord = await this.leagueRepository.findLeagueByExternalId(
              league.externalId,
            );

            if (leagueRecord) {
              const teamsWithLeagueId = teams.map((team: Team) => ({
                ...team,
                leagueId: leagueRecord.id,
              }));

              await this.teamRepository.createTeams(teamsWithLeagueId);
              await this.kafkaService.sendMessage('teams-topic', teamsWithLeagueId);
            } else {
              throw new Error(`League with externalId ${league.externalId} not found.`);
            }
          });
          
        }
      }
    }
  }

  /**
   * Fetch leagues data from the external sports API.
   * @returns A promise that resolves to an array of league objects.
   */
  async fetchLeagues() {
    const cacheKey = 'leagues';
    const cachedLeagues = await this.redisService.get(cacheKey);

    if (cachedLeagues) {
      return JSON.parse(cachedLeagues);
    }

    const response = await firstValueFrom(
      this.httpService.get<{ leagues: LeagueResponse[] }>(
        `${SPORTS_BASE_API}${this.apiKey}/all_leagues.php`
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

  /**
   * Fetch teams data for a given league from the external sports API.
   * @param leagueName - The name of the league to fetch teams for.
   * @returns A promise that resolves to an array of team objects.
   */
  async fetchTeams(leagueName: string) {
    const cacheKey = `teams_${leagueName}`;

    const cachedTeams = await this.redisService.get(cacheKey);

    if (cachedTeams) {
      return JSON.parse(cachedTeams);
    }

    const response = await firstValueFrom(
      this.httpService.get<{ teams: TeamResponse[] }>(
        `${SPORTS_BASE_API}${this.apiKey}/search_all_teams.php?l=${leagueName}`
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
