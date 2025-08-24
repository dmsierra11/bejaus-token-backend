# Bejaus Token Project - Complete Setup Guide

This document provides an overview of the complete setup process for the Bejaus Token project, integrating PostgreSQL, JWT authentication, Stripe payments, and ThirdWeb blockchain functionality.

## 🎯 Project Overview

The Bejaus Token project is a comprehensive token management system that combines traditional web technologies with blockchain functionality. Users can purchase tokens using fiat currency (via Stripe), which are then minted on the blockchain (via ThirdWeb), all secured with JWT authentication and stored in a PostgreSQL database.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Blockchain    │
│   (React/Web)   │◄──►│   (Node.js)     │◄──►│   (Polygon)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   PostgreSQL    │
                       │   Database      │
                       └─────────────────┘
```

## 📚 Tutorials Overview

### 1. [PostgreSQL Setup](./01-postgresql-setup.md)
- **Purpose**: Database foundation for user data, orders, and transactions
- **Key Features**: User management, order tracking, payment history
- **Integration**: Used by all other services for data persistence

### 2. [JWT Authentication](./02-jwt-setup.md)
- **Purpose**: Secure user authentication and session management
- **Key Features**: Token-based auth, refresh tokens, password hashing
- **Integration**: Protects all API endpoints and user sessions

### 3. [Stripe Integration](./03-stripe-setup.md)
- **Purpose**: Process fiat currency payments for token purchases
- **Key Features**: Payment intents, webhooks, customer management
- **Integration**: Triggers token minting after successful payment

### 4. [ThirdWeb Blockchain](./04-thirdweb-setup.md)
- **Purpose**: Deploy and manage ERC20 tokens on Polygon network
- **Key Features**: Smart contracts, token minting, blockchain transactions
- **Integration**: Receives payment confirmations and mints tokens

## 🔄 Complete User Flow

### 1. User Registration & Authentication
```
User signs up → JWT tokens generated → User authenticated
```

### 2. Token Purchase Flow
```
User selects token package → Stripe payment → Webhook confirmation → Tokens minted on blockchain
```

### 3. Token Management
```
User views balance → Transfers tokens → Transaction recorded → Database updated
```

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 15+
- Stripe account
- ThirdWeb account
- Polygon wallet with MATIC for gas fees

### Installation Order
1. **Clone and setup project**
   ```bash
   git clone <your-repo>
   cd bejaus-token
   npm install
   ```

2. **Configure PostgreSQL** (see [PostgreSQL Setup](./01-postgresql-setup.md))
   ```bash
   # Follow PostgreSQL tutorial
   # Create database and user
   # Update .env with DATABASE_URL
   ```

3. **Setup JWT Authentication** (see [JWT Setup](./02-jwt-setup.md))
   ```bash
   # Install JWT dependencies
   npm install jsonwebtoken bcryptjs
   # Generate JWT secret
   # Update .env with JWT_SECRET
   ```

4. **Configure Stripe** (see [Stripe Setup](./03-stripe-setup.md))
   ```bash
   # Install Stripe SDK
   npm install stripe
   # Get API keys from Stripe dashboard
   # Update .env with Stripe credentials
   ```

5. **Setup ThirdWeb** (see [ThirdWeb Setup](./04-thirdweb-setup.md))
   ```bash
   # Install ThirdWeb SDK
   npm install @thirdweb-dev/sdk
   # Deploy smart contract
   # Update .env with contract address
   ```

6. **Initialize Database**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Run migrations
   npx prisma migrate dev --name init
   
   # Seed initial data (optional)
   npx prisma db seed
   ```

7. **Start Development Server**
   ```bash
   npm run dev
   ```

## 🔧 Environment Configuration

Create a `.env` file with all required variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/bejaus_token"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_EXPIRES_IN="7d"

# Stripe Payments
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_CURRENCY="eur"

# ThirdWeb Blockchain
THIRDWEB_CLIENT_ID="your_client_id"
THIRDWEB_SECRET_KEY="your_secret_key"
THIRDWEB_PRIVATE_KEY="0x..."
CONTRACT_ADDRESS="0x..."

# Blockchain Network
CHAIN_ID=137
RPC_URL="https://polygon-rpc.com"
EXPLORER_URL="https://polygonscan.com"

# Server Configuration
PORT=3000
NODE_ENV=development
```

## 🧪 Testing Your Setup

### 1. Database Connection
```bash
# Test database connection
npx prisma studio
```

### 2. JWT Authentication
```bash
# Test JWT functionality
node scripts/test-jwt.js
```

### 3. Stripe Integration
```bash
# Test webhook forwarding (local development)
stripe listen --forward-to localhost:3000/api/payments/webhook
```

### 4. ThirdWeb Contract
```bash
# Test contract connection
curl http://localhost:3000/api/tokens/contract-info
```

## 📊 Database Schema Overview

The project uses the following main entities:

- **Users**: Authentication and wallet addresses
- **Products**: Token packages and pricing
- **Orders**: Purchase transactions
- **Payments**: Stripe payment records
- **Mints**: Blockchain token minting records
- **Perks**: Token-gated benefits
- **Votes**: Governance mechanisms
- **Ledger**: Transaction audit trail

## 🔐 Security Considerations

### 1. Environment Variables
- Never commit `.env` files to version control
- Use different credentials for development/staging/production
- Rotate secrets regularly

### 2. API Security
- All endpoints require JWT authentication (except webhooks)
- Implement rate limiting for authentication endpoints
- Validate all input data

### 3. Blockchain Security
- Secure private key storage
- Use hardware wallets for production
- Implement proper access controls in smart contracts

### 4. Payment Security
- Verify Stripe webhook signatures
- Implement idempotency for webhook processing
- Monitor for suspicious payment patterns

## 🚀 Production Deployment

### 1. Environment Setup
- Use production database (managed PostgreSQL service)
- Switch to live Stripe keys
- Deploy to Polygon mainnet
- Use production JWT secrets

### 2. Infrastructure
- Use reverse proxy (nginx/Apache)
- Implement SSL/TLS encryption
- Set up monitoring and logging
- Configure automated backups

### 3. Monitoring
- Database performance monitoring
- API response time tracking
- Blockchain transaction monitoring
- Payment success rate tracking

## 🐛 Troubleshooting Common Issues

### 1. Database Connection Issues
- Check PostgreSQL service status
- Verify connection string format
- Ensure database user permissions

### 2. JWT Authentication Problems
- Verify JWT_SECRET environment variable
- Check token expiration settings
- Ensure proper token format in headers

### 3. Stripe Integration Issues
- Verify API key format and permissions
- Check webhook endpoint accessibility
- Ensure proper signature verification

### 4. ThirdWeb Blockchain Issues
- Verify contract deployment and address
- Check network configuration (testnet vs mainnet)
- Ensure sufficient gas fees

## 📈 Scaling Considerations

### 1. Database Scaling
- Implement connection pooling
- Use read replicas for heavy queries
- Consider database sharding for large datasets

### 2. API Scaling
- Implement caching (Redis)
- Use load balancers
- Consider microservices architecture

### 3. Blockchain Scaling
- Use Layer 2 solutions for high transaction volumes
- Implement batch processing for multiple operations
- Consider cross-chain bridges for multi-network support

## 🔗 Additional Resources

### Documentation
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [JWT.io](https://jwt.io/)
- [Stripe Documentation](https://stripe.com/docs)
- [ThirdWeb Documentation](https://portal.thirdweb.com/)

### Community & Support
- [GitHub Issues](https://github.com/your-repo/issues)
- [Discord Community](https://discord.gg/your-community)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/bejaus-token)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

---

## 🎉 Congratulations!

You've successfully set up a complete token management system with:
- ✅ Secure user authentication
- ✅ Fiat payment processing
- ✅ Blockchain token management
- ✅ Reliable data storage

Your Bejaus Token project is now ready for development and testing!
