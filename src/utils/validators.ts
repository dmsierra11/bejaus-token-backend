import { z } from "zod";

// Auth validators
export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
});

export const registerSchema = z.object({
  email: z.string().email("Email inválido"),
  walletAddress: z.string().optional(),
});

// Payment validators
export const checkoutSchema = z.object({
  productId: z.string().cuid("ID de producto inválido"),
});

// Perk validators
export const claimPerkSchema = z.object({
  perkId: z.string().cuid("ID de perk inválido"),
});

export const redeemPerkSchema = z.object({
  claimId: z.string().cuid("ID de claim inválido"),
});

// Vote validators
export const createVoteSchema = z.object({
  title: z.string().min(1, "Título requerido"),
  description: z.string().optional(),
  startAt: z.string().datetime("Fecha de inicio inválida"),
  endAt: z.string().datetime("Fecha de fin inválida"),
  options: z
    .array(z.string().min(1, "Opción requerida"))
    .min(2, "Mínimo 2 opciones"),
});

export const castBallotSchema = z.object({
  optionId: z.string().cuid("ID de opción inválido"),
});

// Admin validators
export const mintTokensSchema = z.object({
  userId: z.string().cuid("ID de usuario inválido"),
  amount: z.number().positive("Cantidad debe ser positiva"),
});

export const createProductSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  tokenAmount: z.number().positive("Cantidad de tokens debe ser positiva"),
  priceEur: z.number().positive("Precio debe ser positivo"),
  active: z.boolean().default(true),
});

export const createPerkSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  tokenCost: z.number().positive("Costo en tokens debe ser positivo"),
  type: z.enum(["physical", "digital", "experience"], {
    errorMap: () => ({
      message: "Tipo debe ser physical, digital o experience",
    }),
  }),
  metadataJson: z.string().optional(),
  active: z.boolean().default(true),
});

// Query validators
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ClaimPerkInput = z.infer<typeof claimPerkSchema>;
export type RedeemPerkInput = z.infer<typeof redeemPerkSchema>;
export type CreateVoteInput = z.infer<typeof createVoteSchema>;
export type CastBallotInput = z.infer<typeof castBallotSchema>;
export type MintTokensInput = z.infer<typeof mintTokensSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type CreatePerkInput = z.infer<typeof createPerkSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;

