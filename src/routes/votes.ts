import { Router, Request, Response } from "express";
import { z } from "zod";
import { createVoteSchema, castBallotSchema } from "../utils/validators";
import VoteService from "../services/voteService";
import {
  authMiddleware,
  AuthenticatedRequest,
} from "../middlewares/authMiddleware";
import logger from "../utils/logger";

const router = Router();

// GET /votes
router.get("/", async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.active !== "false";
    const votes = await VoteService.getVotes(activeOnly);

    res.json({
      success: true,
      data: { votes },
    });
  } catch (error) {
    logger.error("Get votes error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Error al obtener votaciones" },
    });
  }
});

// GET /votes/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const vote = await VoteService.getVoteById(id);

    res.json({
      success: true,
      data: { vote },
    });
  } catch (error) {
    logger.error("Get vote by ID error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Error al obtener votación" },
    });
  }
});

// POST /votes (admin only)
router.post(
  "/",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = createVoteSchema.parse(req.body);
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

      const vote = await VoteService.createVote(data);

      res.status(201).json({
        success: true,
        data: { vote },
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
        logger.error("Create vote error:", error);
        res.status(500).json({
          success: false,
          error: { message: "Error al crear votación" },
        });
      }
    }
  }
);

// POST /votes/:id/ballot
router.post(
  "/:id/ballot",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id: voteId } = req.params;
      const { optionId } = castBallotSchema.parse(req.body);
      const userId = req.user!.id;

      const ballot = await VoteService.castBallot(voteId, userId, { optionId });

      res.json({
        success: true,
        data: { ballot },
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
        logger.error("Cast ballot error:", error);
        res.status(500).json({
          success: false,
          error: { message: "Error al emitir voto" },
        });
      }
    }
  }
);

// GET /votes/:id/results
router.get("/:id/results", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const results = await VoteService.getVoteResults(id);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error("Get vote results error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Error al obtener resultados de la votación" },
    });
  }
});

// GET /votes/my-votes
router.get(
  "/my-votes",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const ballots = await VoteService.getUserVotes(userId);

      res.json({
        success: true,
        data: { ballots },
      });
    } catch (error) {
      logger.error("Get user votes error:", error);
      res.status(500).json({
        success: false,
        error: { message: "Error al obtener votos del usuario" },
      });
    }
  }
);

// PUT /votes/:id (admin only)
router.put(
  "/:id",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = createVoteSchema.partial().parse(req.body);
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

      const vote = await VoteService.updateVote(id, data);

      res.json({
        success: true,
        data: { vote },
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
        logger.error("Update vote error:", error);
        res.status(500).json({
          success: false,
          error: { message: "Error al actualizar votación" },
        });
      }
    }
  }
);

// DELETE /votes/:id (admin only)
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

      await VoteService.deleteVote(id);

      res.json({
        success: true,
        message: "Votación eliminada correctamente",
      });
    } catch (error) {
      logger.error("Delete vote error:", error);
      res.status(500).json({
        success: false,
        error: { message: "Error al eliminar votación" },
      });
    }
  }
);

// POST /votes/:id/options (admin only)
router.post(
  "/:id/options",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id: voteId } = req.params;
      const { label } = z
        .object({
          label: z.string().min(1, "Etiqueta requerida"),
        })
        .parse(req.body);
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

      const option = await VoteService.addVoteOption(voteId, label);

      res.status(201).json({
        success: true,
        data: { option },
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
        logger.error("Add vote option error:", error);
        res.status(500).json({
          success: false,
          error: { message: "Error al agregar opción de voto" },
        });
      }
    }
  }
);

// DELETE /votes/options/:optionId (admin only)
router.delete(
  "/options/:optionId",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { optionId } = req.params;
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

      await VoteService.removeVoteOption(optionId);

      res.json({
        success: true,
        message: "Opción de voto eliminada correctamente",
      });
    } catch (error) {
      logger.error("Remove vote option error:", error);
      res.status(500).json({
        success: false,
        error: { message: "Error al eliminar opción de voto" },
      });
    }
  }
);

export default router;

