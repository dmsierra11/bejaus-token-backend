import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { CustomError } from "./errorHandler";
import prisma from "../db/prisma";
import logger from "../utils/logger";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    walletAddress?: string;
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new CustomError("Token de autorización requerido", 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!process.env.JWT_SECRET) {
      logger.error("JWT_SECRET no configurado");
      throw new CustomError("Error de configuración del servidor", 500);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;

    if (!decoded.userId) {
      throw new CustomError("Token inválido", 401);
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        walletAddress: true,
      },
    });

    if (!user) {
      throw new CustomError("Usuario no encontrado", 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof CustomError) {
      next(error);
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new CustomError("Token inválido", 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new CustomError("Token expirado", 401));
    } else {
      logger.error("Error en middleware de autenticación:", error);
      next(new CustomError("Error de autenticación", 500));
    }
  }
};

export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(); // Continue without user
    }

    const token = authHeader.substring(7);

    if (!process.env.JWT_SECRET) {
      return next(); // Continue without user
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;

    if (!decoded.userId) {
      return next(); // Continue without user
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        walletAddress: true,
      },
    });

    if (user) {
      req.user = user;
    }

    next();
  } catch (error) {
    // Silently continue without user for optional auth
    next();
  }
};

export default authMiddleware;

