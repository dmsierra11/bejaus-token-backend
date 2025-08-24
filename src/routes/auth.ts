import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { loginSchema, registerSchema } from "../utils/validators";
import prisma from "../db/prisma";
import logger from "../utils/logger";
import { CustomError } from "../middlewares/errorHandler";

const router = Router();

// POST /auth/login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email } = loginSchema.parse(req.body);

    // Simulated login - in production you'd verify credentials
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Auto-create user for demo purposes
      user = await prisma.user.create({
        data: { email },
      });
      logger.info("New user auto-created", { email, userId: user.id });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET no configurado");
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    logger.info("User logged in", { email, userId: user.id });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          walletAddress: user.walletAddress,
        },
        token,
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
      logger.error("Login error:", error);
      res.status(500).json({
        success: false,
        error: { message: "Error interno del servidor" },
      });
    }
  }
});

// POST /auth/register
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, walletAddress } = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new CustomError("Usuario ya existe", 409);
    }

    // Create new user
    const user = await prisma.user.create({
      data: { email, walletAddress },
    });

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET no configurado");
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    logger.info("New user registered", { email, userId: user.id });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          walletAddress: user.walletAddress,
        },
        token,
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
    } else if (error instanceof CustomError) {
      res.status(error.statusCode).json({
        success: false,
        error: { message: error.message },
      });
    } else {
      logger.error("Registration error:", error);
      res.status(500).json({
        success: false,
        error: { message: "Error interno del servidor" },
      });
    }
  }
});

// GET /auth/me (get current user)
router.get("/me", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: { message: "Token de autorización requerido" },
      });
    }

    const token = authHeader.substring(7);

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET no configurado");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;

    if (!decoded.userId) {
      return res.status(401).json({
        success: false,
        error: { message: "Token inválido" },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        walletAddress: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: "Usuario no encontrado" },
      });
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: { message: "Token inválido" },
      });
    } else if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: { message: "Token expirado" },
      });
    } else {
      logger.error("Auth me error:", error);
      res.status(500).json({
        success: false,
        error: { message: "Error interno del servidor" },
      });
    }
  }
});

export default router;

