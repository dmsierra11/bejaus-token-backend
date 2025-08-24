import { CustomError } from "../middlewares/errorHandler";
import logger from "../utils/logger";
import prisma from "../db/prisma";
import { DateRangeInput, PaginationInput } from "../utils/validators";

export class LedgerService {
  static async createLedgerEntry(
    kind: string,
    refId: string,
    direction: "in" | "out",
    amount: number,
    currency: "EUR" | "TOKEN",
    metadata?: any
  ): Promise<any> {
    try {
      const entry = await prisma.ledger.create({
        data: {
          kind,
          refId,
          direction,
          amount,
          currency,
          metadataJson: metadata ? JSON.stringify(metadata) : null,
        },
      });

      logger.info("Ledger entry created", {
        entryId: entry.id,
        kind,
        refId,
        direction,
        amount,
        currency,
      });

      return entry;
    } catch (error) {
      logger.error("Error creating ledger entry:", error);
      throw error;
    }
  }

  static async getLedgerEntries(
    filters: {
      kind?: string;
      currency?: "EUR" | "TOKEN";
      direction?: "in" | "out";
      startDate?: Date;
      endDate?: Date;
    } = {},
    pagination: PaginationInput = { page: 1, limit: 20 }
  ): Promise<{
    entries: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const where: any = {};

      if (filters.kind) {
        where.kind = filters.kind;
      }

      if (filters.currency) {
        where.currency = filters.currency;
      }

      if (filters.direction) {
        where.direction = filters.direction;
      }

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) {
          where.createdAt.gte = filters.startDate;
        }
        if (filters.endDate) {
          where.createdAt.lte = filters.endDate;
        }
      }

      const [entries, total] = await Promise.all([
        prisma.ledger.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (pagination.page - 1) * pagination.limit,
          take: pagination.limit,
        }),
        prisma.ledger.count({ where }),
      ]);

      const totalPages = Math.ceil(total / pagination.limit);

      return {
        entries,
        total,
        page: pagination.page,
        totalPages,
      };
    } catch (error) {
      logger.error("Error getting ledger entries:", error);
      throw error;
    }
  }

  static async getLedgerSummary(dateRange?: DateRangeInput): Promise<any> {
    try {
      const where: any = {};

      if (dateRange?.startDate || dateRange?.endDate) {
        where.createdAt = {};
        if (dateRange.startDate) {
          where.createdAt.gte = new Date(dateRange.startDate);
        }
        if (dateRange.endDate) {
          where.createdAt.lte = new Date(dateRange.endDate);
        }
      }

      const [eurEntries, tokenEntries] = await Promise.all([
        prisma.ledger.findMany({
          where: { ...where, currency: "EUR" },
          select: { direction: true, amount: true },
        }),
        prisma.ledger.findMany({
          where: { ...where, currency: "TOKEN" },
          select: { direction: true, amount: true },
        }),
      ]);

      // Calculate EUR totals
      const eurIn = eurEntries
        .filter((entry) => entry.direction === "in")
        .reduce((sum, entry) => sum + entry.amount, 0);

      const eurOut = eurEntries
        .filter((entry) => entry.direction === "out")
        .reduce((sum, entry) => sum + entry.amount, 0);

      // Calculate TOKEN totals
      const tokenIn = tokenEntries
        .filter((entry) => entry.direction === "in")
        .reduce((sum, entry) => sum + entry.amount, 0);

      const tokenOut = tokenEntries
        .filter((entry) => entry.direction === "out")
        .reduce((sum, entry) => sum + entry.amount, 0);

      // Get activity by kind
      const activityByKind = await prisma.ledger.groupBy({
        by: ["kind"],
        where,
        _count: { id: true },
        _sum: { amount: true },
      });

      const summary = {
        eur: {
          totalIn: eurIn,
          totalOut: eurOut,
          net: eurIn - eurOut,
        },
        tokens: {
          totalIn: tokenIn,
          totalOut: tokenOut,
          net: tokenIn - tokenOut,
        },
        activityByKind: activityByKind.map((item) => ({
          kind: item.kind,
          count: item._count.id,
          totalAmount: item._sum.amount || 0,
        })),
        totalEntries: eurEntries.length + tokenEntries.length,
      };

      return summary;
    } catch (error) {
      logger.error("Error getting ledger summary:", error);
      throw error;
    }
  }

  static async getLedgerByKind(
    kind: string,
    pagination: PaginationInput = { page: 1, limit: 20 }
  ): Promise<any> {
    try {
      const [entries, total] = await Promise.all([
        prisma.ledger.findMany({
          where: { kind },
          orderBy: { createdAt: "desc" },
          skip: (pagination.page - 1) * pagination.limit,
          take: pagination.limit,
        }),
        prisma.ledger.count({ where: { kind } }),
      ]);

      const totalPages = Math.ceil(total / pagination.limit);

      return {
        entries,
        total,
        page: pagination.page,
        totalPages,
        kind,
      };
    } catch (error) {
      logger.error("Error getting ledger by kind:", error);
      throw error;
    }
  }

  static async getLedgerByReference(refId: string): Promise<any[]> {
    try {
      const entries = await prisma.ledger.findMany({
        where: { refId },
        orderBy: { createdAt: "asc" },
      });

      return entries;
    } catch (error) {
      logger.error("Error getting ledger by reference:", error);
      throw error;
    }
  }

  static async exportLedgerCSV(dateRange?: DateRangeInput): Promise<string> {
    try {
      const where: any = {};

      if (dateRange?.startDate || dateRange?.endDate) {
        where.createdAt = {};
        if (dateRange.startDate) {
          where.createdAt.gte = new Date(dateRange.startDate);
        }
        if (dateRange.endDate) {
          where.createdAt.lte = new Date(dateRange.endDate);
        }
      }

      const entries = await prisma.ledger.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      // Create CSV content
      const csvHeaders =
        "ID,Kind,Reference ID,Direction,Amount,Currency,Metadata,Created At\n";
      const csvRows = entries
        .map((entry) => {
          const metadata = entry.metadataJson
            ? `"${entry.metadataJson.replace(/"/g, '""')}"`
            : "";
          return `${entry.id},${entry.kind},${entry.refId},${entry.direction},${
            entry.amount
          },${entry.currency},${metadata},${entry.createdAt.toISOString()}`;
        })
        .join("\n");

      return csvHeaders + csvRows;
    } catch (error) {
      logger.error("Error exporting ledger CSV:", error);
      throw error;
    }
  }

  // Helper methods for common ledger operations
  static async logPayment(
    orderId: string,
    amount: number,
    status: string
  ): Promise<void> {
    await this.createLedgerEntry("payment", orderId, "in", amount, "EUR", {
      status,
      provider: "stripe",
    });
  }

  static async logMint(
    orderId: string,
    tokenAmount: number,
    txHash: string
  ): Promise<void> {
    await this.createLedgerEntry("mint", orderId, "out", tokenAmount, "TOKEN", {
      txHash,
      chainId: 137,
    });
  }

  static async logPerkClaim(claimId: string, tokenCost: number): Promise<void> {
    await this.createLedgerEntry(
      "perk_claim",
      claimId,
      "in",
      tokenCost,
      "TOKEN",
      { type: "perk_redemption" }
    );
  }

  static async logVote(voteId: string, userId: string): Promise<void> {
    await this.createLedgerEntry("vote", voteId, "in", 1, "TOKEN", {
      userId,
      type: "governance",
    });
  }
}

export default LedgerService;

