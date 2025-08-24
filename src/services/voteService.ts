import { CustomError } from "../middlewares/errorHandler";
import logger from "../utils/logger";
import prisma from "../db/prisma";
import { CreateVoteInput, CastBallotInput } from "../utils/validators";

export class VoteService {
  static async createVote(data: CreateVoteInput): Promise<any> {
    try {
      const { options, ...voteData } = data;

      // Create vote with options
      const vote = await prisma.vote.create({
        data: {
          ...voteData,
          startAt: new Date(voteData.startAt),
          endAt: new Date(voteData.endAt),
          options: {
            create: options.map((label) => ({ label })),
          },
        },
        include: {
          options: true,
        },
      });

      logger.info("Vote created", {
        voteId: vote.id,
        title: vote.title,
        optionsCount: options.length,
      });

      return vote;
    } catch (error) {
      logger.error("Error creating vote:", error);
      throw error;
    }
  }

  static async getVotes(activeOnly: boolean = true): Promise<any[]> {
    try {
      const now = new Date();

      const votes = await prisma.vote.findMany({
        where: activeOnly
          ? {
              active: true,
              startAt: { lte: now },
              endAt: { gte: now },
            }
          : {},
        include: {
          options: true,
          _count: {
            select: {
              ballots: true,
            },
          },
        },
        orderBy: { startAt: "desc" },
      });

      return votes;
    } catch (error) {
      logger.error("Error getting votes:", error);
      throw error;
    }
  }

  static async getVoteById(voteId: string): Promise<any> {
    try {
      const vote = await prisma.vote.findUnique({
        where: { id: voteId },
        include: {
          options: {
            include: {
              _count: {
                select: {
                  ballots: true,
                },
              },
            },
          },
          _count: {
            select: {
              ballots: true,
            },
          },
        },
      });

      if (!vote) {
        throw new CustomError("Votación no encontrada", 404);
      }

      return vote;
    } catch (error) {
      logger.error("Error getting vote by ID:", error);
      throw error;
    }
  }

  static async castBallot(
    voteId: string,
    userId: string,
    data: CastBallotInput
  ): Promise<any> {
    try {
      // Check if vote is active
      const vote = await this.getVoteById(voteId);
      const now = new Date();

      if (now < vote.startAt || now > vote.endAt) {
        throw new CustomError("Votación no está activa", 400);
      }

      if (!vote.active) {
        throw new CustomError("Votación inactiva", 400);
      }

      // Check if user already voted
      const existingBallot = await prisma.voteBallot.findUnique({
        where: {
          voteId_userId: {
            voteId,
            userId,
          },
        },
      });

      if (existingBallot) {
        throw new CustomError("Usuario ya ha votado en esta votación", 400);
      }

      // Verify option exists
      const option = await prisma.voteOption.findFirst({
        where: {
          id: data.optionId,
          voteId,
        },
      });

      if (!option) {
        throw new CustomError("Opción de voto inválida", 400);
      }

      // Create ballot
      const ballot = await prisma.voteBallot.create({
        data: {
          voteId,
          optionId: data.optionId,
          userId,
        },
        include: {
          option: true,
        },
      });

      logger.info("Ballot cast", {
        ballotId: ballot.id,
        voteId,
        userId,
        optionId: data.optionId,
      });

      return ballot;
    } catch (error) {
      logger.error("Error casting ballot:", error);
      throw error;
    }
  }

  static async getVoteResults(voteId: string): Promise<any> {
    try {
      const vote = await this.getVoteById(voteId);

      // Get results with option details
      const results = await prisma.voteOption.findMany({
        where: { voteId },
        include: {
          _count: {
            select: {
              ballots: true,
            },
          },
        },
        orderBy: {
          ballots: {
            _count: "desc",
          },
        },
      });

      const totalVotes = results.reduce(
        (sum, option) => sum + option._count.ballots,
        0
      );

      const resultsWithPercentages = results.map((option) => ({
        id: option.id,
        label: option.label,
        votes: option._count.ballots,
        percentage:
          totalVotes > 0 ? (option._count.ballots / totalVotes) * 100 : 0,
      }));

      return {
        vote: {
          id: vote.id,
          title: vote.title,
          description: vote.description,
          startAt: vote.startAt,
          endAt: vote.endAt,
          totalVotes,
        },
        results: resultsWithPercentages,
      };
    } catch (error) {
      logger.error("Error getting vote results:", error);
      throw error;
    }
  }

  static async getUserVotes(userId: string): Promise<any[]> {
    try {
      const ballots = await prisma.voteBallot.findMany({
        where: { userId },
        include: {
          vote: {
            select: {
              id: true,
              title: true,
              startAt: true,
              endAt: true,
            },
          },
          option: {
            select: {
              id: true,
              label: true,
            },
          },
        },
        orderBy: { castAt: "desc" },
      });

      return ballots;
    } catch (error) {
      logger.error("Error getting user votes:", error);
      throw error;
    }
  }

  static async updateVote(
    voteId: string,
    data: Partial<CreateVoteInput>
  ): Promise<any> {
    try {
      const updateData: any = { ...data };

      if (data.startAt) {
        updateData.startAt = new Date(data.startAt);
      }
      if (data.endAt) {
        updateData.endAt = new Date(data.endAt);
      }

      const vote = await prisma.vote.update({
        where: { id: voteId },
        data: updateData,
        include: {
          options: true,
        },
      });

      logger.info("Vote updated", { voteId, title: vote.title });
      return vote;
    } catch (error) {
      logger.error("Error updating vote:", error);
      throw error;
    }
  }

  static async deleteVote(voteId: string): Promise<void> {
    try {
      await prisma.vote.update({
        where: { id: voteId },
        data: { active: false },
      });

      logger.info("Vote deactivated", { voteId });
    } catch (error) {
      logger.error("Error deactivating vote:", error);
      throw error;
    }
  }

  static async addVoteOption(voteId: string, label: string): Promise<any> {
    try {
      const option = await prisma.voteOption.create({
        data: {
          voteId,
          label,
        },
      });

      logger.info("Vote option added", { optionId: option.id, voteId, label });
      return option;
    } catch (error) {
      logger.error("Error adding vote option:", error);
      throw error;
    }
  }

  static async removeVoteOption(optionId: string): Promise<void> {
    try {
      // Check if option has votes
      const ballotsCount = await prisma.voteBallot.count({
        where: { optionId },
      });

      if (ballotsCount > 0) {
        throw new CustomError(
          "No se puede eliminar una opción que ya tiene votos",
          400
        );
      }

      await prisma.voteOption.delete({
        where: { id: optionId },
      });

      logger.info("Vote option removed", { optionId });
    } catch (error) {
      logger.error("Error removing vote option:", error);
      throw error;
    }
  }
}

export default VoteService;

