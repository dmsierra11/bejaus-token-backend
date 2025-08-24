import { Router, Request, Response } from "express";
import { z } from "zod";
import { mintTokensSchema } from "../utils/validators";
import TokenService from "../services/tokenService";
import {
  authMiddleware,
  AuthenticatedRequest,
} from "../middlewares/authMiddleware";
import logger from "../utils/logger";
import prisma from "../db/prisma";

const router = Router();

// GET /tokens/balance
router.get(
  "/balance",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { walletAddress: true },
      });

      if (!user?.walletAddress) {
        return res.status(400).json({
          success: false,
          error: { message: "Usuario sin dirección de wallet" },
        });
      }

      const balance = await TokenService.getTokenBalance(user.walletAddress);

      res.json({
        success: true,
        data: {
          balance,
          walletAddress: user.walletAddress,
        },
      });
    } catch (error) {
      logger.error("Get balance error:", error);
      res.status(500).json({
        success: false,
        error: { message: "Error al obtener saldo" },
      });
    }
  }
);

// GET /tokens/info
router.get("/info", async (req: Request, res: Response) => {
  try {
    const tokenInfo = await TokenService.getTokenInfo();

    res.json({
      success: true,
      data: tokenInfo,
    });
  } catch (error) {
    logger.error("Get token info error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Error al obtener información del token" },
    });
  }
});

// POST /tokens/mint (admin only)
router.post(
  "/mint",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId, amount } = mintTokensSchema.parse(req.body);
      const adminUserId = req.user!.id;

      // Check if admin user has permission (simplified check)
      // In production, you'd have proper role-based access control
      const adminUser = await prisma.user.findUnique({
        where: { id: adminUserId },
        select: { email: true },
      });

      if (!adminUser?.email?.includes("admin")) {
        return res.status(403).json({
          success: false,
          error: {
            message: "Acceso denegado: se requieren permisos de administrador",
          },
        });
      }

      // Get user to mint tokens to
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { walletAddress: true },
      });

      if (!targetUser?.walletAddress) {
        return res.status(400).json({
          success: false,
          error: { message: "Usuario objetivo sin dirección de wallet" },
        });
      }

      // Create a mock order for admin minting
      const mockOrder = await prisma.order.create({
        data: {
          userId,
          productId: "admin-mint", // Mock product ID
          status: "completed",
        },
      });

      // Mint tokens
      const result = await TokenService.mintTokens(
        mockOrder.id,
        userId,
        amount,
        targetUser.walletAddress
      );

      logger.info("Admin mint completed", {
        adminUserId,
        targetUserId: userId,
        amount,
        txHash: result.txHash,
      });

      res.json({
        success: true,
        data: {
          txHash: result.txHash,
          amount,
          userId,
          walletAddress: targetUser.walletAddress,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            message: "Datos de entrada inválidos",
            details: error.errors,
          },
        });
      } else {
        logger.error("Admin mint error:", error);
        res.status(500).json({
          success: false,
          error: { message: "Error al hacer mint de tokens" },
        });
      }
    }
  }
);

// POST /tokens/transfer
router.post(
  "/transfer",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { toUserId, amount } = z
        .object({
          toUserId: z.string().cuid("ID de usuario inválido"),
          amount: z.number().positive("Cantidad debe ser positiva"),
        })
        .parse(req.body);

      const fromUserId = req.user!.id;

      if (fromUserId === toUserId) {
        return res.status(400).json({
          success: false,
          error: { message: "No puedes transferir tokens a ti mismo" },
        });
      }

      const result = await TokenService.transferTokens(
        fromUserId,
        toUserId,
        amount
      );

      logger.info("Token transfer completed", {
        fromUserId,
        toUserId,
        amount,
        txHash: result.txHash,
      });

      res.json({
        success: true,
        data: {
          txHash: result.txHash,
          amount,
          fromUserId,
          toUserId,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            message: "Datos de entrada inválidos",
            details: error.errors,
          },
        });
      } else {
        logger.error("Transfer error:", error);
        res.status(500).json({
          success: false,
          error: { message: "Error al transferir tokens" },
        });
      }
    }
  }
);

// GET /tokens/history
router.get(
  "/history",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const [mints, total] = await Promise.all([
        prisma.mint.findMany({
          where: { userId },
          include: {
            order: {
              include: {
                product: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.mint.count({ where: { userId } }),
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          mints,
          pagination: {
            page,
            limit,
            total,
            totalPages,
          },
        },
      });
    } catch (error) {
      logger.error("Get mint history error:", error);
      res.status(500).json({
        success: false,
        error: { message: "Error al obtener historial de mints" },
      });
    }
  }
);

export default router;

