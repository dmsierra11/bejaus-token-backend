import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  claimPerkSchema,
  redeemPerkSchema,
  createPerkSchema,
} from "../utils/validators";
import PerkService from "../services/perkService";
import {
  authMiddleware,
  AuthenticatedRequest,
} from "../middlewares/authMiddleware";
import logger from "../utils/logger";

const router = Router();

// GET /perks
router.get("/", async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.active !== "false";
    const perks = await PerkService.getPerks(activeOnly);

    res.json({
      success: true,
      data: { perks },
    });
  } catch (error) {
    logger.error("Get perks error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Error al obtener perks" },
    });
  }
});

// GET /perks/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const perk = await PerkService.getPerkById(id);

    res.json({
      success: true,
      data: { perk },
    });
  } catch (error) {
    logger.error("Get perk by ID error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Error al obtener perk" },
    });
  }
});

// POST /perks/claim
router.post(
  "/claim",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { perkId } = claimPerkSchema.parse(req.body);
      const userId = req.user!.id;

      const claim = await PerkService.claimPerk(perkId, userId);

      res.json({
        success: true,
        data: { claim },
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
        logger.error("Claim perk error:", error);
        res.status(500).json({
          success: false,
          error: { message: "Error al reclamar perk" },
        });
      }
    }
  }
);

// POST /perks/redeem (staff only)
router.post(
  "/redeem",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { claimId } = redeemPerkSchema.parse(req.body);
      const staffUserId = req.user!.id;

      // Check if staff user has permission (simplified check)
      const staffUser = await prisma.user.findUnique({
        where: { id: staffUserId },
        select: { email: true },
      });

      if (!staffUser?.email?.includes("staff")) {
        return res.status(403).json({
          success: false,
          error: { message: "Acceso denegado: se requieren permisos de staff" },
        });
      }

      const claim = await PerkService.redeemPerk(claimId, staffUserId);

      res.json({
        success: true,
        data: { claim },
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
        logger.error("Redeem perk error:", error);
        res.status(500).json({
          success: false,
          error: { message: "Error al canjear perk" },
        });
      }
    }
  }
);

// GET /perks/my-claims
router.get(
  "/my-claims",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const claims = await PerkService.getUserPerks(userId);

      res.json({
        success: true,
        data: { claims },
      });
    } catch (error) {
      logger.error("Get user perks error:", error);
      res.status(500).json({
        success: false,
        error: { message: "Error al obtener perks del usuario" },
      });
    }
  }
);

// GET /perks/claims (admin/staff only)
router.get(
  "/claims",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const perkId = req.query.perkId as string;

      // Check if user has permission (simplified check)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (!user?.email?.includes("admin") && !user?.email?.includes("staff")) {
        return res.status(403).json({
          success: false,
          error: {
            message:
              "Acceso denegado: se requieren permisos de administrador o staff",
          },
        });
      }

      const claims = await PerkService.getPerkClaims(perkId);

      res.json({
        success: true,
        data: { claims },
      });
    } catch (error) {
      logger.error("Get perk claims error:", error);
      res.status(500).json({
        success: false,
        error: { message: "Error al obtener claims de perks" },
      });
    }
  }
);

// POST /perks (admin only)
router.post(
  "/",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = createPerkSchema.parse(req.body);
      const adminUserId = req.user!.id;

      // Check if admin user has permission (simplified check)
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

      const perk = await PerkService.createPerk(data);

      res.status(201).json({
        success: true,
        data: { perk },
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
        logger.error("Create perk error:", error);
        res.status(500).json({
          success: false,
          error: { message: "Error al crear perk" },
        });
      }
    }
  }
);

// PUT /perks/:id (admin only)
router.put(
  "/:id",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = createPerkSchema.partial().parse(req.body);
      const adminUserId = req.user!.id;

      // Check if admin user has permission (simplified check)
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

      const perk = await PerkService.updatePerk(id, data);

      res.json({
        success: true,
        data: { perk },
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
        logger.error("Update perk error:", error);
        res.status(500).json({
          success: false,
          error: { message: "Error al actualizar perk" },
        });
      }
    }
  }
);

// DELETE /perks/:id (admin only)
router.delete(
  "/:id",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const adminUserId = req.user!.id;

      // Check if admin user has permission (simplified check)
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

      await PerkService.deletePerk(id);

      res.json({
        success: true,
        message: "Perk eliminado correctamente",
      });
    } catch (error) {
      logger.error("Delete perk error:", error);
      res.status(500).json({
        success: false,
        error: { message: "Error al eliminar perk" },
      });
    }
  }
);

export default router;

