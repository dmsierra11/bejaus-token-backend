# JWT (JSON Web Token) Setup Tutorial

This tutorial will guide you through setting up JWT authentication for the Bejaus Token project.

## Prerequisites

- Node.js and npm installed
- PostgreSQL configured (see [PostgreSQL Setup](./01-postgresql-setup.md))
- Basic understanding of authentication concepts

## Step 1: Install Required Dependencies

```bash
# Install JWT-related packages
npm install jsonwebtoken bcryptjs
npm install --save-dev @types/jsonwebtoken @types/bcryptjs
```

## Step 2: Generate JWT Secret

### Option 1: Generate a Strong Secret (Recommended)

```bash
# Generate a secure random string
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Option 2: Use a Predefined Secret (Development Only)

```bash
# For development, you can use a simple secret
echo "bejaus-super-secret-jwt-key-$(date +%s)" | openssl dgst -sha256
```

## Step 3: Configure Environment Variables

Update your `.env` file with the JWT secret:

```env
# JWT Configuration
JWT_SECRET="your-generated-secret-here"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_EXPIRES_IN="7d"
```

## Step 4: Create JWT Utility Functions

Create a new file `src/utils/jwt.ts`:

```typescript
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export interface JWTPayload {
  userId: string;
  email: string;
  walletAddress?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class JWTService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET!;
  private static readonly ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
  private static readonly REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  /**
   * Generate access and refresh tokens
   */
  static generateTokens(payload: JWTPayload): TokenPair {
    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
      issuer: 'bejaus-token',
      audience: 'bejaus-users'
    });

    const refreshToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
      issuer: 'bejaus-token',
      audience: 'bejaus-users'
    });

    return { accessToken, refreshToken };
  }

  /**
   * Verify and decode JWT token
   */
  static verifyToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET, {
        issuer: 'bejaus-token',
        audience: 'bejaus-users'
      }) as JWTPayload;
      
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static refreshAccessToken(refreshToken: string): string {
    try {
      const decoded = jwt.verify(refreshToken, this.JWT_SECRET, {
        issuer: 'bejaus-token',
        audience: 'bejaus-users'
      }) as JWTPayload;

      return jwt.sign(decoded, this.JWT_SECRET, {
        expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
        issuer: 'bejaus-token',
        audience: 'bejaus-users'
      });
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}
```

## Step 5: Update Authentication Middleware

Update `src/middlewares/authMiddleware.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { JWTService, JWTPayload } from '../utils/jwt';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTService.extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const decoded = JWTService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const authenticateRefreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    const decoded = JWTService.verifyToken(refreshToken);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid refresh token' });
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTService.extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = JWTService.verifyToken(token);
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};
```

## Step 6: Update Authentication Routes

Update `src/routes/auth.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { JWTService } from '../utils/jwt';
import { authenticateToken, authenticateRefreshToken } from '../middlewares/authMiddleware';

const router = Router();

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // TODO: Implement user authentication logic
    // This should verify credentials against your database
    
    // For now, we'll create a mock user
    const mockUser = {
      userId: 'user-123',
      email: email,
      walletAddress: null
    };

    const tokens = JWTService.generateTokens(mockUser);

    res.json({
      success: true,
      user: mockUser,
      ...tokens
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Refresh token endpoint
router.post('/refresh', authenticateRefreshToken, async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    const newAccessToken = JWTService.refreshAccessToken(refreshToken);

    res.json({
      success: true,
      accessToken: newAccessToken
    });
  } catch (error) {
    res.status(403).json({ error: 'Token refresh failed' });
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    // TODO: Implement token blacklisting if needed
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Verify token endpoint
router.get('/verify', authenticateToken, async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    res.status(403).json({ error: 'Token verification failed' });
  }
});

export default router;
```

## Step 7: Test JWT Authentication

Create a test script `scripts/test-jwt.js`:

```javascript
const jwt = require('jsonwebtoken');

// Test JWT functionality
const testPayload = {
  userId: 'test-user-123',
  email: 'test@example.com',
  walletAddress: '0x1234567890abcdef'
};

const secret = 'your-test-secret';
const token = jwt.sign(testPayload, secret, { expiresIn: '1h' });

console.log('Generated Token:', token);

try {
  const decoded = jwt.verify(token, secret);
  console.log('Decoded Token:', decoded);
} catch (error) {
  console.error('Token verification failed:', error.message);
}
```

Run the test:

```bash
node scripts/test-jwt.js
```

## Step 8: Security Best Practices

### 1. Token Storage
- **Frontend**: Store tokens in memory or secure HTTP-only cookies
- **Mobile**: Use secure storage (Keychain for iOS, Keystore for Android)
- **Never store in localStorage** (vulnerable to XSS attacks)

### 2. Token Expiration
- **Access tokens**: Short-lived (15 minutes to 1 hour)
- **Refresh tokens**: Longer-lived (7 days to 30 days)
- **Implement automatic refresh** before expiration

### 3. Token Rotation
- Rotate refresh tokens on each use
- Implement token blacklisting for compromised tokens
- Use Redis or database for token storage in production

### 4. HTTPS Only
- Always use HTTPS in production
- Set `secure: true` for cookies
- Implement HSTS headers

## Step 9: Production Considerations

### 1. Environment Variables
```env
# Production JWT settings
JWT_SECRET="your-super-secure-production-secret"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
NODE_ENV="production"
```

### 2. Rate Limiting
Implement rate limiting for authentication endpoints:

```typescript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts'
});

router.use('/login', authLimiter);
```

### 3. Monitoring and Logging
- Log authentication attempts
- Monitor token usage patterns
- Set up alerts for suspicious activity

## Troubleshooting

### Common Issues

1. **"Invalid token" errors**
   - Check JWT_SECRET environment variable
   - Verify token format and expiration
   - Ensure proper token extraction from headers

2. **Token expiration issues**
   - Check JWT_EXPIRES_IN setting
   - Implement proper refresh token logic
   - Handle token expiration gracefully

3. **CORS issues**
   - Configure CORS properly for your frontend domain
   - Ensure credentials are included in requests

## Next Steps

Once JWT is configured, proceed to:
- [Stripe Setup](./03-stripe-setup.md)
- [ThirdWeb Configuration](./04-thirdweb-setup.md)

## Additional Resources

- [JWT.io](https://jwt.io/) - JWT debugger and documentation
- [jsonwebtoken npm package](https://www.npmjs.com/package/jsonwebtoken)
- [bcryptjs npm package](https://www.npmjs.com/package/bcryptjs)
- [OWASP JWT Security Guidelines](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/06-Session_Management_Testing/10-Testing_JWT)
