import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

import logger from "./utils/logger";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";

// Import routes
import authRoutes from "./routes/auth";
import paymentRoutes from "./routes/payments";
import tokenRoutes from "./routes/tokens";
import perkRoutes from "./routes/perks";
import voteRoutes from "./routes/votes";
import transparencyRoutes from "./routes/transparency";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: { message: "Demasiadas solicitudes, inténtalo más tarde" },
  },
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Bejaus Studio Token API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/tokens", tokenRoutes);
app.use("/api/perks", perkRoutes);
app.use("/api/votes", voteRoutes);
app.use("/api/transparency", transparencyRoutes);

// API documentation endpoint
app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "Bejaus Studio Token API",
    version: "1.0.0",
    endpoints: {
      auth: {
        "POST /login": "Iniciar sesión con email",
        "POST /register": "Registrar nuevo usuario",
        "GET /me": "Obtener usuario actual",
      },
      payments: {
        "POST /checkout": "Crear sesión de checkout Stripe",
        "POST /webhook": "Webhook de Stripe",
        "GET /orders": "Obtener órdenes del usuario",
        "GET /orders/:id": "Obtener orden específica",
      },
      tokens: {
        "GET /balance": "Obtener saldo de tokens",
        "GET /info": "Información del token",
        "POST /mint": "Mint de tokens (admin)",
        "POST /transfer": "Transferir tokens",
        "GET /history": "Historial de mints",
      },
      perks: {
        "GET /": "Listar perks disponibles",
        "GET /:id": "Obtener perk específico",
        "POST /claim": "Reclamar perk",
        "POST /redeem": "Canjear perk (staff)",
        "GET /my-claims": "Mis perks reclamados",
        "GET /claims": "Todos los claims (admin/staff)",
        "POST /": "Crear perk (admin)",
        "PUT /:id": "Actualizar perk (admin)",
        "DELETE /:id": "Eliminar perk (admin)",
      },
      votes: {
        "GET /": "Listar votaciones activas",
        "GET /:id": "Obtener votación específica",
        "POST /": "Crear votación (admin)",
        "POST /:id/ballot": "Emitir voto",
        "GET /:id/results": "Resultados de votación",
        "GET /my-votes": "Mis votos",
        "PUT /:id": "Actualizar votación (admin)",
        "DELETE /:id": "Eliminar votación (admin)",
        "POST /:id/options": "Agregar opción (admin)",
        "DELETE /options/:id": "Eliminar opción (admin)",
      },
      transparency: {
        "GET /summary": "Resumen del ledger",
        "GET /ledger": "Entradas del ledger",
        "GET /ledger/:kind": "Ledger por tipo",
        "GET /ledger/reference/:id": "Ledger por referencia",
        "GET /export/csv": "Exportar ledger a CSV",
        "GET /stats": "Estadísticas de transparencia",
        "GET /audit-trail": "Auditoría (admin)",
      },
    },
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Bejaus Studio Token API running on port ${PORT}`);
  logger.info(`📚 API Documentation: http://localhost:${PORT}/api`);
  logger.info(`🏥 Health Check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  process.exit(0);
});

export default app;

