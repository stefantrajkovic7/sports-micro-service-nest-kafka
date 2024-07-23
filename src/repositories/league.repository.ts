import { Injectable } from '@nestjs/common';
import { PrismaService } from '../services/prisma/prisma.service';
import { League } from '@prisma/client';

@Injectable()
export class LeagueRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds leagues by their external IDs.
   * @param externalIds - Array of external IDs of leagues.
   * @returns An array of League objects.
   */
  async findLeaguesByExternalIds(externalIds: string[]): Promise<League[]> {
    return this.prisma.league.findMany({
      where: { externalId: { in: externalIds } },
    });
  }

  /**
   * Creates leagues if they do not already exist in the database.
   * @param leagues - Array of leagues to create.
   */
  async createLeagues(leagues: Omit<League, 'id'>[]): Promise<void> {
    await this.prisma.league.createMany({
      data: leagues,
    });
  }

  /**
   * Finds a league by its external ID.
   * @param externalId - The external ID of the league.
   * @returns The League object.
   */
  async findLeagueByExternalId(externalId: string): Promise<League | null> {
    return this.prisma.league.findUnique({
      where: { externalId },
    });
  }
}
