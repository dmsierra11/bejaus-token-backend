import { Router, Request, Response } from "express";
import { z } from "zod";
import { checkoutSchema } from "../utils/validators";
import StripeService from "../services/stripeService";
import {
  authMiddleware,
  AuthenticatedRequest,
} from "../middlewares/authMiddleware";
import logger from "../utils/logger";

const router = Router();

// POST /payments/checkout
router.post(
  "/checkout",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { productId } = checkoutSchema.parse(req.body);
      const userId = req.user!.id;

      // Create Stripe checkout session
      const session = await StripeService.createCheckoutSession(
        productId,
        userId,
        `${process.env.FRONTEND_URL || "http://localhost:3000"}/success`,
        `${process.env.FRONTEND_URL || "http://localhost:3000"}/cancel`
      );

      res.json({
        success: true,
        data: {
          sessionId: session.id,
          checkoutUrl: session.url,
        },
      });
    } catch (error) {
      logger.error("Checkout error:", error);
      res.status(500).json({
        success: false,
        error: { message: "Error al crear sesión de checkout" },
      });
    }
  }
);

// POST /payments/webhook (Stripe webhook)
router.post("/webhook", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["stripe-signature"] as string;

    if (!signature) {
      return res.status(400).json({
        success: false,
        error: { message: "Firma de webhook requerida" },
      });
    }

    // Get raw body for webhook verification
    const rawBody = req.body;

    // Handle webhook
    await StripeService.handleWebhook(JSON.stringify(rawBody), signature);

    res.json({ success: true });
  } catch (error) {
    logger.error("Webhook error:", error);
    res.status(400).json({
      success: false,
      error: { message: "Error en webhook" },
    });
  }
});

// GET /payments/orders/:orderId
router.get(
  "/orders/:orderId",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orderId } = req.params;
      const userId = req.user!.id;

      // Get order details
      const order = await prisma.order.findFirst({
        where: { id: orderId, userId },
        include: {
          product: true,
          payments: true,
          mints: true,
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          error: { message: "Orden no encontrada" },
        });
      }

      res.json({
        success: true,
        data: { order },
      });
    } catch (error) {
      logger.error("Get order error:", error);
      res.status(500).json({
        success: false,
        error: { message: "Error al obtener orden" },
      });
    }
  }
);

// GET /payments/orders (user orders)
router.get(
  "/orders",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where: { userId },
          include: {
            product: true,
            payments: true,
            mints: true,
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.order.count({ where: { userId } }),
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          orders,
          pagination: {
            page,
            limit,
            total,
            totalPages,
          },
        },
      });
    } catch (error) {
      logger.error("Get orders error:", error);
      res.status(500).json({
        success: false,
        error: { message: "Error al obtener órdenes" },
      });
    }
  }
);

export default router;

