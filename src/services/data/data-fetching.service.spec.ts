import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { KafkaService } from '../kafka/kafka.service';
import { RedisService } from '../redis/redis.service';
import { TeamRepository } from './../../repositories/team.repository';
import { LeagueRepository } from './../../repositories/league.repository';
import { DataFetchingService } from './data-fetching.service';
import { DEFAULT_SPORTS_API_KEY, REDIS_CACHE_TIME } from '../../constants';

describe('DataFetchingService', () => {
  let service: DataFetchingService;
  let httpService: HttpService;
  let configService: ConfigService;
  let kafkaService: KafkaService;
  let redisService: RedisService;
  let leagueRepository: LeagueRepository;
  let teamRepository: TeamRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataFetchingService,
        {
          provide: HttpService,
          useValue: { get: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((key: string) => {
            if (key === 'THESPORTSDB_API_KEY') {
              return '3';
            }
            return null;
          }) },
        },
        {
          provide: PrismaService,
          useValue: { $transaction: jest.fn(), $disconnect: jest.fn() },
        },
        {
          provide: KafkaService,
          useValue: { sendMessage: jest.fn() },
        },
        {
          provide: RedisService,
          useValue: { get: jest.fn(), set: jest.fn() },
        },
        {
          provide: LeagueRepository,
          useValue: {
            findLeaguesByExternalIds: jest.fn(),
            createLeagues: jest.fn(),
            findLeagueByExternalId: jest.fn(),
          },
        },
        {
          provide: TeamRepository,
          useValue: { createTeams: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<DataFetchingService>(DataFetchingService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
    kafkaService = module.get<KafkaService>(KafkaService);
    redisService = module.get<RedisService>(RedisService);
    leagueRepository = module.get<LeagueRepository>(LeagueRepository);
    teamRepository = module.get<TeamRepository>(TeamRepository);

    jest.clearAllMocks();
  });

  describe('fetchLeagues', () => {
    it('should return leagues from cache if available', async () => {
      const cachedLeagues = JSON.stringify([{ externalId: '4328', name: 'Premier League', sport: 'Soccer' }]);
      redisService.get = jest.fn().mockResolvedValue(cachedLeagues);

      const result = await service.fetchLeagues();
      expect(redisService.get).toHaveBeenCalledWith('leagues');
      expect(result).toEqual([{ externalId: '4328', name: 'Premier League', sport: 'Soccer' }]);
    });

    it('should fetch leagues from API if not in cache', async () => {
      const apiResponse = {
        data: {
          leagues: [
            { idLeague: '4328', strLeague: 'Premier League', strSport: 'Soccer' },
          ],
        },
      };
      redisService.get = jest.fn().mockResolvedValue(null);
      httpService.get = jest.fn().mockReturnValue(of(apiResponse));
      redisService.set = jest.fn();

      const result = await service.fetchLeagues();
      expect(httpService.get).toHaveBeenCalledWith(
        `https://www.thesportsdb.com/api/v1/json/3/all_leagues.php`
      );
      expect(redisService.set).toHaveBeenCalledWith(
        'leagues',
        JSON.stringify([{ externalId: '4328', name: 'Premier League', sport: 'Soccer' }]),
        REDIS_CACHE_TIME
      );
      expect(result).toEqual([{ externalId: '4328', name: 'Premier League', sport: 'Soccer' }]);
    });
  });

  describe('fetchTeams', () => {
    it('should return teams from cache if available', async () => {
      const cachedTeams = JSON.stringify([{ externalId: '133604', name: 'Arsenal', leagueId: 4328 }]);
      redisService.get = jest.fn().mockResolvedValue(cachedTeams);

      const result = await service.fetchTeams('Premier League');
      expect(redisService.get).toHaveBeenCalledWith('teams_Premier League');
      expect(result).toEqual([{ externalId: '133604', name: 'Arsenal', leagueId: 4328 }]);
    });

    it('should fetch teams from API if not in cache', async () => {
      const apiResponse = {
        data: {
          teams: [
            { idTeam: '133604', strTeam: 'Arsenal', idLeague: '4328' },
          ],
        },
      };
      redisService.get = jest.fn().mockResolvedValue(null);
      httpService.get = jest.fn().mockReturnValue(of(apiResponse));
      redisService.set = jest.fn();

      const result = await service.fetchTeams('Premier League');
      expect(httpService.get).toHaveBeenCalledWith(
        `https://www.thesportsdb.com/api/v1/json/3/search_all_teams.php?l=Premier League`
      );
      expect(redisService.set).toHaveBeenCalledWith(
        'teams_Premier League',
        JSON.stringify([{ externalId: '133604', name: 'Arsenal', leagueId: 4328 }]),
        REDIS_CACHE_TIME
      );
      expect(result).toEqual([{ externalId: '133604', name: 'Arsenal', leagueId: 4328 }]);
    });
  });

  describe('fetchData', () => {
    it('should fetch leagues and teams and store them in the database', async () => {
      const leagues = [{ externalId: '4328', name: 'Premier League', sport: 'Soccer' }];
      const teams = [{ externalId: '133604', name: 'Arsenal', leagueId: 4328 }];

      service.fetchLeagues = jest.fn().mockResolvedValue(leagues);
      service.fetchTeams = jest.fn().mockResolvedValue(teams);
      leagueRepository.findLeaguesByExternalIds = jest.fn().mockResolvedValue([]);
      leagueRepository.createLeagues = jest.fn().mockResolvedValue(undefined);
      leagueRepository.findLeagueByExternalId = jest.fn().mockResolvedValue({ id: 1, externalId: '4328' });
      teamRepository.createTeams = jest.fn().mockResolvedValue(undefined);

      await service.fetchData();

      expect(service.fetchLeagues).toHaveBeenCalled();
      expect(service.fetchTeams).toHaveBeenCalledWith('Premier League');
    });
  });
});