import { Injectable } from '@nestjs/common';
import { PrismaService } from '../services/prisma/prisma.service';
import { Team } from '@prisma/client';

@Injectable()
export class TeamRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find teams by their external IDs.
   * @param externalIds - An array of external IDs of the teams to find.
   * @returns A promise that resolves to an array of found teams.
   */
  async findTeamsByExternalIds(externalIds: string[]): Promise<Team[]> {
    return this.prisma.team.findMany({
      where: { externalId: { in: externalIds } },
    });
  }

  /**
   * Create new teams if they do not already exist in the database.
   * @param teams - An array of teams to create, each omitting the internal ID.
   * @returns A promise that resolves when the teams have been created.
   */
  async createTeams(teams: Omit<Team, 'id'>[]): Promise<void> {
    const existingTeams = await this.findTeamsByExternalIds(
      teams.map((team) => team.externalId),
    );

    const newTeams = teams.filter(
      (team) =>
        !existingTeams.some(
          (existingTeam) => existingTeam.externalId === team.externalId,
        ),
    );

    if (newTeams.length > 0) {
      await this.prisma.team.createMany({ data: newTeams });
    }
  }
}