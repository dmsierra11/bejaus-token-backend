# Stripe Setup Tutorial

This tutorial will guide you through setting up Stripe for payment processing in the Bejaus Token project.

## Prerequisites

- Stripe account (sign up at [stripe.com](https://stripe.com))
- Node.js and npm installed
- PostgreSQL configured (see [PostgreSQL Setup](./01-postgresql-setup.md))
- JWT authentication configured (see [JWT Setup](./02-jwt-setup.md))

## Step 1: Install Stripe Dependencies

```bash
# Install Stripe SDK
npm install stripe
npm install --save-dev @types/stripe
```

## Step 2: Set Up Stripe Account

### 1. Create Stripe Account
1. Go to [stripe.com](https://stripe.com) and sign up
2. Complete account verification (business details, bank account, etc.)
3. Switch between test and live modes as needed

### 2. Get API Keys
1. Navigate to **Developers > API keys** in your Stripe dashboard
2. Copy your **Publishable key** and **Secret key**
3. For webhooks, note your **Webhook signing secret**

## Step 3: Configure Environment Variables

Update your `.env` file with Stripe credentials:

```env
# Stripe Configuration
STRIPE_SECRET_KEY="sk_test_..." # Test key for development
STRIPE_PUBLISHABLE_KEY="pk_test_..." # Test key for development
STRIPE_WEBHOOK_SECRET="whsec_..." # Webhook signing secret
STRIPE_CURRENCY="eur" # Default currency
STRIPE_PAYMENT_METHODS="card,sepa_debit" # Supported payment methods
```

## Step 4: Create Stripe Service

Create `src/services/stripeService.ts`:

```typescript
import Stripe from 'stripe';
import { logger } from '../utils/logger';

export interface CreatePaymentIntentParams {
  amount: number; // Amount in cents
  currency: string;
  customerId?: string;
  metadata?: Record<string, string>;
  paymentMethodTypes?: string[];
}

export interface CreateCustomerParams {
  email: string;
  name?: string;
  walletAddress?: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: string;
}

export class StripeService {
  private stripe: Stripe;
  private webhookSecret: string;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is required');
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16', // Use latest stable API version
    });
    this.webhookSecret = webhookSecret;
  }

  /**
   * Create a payment intent for token purchases
   */
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: params.amount,
        currency: params.currency,
        customer: params.customerId,
        metadata: params.metadata,
        payment_method_types: params.paymentMethodTypes || ['card'],
        automatic_payment_methods: {
          enabled: true,
        },
        description: 'Bejaus Token Purchase',
      });

      logger.info(`Payment intent created: ${paymentIntent.id}`);

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
      };
    } catch (error) {
      logger.error('Failed to create payment intent:', error);
      throw new Error('Failed to create payment intent');
    }
  }

  /**
   * Create or retrieve a Stripe customer
   */
  async createOrRetrieveCustomer(params: CreateCustomerParams): Promise<Stripe.Customer> {
    try {
      // First, try to find existing customer by email
      const existingCustomers = await this.stripe.customers.list({
        email: params.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        const customer = existingCustomers.data[0];
        
        // Update customer with new metadata if needed
        if (params.walletAddress && customer.metadata.walletAddress !== params.walletAddress) {
          await this.stripe.customers.update(customer.id, {
            metadata: {
              ...customer.metadata,
              walletAddress: params.walletAddress,
            },
          });
        }
        
        return customer;
      }

      // Create new customer
      const customer = await this.stripe.customers.create({
        email: params.email,
        name: params.name,
        metadata: {
          walletAddress: params.walletAddress,
          ...params.metadata,
        },
      });

      logger.info(`Customer created: ${customer.id}`);
      return customer;
    } catch (error) {
      logger.error('Failed to create/retrieve customer:', error);
      throw new Error('Failed to create/retrieve customer');
    }
  }

  /**
   * Retrieve payment intent details
   */
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      logger.error(`Failed to retrieve payment intent ${paymentIntentId}:`, error);
      throw new Error('Failed to retrieve payment intent');
    }
  }

  /**
   * Confirm payment intent
   */
  async confirmPaymentIntent(paymentIntentId: string, paymentMethodId: string): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
      });
    } catch (error) {
      logger.error(`Failed to confirm payment intent ${paymentIntentId}:`, error);
      throw new Error('Failed to confirm payment intent');
    }
  }

  /**
   * Cancel payment intent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.cancel(paymentIntentId);
    } catch (error) {
      logger.error(`Failed to cancel payment intent ${paymentIntentId}:`, error);
      throw new Error('Failed to cancel payment intent');
    }
  }

  /**
   * Process webhook events
   */
  async processWebhook(payload: string, signature: string): Promise<Stripe.Event> {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );

      logger.info(`Webhook processed: ${event.type}`);

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
          break;
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;
        default:
          logger.info(`Unhandled event type: ${event.type}`);
      }

      return event;
    } catch (error) {
      logger.error('Webhook signature verification failed:', error);
      throw new Error('Webhook signature verification failed');
    }
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      // TODO: Implement your business logic here
      // - Update order status in database
      // - Mint tokens to user's wallet
      // - Send confirmation email
      // - Update ledger

      logger.info(`Payment succeeded: ${paymentIntent.id}`);
    } catch (error) {
      logger.error('Failed to handle payment success:', error);
    }
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      // TODO: Implement your business logic here
      // - Update order status in database
      // - Send failure notification
      // - Log failure reason

      logger.info(`Payment failed: ${paymentIntent.id}`);
    } catch (error) {
      logger.error('Failed to handle payment failure:', error);
    }
  }

  /**
   * Handle subscription creation
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    try {
      // TODO: Implement your business logic here
      // - Create recurring token allocation
      // - Update user subscription status

      logger.info(`Subscription created: ${subscription.id}`);
    } catch (error) {
      logger.error('Failed to handle subscription creation:', error);
    }
  }

  /**
   * Get supported payment methods
   */
  getSupportedPaymentMethods(): string[] {
    const methods = process.env.STRIPE_PAYMENT_METHODS;
    return methods ? methods.split(',') : ['card'];
  }

  /**
   * Get default currency
   */
  getDefaultCurrency(): string {
    return process.env.STRIPE_CURRENCY || 'eur';
  }
}

// Export singleton instance
export const stripeService = new StripeService();
```

## Step 5: Update Payment Routes

Update `src/routes/payments.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { stripeService } from '../services/stripeService';
import { authenticateToken } from '../middlewares/authMiddleware';
import { logger } from '../utils/logger';

const router = Router();

// Create payment intent
router.post('/create-payment-intent', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { amount, currency, productId } = req.body;
    const userId = req.user!.userId;

    if (!amount || !currency) {
      return res.status(400).json({ error: 'Amount and currency are required' });
    }

    // Convert amount to cents (Stripe expects amounts in smallest currency unit)
    const amountInCents = Math.round(amount * 100);

    const paymentIntent = await stripeService.createPaymentIntent({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      metadata: {
        userId,
        productId,
        orderType: 'token_purchase',
      },
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.clientSecret,
      paymentIntentId: paymentIntent.paymentIntentId,
    });
  } catch (error) {
    logger.error('Failed to create payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Confirm payment
router.post('/confirm-payment', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { paymentIntentId, paymentMethodId } = req.body;

    if (!paymentIntentId || !paymentMethodId) {
      return res.status(400).json({ error: 'Payment intent ID and payment method ID are required' });
    }

    const paymentIntent = await stripeService.confirmPaymentIntent(paymentIntentId, paymentMethodId);

    res.json({
      success: true,
      status: paymentIntent.status,
      paymentIntent,
    });
  } catch (error) {
    logger.error('Failed to confirm payment:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// Get payment status
router.get('/payment-status/:paymentIntentId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { paymentIntentId } = req.params;
    const paymentIntent = await stripeService.getPaymentIntent(paymentIntentId);

    res.json({
      success: true,
      paymentIntent,
    });
  } catch (error) {
    logger.error('Failed to get payment status:', error);
    res.status(500).json({ error: 'Failed to get payment status' });
  }
});

// Cancel payment
router.post('/cancel-payment', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Payment intent ID is required' });
    }

    const paymentIntent = await stripeService.cancelPaymentIntent(paymentIntentId);

    res.json({
      success: true,
      status: paymentIntent.status,
    });
  } catch (error) {
    logger.error('Failed to cancel payment:', error);
    res.status(500).json({ error: 'Failed to cancel payment' });
  }
});

// Webhook endpoint (no authentication required)
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    
    if (!signature) {
      return res.status(400).json({ error: 'Stripe signature is required' });
    }

    const event = await stripeService.processWebhook(
      JSON.stringify(req.body),
      signature
    );

    res.json({ received: true, eventType: event.type });
  } catch (error) {
    logger.error('Webhook processing failed:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

export default router;
```

## Step 6: Set Up Webhook Endpoint

### 1. Configure Webhook in Stripe Dashboard
1. Go to **Developers > Webhooks** in your Stripe dashboard
2. Click **Add endpoint**
3. Set endpoint URL: `https://yourdomain.com/api/payments/webhook`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the webhook signing secret to your `.env` file

### 2. Test Webhook Locally
Use Stripe CLI for local testing:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/payments/webhook
```

## Step 7: Frontend Integration

### 1. Install Stripe.js
```html
<script src="https://js.stripe.com/v3/"></script>
```

### 2. Initialize Stripe
```javascript
const stripe = Stripe('pk_test_your_publishable_key');
```

### 3. Create Payment Form
```javascript
// Create payment intent
const response = await fetch('/api/payments/create-payment-intent', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
    amount: 50.00, // €50.00
    currency: 'eur',
    productId: 'product-123',
  }),
});

const { clientSecret } = await response.json();

// Confirm payment
const { error } = await stripe.confirmCardPayment(clientSecret, {
  payment_method: {
    card: cardElement,
    billing_details: {
      name: 'Customer Name',
      email: 'customer@example.com',
    },
  },
});

if (error) {
  console.error('Payment failed:', error);
} else {
  console.log('Payment successful!');
}
```

## Step 8: Testing

### 1. Test Cards
Use these test card numbers:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

### 2. Test Scenarios
- Successful payment
- Failed payment
- 3D Secure authentication
- Webhook processing
- Customer creation

## Step 9: Security Best Practices

### 1. API Key Security
- Never expose secret keys in frontend code
- Use environment variables for all sensitive data
- Rotate keys regularly
- Use different keys for test and production

### 2. Webhook Security
- Always verify webhook signatures
- Use HTTPS for webhook endpoints
- Implement idempotency for webhook processing
- Log all webhook events

### 3. Payment Security
- Validate payment amounts server-side
- Implement proper error handling
- Use strong authentication for payment endpoints
- Monitor for suspicious activity

## Step 10: Production Considerations

### 1. Environment Setup
```env
# Production Stripe settings
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NODE_ENV="production"
```

### 2. Monitoring
- Set up Stripe dashboard alerts
- Monitor webhook delivery
- Track payment success/failure rates
- Set up error logging and alerting

### 3. Compliance
- Ensure PCI compliance
- Implement proper data retention policies
- Follow GDPR requirements
- Regular security audits

## Troubleshooting

### Common Issues

1. **"Invalid API key" errors**
   - Check STRIPE_SECRET_KEY environment variable
   - Ensure you're using the correct test/live key
   - Verify key format and permissions

2. **Webhook signature verification fails**
   - Check STRIPE_WEBHOOK_SECRET
   - Ensure webhook endpoint is accessible
   - Verify webhook configuration in Stripe dashboard

3. **Payment confirmation fails**
   - Check payment method configuration
   - Verify 3D Secure setup
   - Check Stripe dashboard for error details

## Next Steps

Once Stripe is configured, proceed to:
- [ThirdWeb Configuration](./04-thirdweb-setup.md)

## Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe Security](https://stripe.com/docs/security)
