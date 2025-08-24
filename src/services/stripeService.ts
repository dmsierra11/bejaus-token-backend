import Stripe from "stripe";
import { CustomError } from "../middlewares/errorHandler";
import logger from "../utils/logger";
import prisma from "../db/prisma";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY no configurado");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export class StripeService {
  static async createCheckoutSession(
    productId: string,
    userId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<Stripe.Checkout.Session> {
    try {
      // Get product details
      const product = await prisma.product.findUnique({
        where: { id: productId, active: true },
      });

      if (!product) {
        throw new CustomError("Producto no encontrado o inactivo", 404);
      }

      // Create order
      const order = await prisma.order.create({
        data: {
          userId,
          productId,
          status: "pending",
        },
      });

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: product.name,
                description: `${product.tokenAmount} tokens`,
              },
              unit_amount: Math.round(product.priceEur * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        metadata: {
          orderId: order.id,
          userId,
          productId,
          tokenAmount: product.tokenAmount.toString(),
        },
      });

      logger.info("Checkout session created", {
        sessionId: session.id,
        orderId: order.id,
        userId,
      });

      return session;
    } catch (error) {
      logger.error("Error creating checkout session:", error);
      throw error;
    }
  }

  static async handleWebhook(
    payload: string,
    signature: string
  ): Promise<void> {
    try {
      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        throw new Error("STRIPE_WEBHOOK_SECRET no configurado");
      }

      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      logger.info("Webhook received:", { type: event.type });

      switch (event.type) {
        case "checkout.session.completed":
          await this.handleCheckoutCompleted(
            event.data.object as Stripe.Checkout.Session
          );
          break;
        case "payment_intent.succeeded":
          await this.handlePaymentSucceeded(
            event.data.object as Stripe.PaymentIntent
          );
          break;
        case "payment_intent.payment_failed":
          await this.handlePaymentFailed(
            event.data.object as Stripe.PaymentIntent
          );
          break;
        default:
          logger.info(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      logger.error("Webhook error:", error);
      throw error;
    }
  }

  private static async handleCheckoutCompleted(
    session: Stripe.Checkout.Session
  ): Promise<void> {
    const { orderId, userId, productId, tokenAmount } = session.metadata || {};

    if (!orderId || !userId || !productId || !tokenAmount) {
      throw new Error("Metadata incompleta en la sesión de Stripe");
    }

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "completed" },
    });

    // Create payment record
    await prisma.payment.create({
      data: {
        orderId,
        provider: "stripe",
        amountEur: session.amount_total ? session.amount_total / 100 : 0,
        status: "completed",
      },
    });

    logger.info("Checkout completed", {
      orderId,
      userId,
      sessionId: session.id,
    });
  }

  private static async handlePaymentSucceeded(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    logger.info("Payment succeeded", {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
    });
  }

  private static async handlePaymentFailed(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    logger.warn("Payment failed", {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      lastPaymentError: paymentIntent.last_payment_error,
    });
  }
}

export default StripeService;

