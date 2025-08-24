import { CustomError } from "../middlewares/errorHandler";
import logger from "../utils/logger";
import prisma from "../db/prisma";
import TokenService from "./tokenService";
import { CreatePerkInput } from "../utils/validators";
import { randomBytes } from "crypto";

export class PerkService {
  static async createPerk(data: CreatePerkInput): Promise<any> {
    try {
      const perk = await prisma.perk.create({
        data,
      });

      logger.info("Perk created", { perkId: perk.id, name: perk.name });
      return perk;
    } catch (error) {
      logger.error("Error creating perk:", error);
      throw error;
    }
  }

  static async getPerks(activeOnly: boolean = true): Promise<any[]> {
    try {
      const perks = await prisma.perk.findMany({
        where: activeOnly ? { active: true } : {},
        orderBy: { name: "asc" },
      });

      return perks;
    } catch (error) {
      logger.error("Error getting perks:", error);
      throw error;
    }
  }

  static async getPerkById(perkId: string): Promise<any> {
    try {
      const perk = await prisma.perk.findUnique({
        where: { id: perkId, active: true },
      });

      if (!perk) {
        throw new CustomError("Perk no encontrado", 404);
      }

      return perk;
    } catch (error) {
      logger.error("Error getting perk by ID:", error);
      throw error;
    }
  }

  static async claimPerk(perkId: string, userId: string): Promise<any> {
    try {
      // Get perk details
      const perk = await this.getPerkById(perkId);

      // Check if user has enough tokens
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { walletAddress: true },
      });

      if (!user?.walletAddress) {
        throw new CustomError("Usuario sin dirección de wallet", 400);
      }

      const balance = await TokenService.getTokenBalance(user.walletAddress);
      if (balance < perk.tokenCost) {
        throw new CustomError(
          "Saldo insuficiente para reclamar este perk",
          400
        );
      }

      // Generate unique QR code
      const qrCode = this.generateQRCode();

      // Create perk claim
      const claim = await prisma.perkClaim.create({
        data: {
          perkId,
          userId,
          tokenCost: perk.tokenCost,
          qrCode,
        },
        include: {
          perk: true,
        },
      });

      logger.info("Perk claimed", {
        claimId: claim.id,
        perkId,
        userId,
        tokenCost: perk.tokenCost,
        qrCode,
      });

      return claim;
    } catch (error) {
      logger.error("Error claiming perk:", error);
      throw error;
    }
  }

  static async redeemPerk(claimId: string, staffUserId: string): Promise<any> {
    try {
      // Get claim details
      const claim = await prisma.perkClaim.findUnique({
        where: { id: claimId },
        include: {
          perk: true,
          user: true,
        },
      });

      if (!claim) {
        throw new CustomError("Claim no encontrado", 404);
      }

      if (claim.redeemedAt) {
        throw new CustomError("Perk ya ha sido canjeado", 400);
      }

      // Mark as redeemed
      const updatedClaim = await prisma.perkClaim.update({
        where: { id: claimId },
        data: {
          redeemedAt: new Date(),
        },
        include: {
          perk: true,
          user: true,
        },
      });

      logger.info("Perk redeemed", {
        claimId,
        perkId: claim.perkId,
        userId: claim.userId,
        staffUserId,
        redeemedAt: updatedClaim.redeemedAt,
      });

      return updatedClaim;
    } catch (error) {
      logger.error("Error redeeming perk:", error);
      throw error;
    }
  }

  static async getUserPerks(userId: string): Promise<any[]> {
    try {
      const claims = await prisma.perkClaim.findMany({
        where: { userId },
        include: {
          perk: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return claims;
    } catch (error) {
      logger.error("Error getting user perks:", error);
      throw error;
    }
  }

  static async getPerkClaims(perkId?: string): Promise<any[]> {
    try {
      const claims = await prisma.perkClaim.findMany({
        where: perkId ? { perkId } : {},
        include: {
          perk: true,
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return claims;
    } catch (error) {
      logger.error("Error getting perk claims:", error);
      throw error;
    }
  }

  private static generateQRCode(): string {
    // Generate a unique QR code (in production, you might want to use a proper QR library)
    const timestamp = Date.now().toString(36);
    const random = randomBytes(8).toString("hex");
    return `PERK_${timestamp}_${random}`.toUpperCase();
  }

  static async updatePerk(
    perkId: string,
    data: Partial<CreatePerkInput>
  ): Promise<any> {
    try {
      const perk = await prisma.perk.update({
        where: { id: perkId },
        data,
      });

      logger.info("Perk updated", { perkId, name: perk.name });
      return perk;
    } catch (error) {
      logger.error("Error updating perk:", error);
      throw error;
    }
  }

  static async deletePerk(perkId: string): Promise<void> {
    try {
      await prisma.perk.update({
        where: { id: perkId },
        data: { active: false },
      });

      logger.info("Perk deactivated", { perkId });
    } catch (error) {
      logger.error("Error deactivating perk:", error);
      throw error;
    }
  }
}

export default PerkService;

