import { Router, Request, Response } from "express";
import { z } from "zod";
import { paginationSchema, dateRangeSchema } from "../utils/validators";
import LedgerService from "../services/ledgerService";
import {
  authMiddleware,
  AuthenticatedRequest,
} from "../middlewares/authMiddleware";
import logger from "../utils/logger";

const router = Router();

// GET /transparency/summary
router.get("/summary", async (req: Request, res: Response) => {
  try {
    const dateRange = dateRangeSchema.parse(req.query);
    const summary = await LedgerService.getLedgerSummary(dateRange);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          message: "Parámetros de fecha inválidos",
          details: error.errors,
        },
      });
    } else {
      logger.error("Get transparency summary error:", error);
      res.status(500).json({
        success: false,
        error: { message: "Error al obtener resumen de transparencia" },
      });
    }
  }
});

// GET /transparency/ledger
router.get("/ledger", async (req: Request, res: Response) => {
  try {
    const pagination = paginationSchema.parse(req.query);
    const filters = {
      kind: req.query.kind as string,
      currency: req.query.currency as "EUR" | "TOKEN",
      direction: req.query.direction as "in" | "out",
      startDate: req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined,
      endDate: req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined,
    };

    const result = await LedgerService.getLedgerEntries(filters, pagination);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          message: "Parámetros de paginación inválidos",
          details: error.errors,
        },
      });
    } else {
      logger.error("Get ledger entries error:", error);
      res.status(500).json({
        success: false,
        error: { message: "Error al obtener entradas del ledger" },
      });
    }
  }
});

// GET /transparency/ledger/:kind
router.get("/ledger/:kind", async (req: Request, res: Response) => {
  try {
    const { kind } = req.params;
    const pagination = paginationSchema.parse(req.query);

    const result = await LedgerService.getLedgerByKind(kind, pagination);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          message: "Parámetros de paginación inválidos",
          details: error.errors,
        },
      });
    } else {
      logger.error("Get ledger by kind error:", error);
      res.status(500).json({
        success: false,
        error: { message: "Error al obtener ledger por tipo" },
      });
    }
  }
});

// GET /transparency/ledger/reference/:refId
router.get("/ledger/reference/:refId", async (req: Request, res: Response) => {
  try {
    const { refId } = req.params;
    const entries = await LedgerService.getLedgerByReference(refId);

    res.json({
      success: true,
      data: { entries },
    });
  } catch (error) {
    logger.error("Get ledger by reference error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Error al obtener ledger por referencia" },
    });
  }
});

// GET /transparency/export/csv
router.get("/export/csv", async (req: Request, res: Response) => {
  try {
    const dateRange = dateRangeSchema.parse(req.query);
    const csvContent = await LedgerService.exportLedgerCSV(dateRange);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=ledger.csv");
    res.send(csvContent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          message: "Parámetros de fecha inválidos",
          details: error.errors,
        },
      });
    } else {
      logger.error("Export ledger CSV error:", error);
      res.status(500).json({
        success: false,
        error: { message: "Error al exportar ledger a CSV" },
      });
    }
  }
});

// GET /transparency/stats
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const dateRange = dateRangeSchema.parse(req.query);

    // Get summary for stats
    const summary = await LedgerService.getLedgerSummary(dateRange);

    // Calculate additional stats
    const stats = {
      totalTransactions: summary.totalEntries,
      totalEurVolume: summary.eur.totalIn + summary.eur.totalOut,
      totalTokenVolume: summary.tokens.totalIn + summary.tokens.totalOut,
      netEurPosition: summary.eur.net,
      netTokenPosition: summary.tokens.net,
      activityBreakdown: summary.activityByKind,
      averageTransactionSize: {
        eur:
          summary.totalEntries > 0
            ? (summary.eur.totalIn + summary.eur.totalOut) /
              summary.totalEntries
            : 0,
        tokens:
          summary.totalEntries > 0
            ? (summary.tokens.totalIn + summary.tokens.totalOut) /
              summary.totalEntries
            : 0,
      },
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          message: "Parámetros de fecha inválidos",
          details: error.errors,
        },
      });
    } else {
      logger.error("Get transparency stats error:", error);
      res.status(500).json({
        success: false,
        error: { message: "Error al obtener estadísticas de transparencia" },
      });
    }
  }
});

// GET /transparency/audit-trail (admin only)
router.get(
  "/audit-trail",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
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

      const pagination = paginationSchema.parse(req.query);
      const filters = {
        startDate: req.query.startDate
          ? new Date(req.query.startDate as string)
          : undefined,
        endDate: req.query.endDate
          ? new Date(req.query.endDate as string)
          : undefined,
      };

      const result = await LedgerService.getLedgerEntries(filters, pagination);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            message: "Parámetros de paginación inválidos",
            details: error.errors,
          },
        });
      } else {
        logger.error("Get audit trail error:", error);
        res.status(500).json({
          success: false,
          error: { message: "Error al obtener auditoría" },
        });
      }
    }
  }
);

export default router;

