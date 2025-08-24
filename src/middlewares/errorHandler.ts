import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import logger from "../utils/logger";

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class CustomError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: Error | AppError | ZodError | Prisma.PrismaClientKnownRequestError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = "Error interno del servidor";
  let details: any = null;

  // Log the error
  logger.error("Error occurred:", {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    statusCode = 400;
    message = "Error de validación";
    details = error.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));
  }

  // Handle Prisma errors
  else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        statusCode = 409;
        message = "Conflicto: registro duplicado";
        break;
      case "P2025":
        statusCode = 404;
        message = "Registro no encontrado";
        break;
      case "P2003":
        statusCode = 400;
        message = "Error de referencia: registro relacionado no existe";
        break;
      default:
        statusCode = 400;
        message = "Error de base de datos";
    }
  }

  // Handle custom errors
  else if (error instanceof CustomError) {
    statusCode = error.statusCode;
    message = error.message;
  }

  // Handle JWT errors
  else if (error.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Token inválido";
  } else if (error.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expirado";
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(details && { details }),
      ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    },
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: {
      message: `Ruta no encontrada: ${req.method} ${req.url}`,
    },
  });
};

export default errorHandler;

