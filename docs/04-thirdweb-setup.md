# ThirdWeb Setup Tutorial

This tutorial will guide you through setting up ThirdWeb for blockchain integration in the Bejaus Token project.

## Prerequisites

- Node.js and npm installed
- PostgreSQL configured (see [PostgreSQL Setup](./01-postgresql-setup.md))
- JWT authentication configured (see [JWT Setup](./02-jwt-setup.md))
- Stripe configured (see [Stripe Setup](./03-stripe-setup.md))
- Basic understanding of blockchain and smart contracts

## Step 1: Install ThirdWeb Dependencies

```bash
# Install ThirdWeb SDK
npm install @thirdweb-dev/sdk @thirdweb-dev/react
npm install ethers@^5.7.2 # ThirdWeb v3 requires ethers v5

# Install additional blockchain utilities
npm install @thirdweb-dev/chains
npm install --save-dev @types/node
```

## Step 2: Set Up ThirdWeb Account

### 1. Create ThirdWeb Account
1. Go to [thirdweb.com](https://thirdweb.com) and sign up
2. Complete account verification
3. Access your dashboard

### 2. Get API Keys
1. Navigate to **Settings > API Keys** in your ThirdWeb dashboard
2. Create a new API key
3. Copy your **Client ID** and **Secret Key**

## Step 3: Configure Environment Variables

Update your `.env` file with ThirdWeb credentials:

```env
# ThirdWeb Configuration
THIRDWEB_CLIENT_ID="your_client_id_here"
THIRDWEB_SECRET_KEY="your_secret_key_here"
THIRDWEB_PRIVATE_KEY="0x..." # Your wallet private key
CONTRACT_ADDRESS="0x..." # Your deployed contract address

# Blockchain Network Configuration
CHAIN_ID=137 # Polygon mainnet (default)
RPC_URL="https://polygon-rpc.com" # Polygon RPC endpoint
EXPLORER_URL="https://polygonscan.com" # Block explorer URL

# Gas Configuration
GAS_LIMIT=500000
GAS_PRICE="20000000000" # 20 gwei in wei
```

## Step 4: Create ThirdWeb Service

Create `src/services/thirdwebService.ts`:

```typescript
import { ThirdwebSDK } from '@thirdweb-dev/sdk';
import { Polygon } from '@thirdweb-dev/chains';
import { ethers } from 'ethers';
import { logger } from '../utils/logger';

export interface TokenMintParams {
  to: string;
  amount: number;
  metadata?: Record<string, any>;
}

export interface ContractInfo {
  name: string;
  symbol: string;
  totalSupply: string;
  decimals: number;
}

export interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  gasUsed?: string;
}

export class ThirdWebService {
  private sdk: ThirdwebSDK;
  private contract: any;
  private signer: ethers.Signer;
  private contractAddress: string;

  constructor() {
    const privateKey = process.env.THIRDWEB_PRIVATE_KEY;
    const rpcUrl = process.env.RPC_URL || 'https://polygon-rpc.com';
    const chainId = parseInt(process.env.CHAIN_ID || '137');

    if (!privateKey) {
      throw new Error('THIRDWEB_PRIVATE_KEY is required');
    }

    // Initialize provider and signer
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, provider);

    // Initialize ThirdWeb SDK
    this.sdk = ThirdwebSDK.fromPrivateKey(privateKey, 'polygon', {
      clientId: process.env.THIRDWEB_CLIENT_ID,
      secretKey: process.env.THIRWEB_SECRET_KEY,
    });

    this.contractAddress = process.env.CONTRACT_ADDRESS || '';
    
    if (this.contractAddress) {
      this.initializeContract();
    }
  }

  /**
   * Initialize the smart contract
   */
  private async initializeContract(): Promise<void> {
    try {
      this.contract = await this.sdk.getContract(this.contractAddress);
      logger.info(`Contract initialized: ${this.contractAddress}`);
    } catch (error) {
      logger.error('Failed to initialize contract:', error);
      throw new Error('Failed to initialize contract');
    }
  }

  /**
   * Deploy a new ERC20 token contract
   */
  async deployTokenContract(
    name: string,
    symbol: string,
    initialSupply: number,
    decimals: number = 18
  ): Promise<string> {
    try {
      logger.info(`Deploying token contract: ${name} (${symbol})`);

      const contract = await this.sdk.deployer.deployToken({
        name,
        symbol,
        initialSupply: ethers.utils.parseUnits(initialSupply.toString(), decimals),
        primary_sale_recipient: await this.signer.getAddress(),
      });

      const contractAddress = contract.getAddress();
      logger.info(`Token contract deployed: ${contractAddress}`);

      // Update environment variable
      this.contractAddress = contractAddress;
      this.contract = contract;

      return contractAddress;
    } catch (error) {
      logger.error('Failed to deploy token contract:', error);
      throw new Error('Failed to deploy token contract');
    }
  }

  /**
   * Mint tokens to a specific address
   */
  async mintTokens(params: TokenMintParams): Promise<TransactionResult> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      logger.info(`Minting ${params.amount} tokens to ${params.to}`);

      const amount = ethers.utils.parseUnits(params.amount.toString(), 18);
      
      const tx = await this.contract.erc20.mintTo(params.to, amount);
      const receipt = await tx.wait();

      logger.info(`Tokens minted successfully. TX Hash: ${receipt.transactionHash}`);

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      logger.error('Failed to mint tokens:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Transfer tokens between addresses
   */
  async transferTokens(
    from: string,
    to: string,
    amount: number
  ): Promise<TransactionResult> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      logger.info(`Transferring ${amount} tokens from ${from} to ${to}`);

      const tokenAmount = ethers.utils.parseUnits(amount.toString(), 18);
      
      const tx = await this.contract.erc20.transfer(to, tokenAmount);
      const receipt = await tx.wait();

      logger.info(`Tokens transferred successfully. TX Hash: ${receipt.transactionHash}`);

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      logger.error('Failed to transfer tokens:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get token balance for an address
   */
  async getTokenBalance(address: string): Promise<string> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const balance = await this.contract.erc20.balanceOf(address);
      const formattedBalance = ethers.utils.formatUnits(balance, 18);
      
      return formattedBalance;
    } catch (error) {
      logger.error(`Failed to get balance for ${address}:`, error);
      throw new Error('Failed to get token balance');
    }
  }

  /**
   * Get contract information
   */
  async getContractInfo(): Promise<ContractInfo> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const [name, symbol, totalSupply, decimals] = await Promise.all([
        this.contract.erc20.name(),
        this.contract.erc20.symbol(),
        this.contract.erc20.totalSupply(),
        this.contract.erc20.decimals(),
      ]);

      return {
        name,
        symbol,
        totalSupply: ethers.utils.formatUnits(totalSupply, decimals),
        decimals,
      };
    } catch (error) {
      logger.error('Failed to get contract info:', error);
      throw new Error('Failed to get contract information');
    }
  }

  /**
   * Get transaction history for an address
   */
  async getTransactionHistory(address: string, limit: number = 10): Promise<any[]> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      // This is a simplified implementation
      // In production, you might want to use a blockchain indexer like The Graph
      const events = await this.contract.events.getAllEvents();
      
      return events
        .filter((event: any) => 
          event.from?.toLowerCase() === address.toLowerCase() ||
          event.to?.toLowerCase() === address.toLowerCase()
        )
        .slice(0, limit)
        .map((event: any) => ({
          hash: event.transactionHash,
          from: event.from,
          to: event.to,
          value: ethers.utils.formatUnits(event.value || '0', 18),
          timestamp: event.blockTimestamp,
          type: event.from?.toLowerCase() === address.toLowerCase() ? 'sent' : 'received',
        }));
    } catch (error) {
      logger.error(`Failed to get transaction history for ${address}:`, error);
      throw new Error('Failed to get transaction history');
    }
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(
    to: string,
    amount: number
  ): Promise<string> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const tokenAmount = ethers.utils.parseUnits(amount.toString(), 18);
      const gasEstimate = await this.contract.erc20.transfer.estimateGas(to, tokenAmount);
      
      return gasEstimate.toString();
    } catch (error) {
      logger.error('Failed to estimate gas:', error);
      throw new Error('Failed to estimate gas');
    }
  }

  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<string> {
    try {
      const gasPrice = await this.signer.provider!.getGasPrice();
      return ethers.utils.formatUnits(gasPrice, 'gwei');
    } catch (error) {
      logger.error('Failed to get gas price:', error);
      throw new Error('Failed to get gas price');
    }
  }

  /**
   * Get network information
   */
  async getNetworkInfo(): Promise<any> {
    try {
      const network = await this.signer.provider!.getNetwork();
      const blockNumber = await this.signer.provider!.getBlockNumber();
      const gasPrice = await this.getGasPrice();

      return {
        chainId: network.chainId,
        name: network.name,
        blockNumber,
        gasPrice: `${gasPrice} gwei`,
      };
    } catch (error) {
      logger.error('Failed to get network info:', error);
      throw new Error('Failed to get network information');
    }
  }
}

// Export singleton instance
export const thirdwebService = new ThirdWebService();
```

## Step 5: Create Smart Contract

Create `contracts/BejausToken.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@thirdweb-dev/contracts/base/ERC20Base.sol";
import "@thirdweb-dev/contracts/extension/Permissions.sol";
import "@thirdweb-dev/contracts/extension/PermissionsEnumerable.sol";

contract BejausToken is ERC20Base, Permissions, PermissionsEnumerable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    
    mapping(address => bool) public isBlacklisted;
    
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
    event AddressBlacklisted(address indexed account);
    event AddressUnblacklisted(address indexed account);

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply
    ) ERC20Base(_name, _symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);
        
        if (_initialSupply > 0) {
            _mint(msg.sender, _initialSupply);
        }
    }

    modifier notBlacklisted(address _account) {
        require(!isBlacklisted[_account], "Address is blacklisted");
        _;
    }

    function mint(address _to, uint256 _amount) 
        external 
        onlyRole(MINTER_ROLE) 
        notBlacklisted(_to)
    {
        _mint(_to, _amount);
        emit TokensMinted(_to, _amount);
    }

    function burn(address _from, uint256 _amount) 
        external 
        onlyRole(BURNER_ROLE) 
        notBlacklisted(_from)
    {
        _burn(_from, _amount);
        emit TokensBurned(_from, _amount);
    }

    function blacklistAddress(address _account) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        isBlacklisted[_account] = true;
        emit AddressBlacklisted(_account);
    }

    function unblacklistAddress(address _account) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        isBlacklisted[_account] = false;
        emit AddressUnblacklisted(_account);
    }

    function transfer(address _to, uint256 _amount) 
        public 
        virtual 
        override 
        notBlacklisted(msg.sender) 
        notBlacklisted(_to) 
        returns (bool) 
    {
        return super.transfer(_to, _amount);
    }

    function transferFrom(address _from, address _to, uint256 _amount) 
        public 
        virtual 
        override 
        notBlacklisted(_from) 
        notBlacklisted(_to) 
        returns (bool) 
    {
        return super.transferFrom(_from, _to, _amount);
    }

    function getBlacklistStatus(address _account) external view returns (bool) {
        return isBlacklisted[_account];
    }
}
```

## Step 6: Update Token Routes

Update `src/routes/tokens.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { thirdwebService } from '../services/thirdwebService';
import { authenticateToken } from '../middlewares/authMiddleware';
import { logger } from '../utils/logger';

const router = Router();

// Get contract information
router.get('/contract-info', async (req: Request, res: Response) => {
  try {
    const contractInfo = await thirdwebService.getContractInfo();
    res.json({
      success: true,
      contractInfo,
    });
  } catch (error) {
    logger.error('Failed to get contract info:', error);
    res.status(500).json({ error: 'Failed to get contract information' });
  }
});

// Get token balance
router.get('/balance/:address', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const balance = await thirdwebService.getTokenBalance(address);
    
    res.json({
      success: true,
      address,
      balance,
    });
  } catch (error) {
    logger.error(`Failed to get balance for ${req.params.address}:`, error);
    res.status(500).json({ error: 'Failed to get token balance' });
  }
});

// Mint tokens (admin only)
router.post('/mint', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { to, amount, metadata } = req.body;
    const userId = req.user!.userId;

    if (!to || !amount) {
      return res.status(400).json({ error: 'Recipient address and amount are required' });
    }

    // TODO: Add admin role verification
    // if (!req.user!.isAdmin) {
    //   return res.status(403).json({ error: 'Admin access required' });
    // }

    const result = await thirdwebService.mintTokens({
      to,
      amount: parseFloat(amount),
      metadata: {
        ...metadata,
        mintedBy: userId,
        timestamp: new Date().toISOString(),
      },
    });

    if (result.success) {
      res.json({
        success: true,
        transactionHash: result.transactionHash,
        gasUsed: result.gasUsed,
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    logger.error('Failed to mint tokens:', error);
    res.status(500).json({ error: 'Failed to mint tokens' });
  }
});

// Transfer tokens
router.post('/transfer', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { from, to, amount } = req.body;
    const userId = req.user!.userId;

    if (!from || !to || !amount) {
      return res.status(400).json({ error: 'From address, to address, and amount are required' });
    }

    // TODO: Verify user owns the from address or has permission
    // if (from !== req.user!.walletAddress && !req.user!.isAdmin) {
    //   return res.status(403).json({ error: 'Insufficient permissions' });
    // }

    const result = await thirdwebService.transferTokens(from, to, parseFloat(amount));

    if (result.success) {
      res.json({
        success: true,
        transactionHash: result.transactionHash,
        gasUsed: result.gasUsed,
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    logger.error('Failed to transfer tokens:', error);
    res.status(500).json({ error: 'Failed to transfer tokens' });
  }
});

// Get transaction history
router.get('/transactions/:address', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { limit = 10 } = req.query;
    
    const transactions = await thirdwebService.getTransactionHistory(
      address, 
      parseInt(limit as string)
    );
    
    res.json({
      success: true,
      address,
      transactions,
    });
  } catch (error) {
    logger.error(`Failed to get transactions for ${req.params.address}:`, error);
    res.status(500).json({ error: 'Failed to get transaction history' });
  }
});

// Estimate gas for transfer
router.post('/estimate-gas', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { to, amount } = req.body;

    if (!to || !amount) {
      return res.status(400).json({ error: 'Recipient address and amount are required' });
    }

    const gasEstimate = await thirdwebService.estimateGas(to, parseFloat(amount));
    const gasPrice = await thirdwebService.getGasPrice();
    
    res.json({
      success: true,
      gasEstimate,
      gasPrice: `${gasPrice} gwei`,
    });
  } catch (error) {
    logger.error('Failed to estimate gas:', error);
    res.status(500).json({ error: 'Failed to estimate gas' });
  }
});

// Get network information
router.get('/network-info', async (req: Request, res: Response) => {
  try {
    const networkInfo = await thirdwebService.getNetworkInfo();
    res.json({
      success: true,
      networkInfo,
    });
  } catch (error) {
    logger.error('Failed to get network info:', error);
    res.status(500).json({ error: 'Failed to get network information' });
  }
});

export default router;
```

## Step 7: Deploy Smart Contract

### 1. Using ThirdWeb Dashboard
1. Go to your ThirdWeb dashboard
2. Click **Deploy** > **Smart Contract**
3. Choose **ERC20** template
4. Fill in contract details:
   - Name: "Bejaus Token"
   - Symbol: "BEJAUS"
   - Initial Supply: 1000000
5. Deploy to Polygon network
6. Copy the contract address to your `.env` file

### 2. Using ThirdWeb CLI
```bash
# Install ThirdWeb CLI
npm install -g @thirdweb-dev/cli

# Login to ThirdWeb
thirdweb login

# Deploy contract
thirdweb deploy

# Follow the prompts to deploy your ERC20 token
```

## Step 8: Frontend Integration

### 1. Install ThirdWeb React Components
```bash
npm install @thirdweb-dev/react @thirdweb-dev/chains
```

### 2. Set Up ThirdWeb Provider
```tsx
import { ThirdwebProvider } from '@thirdweb-dev/react';
import { Polygon } from '@thirdweb-dev/chains';

function App() {
  return (
    <ThirdwebProvider 
      activeChain={Polygon}
      clientId={process.env.REACT_APP_THIRDWEB_CLIENT_ID}
    >
      {/* Your app components */}
    </ThirdwebProvider>
  );
}
```

### 3. Use ThirdWeb Hooks
```tsx
import { useContract, useContractRead, useContractWrite } from '@thirdweb-dev/react';

function TokenBalance({ address }: { address: string }) {
  const { contract } = useContract(process.env.REACT_APP_CONTRACT_ADDRESS);
  const { data: balance } = useContractRead(contract, "balanceOf", [address]);

  return (
    <div>
      Balance: {balance ? ethers.utils.formatUnits(balance, 18) : 'Loading...'}
    </div>
  );
}
```

## Step 9: Testing

### 1. Test on Polygon Mumbai (Testnet)
```env
# Testnet configuration
CHAIN_ID=80001
RPC_URL="https://rpc-mumbai.maticvigil.com"
EXPLORER_URL="https://mumbai.polygonscan.com"
```

### 2. Test Scenarios
- Deploy contract
- Mint tokens
- Transfer tokens
- Check balances
- View transaction history
- Estimate gas costs

## Step 10: Security Best Practices

### 1. Private Key Security
- Never commit private keys to version control
- Use environment variables for all sensitive data
- Consider using hardware wallets for production
- Implement key rotation policies

### 2. Smart Contract Security
- Audit smart contracts before deployment
- Use established libraries and patterns
- Implement proper access controls
- Test thoroughly on testnets

### 3. Gas Optimization
- Optimize smart contract functions
- Use batch operations when possible
- Implement gas estimation
- Monitor gas prices

## Step 11: Production Considerations

### 1. Network Selection
- **Polygon Mainnet**: Low fees, good for users
- **Ethereum Mainnet**: Higher security, higher fees
- **Layer 2 Solutions**: Consider Arbitrum, Optimism

### 2. Monitoring
- Set up blockchain monitoring
- Track gas prices and network congestion
- Monitor contract events and transactions
- Implement alerting for critical operations

### 3. Backup and Recovery
- Secure backup of private keys
- Document deployment procedures
- Plan for contract upgrades
- Emergency response procedures

## Troubleshooting

### Common Issues

1. **"Contract not initialized" errors**
   - Check CONTRACT_ADDRESS environment variable
   - Ensure contract is deployed and accessible
   - Verify network configuration

2. **Gas estimation failures**
   - Check RPC endpoint accessibility
   - Verify account has sufficient balance
   - Check network congestion

3. **Transaction failures**
   - Verify account has sufficient tokens
   - Check gas limits and prices
   - Ensure proper permissions

## Next Steps

Once ThirdWeb is configured, your project will have:
- ✅ PostgreSQL database
- ✅ JWT authentication
- ✅ Stripe payments
- ✅ Blockchain integration

## Additional Resources

- [ThirdWeb Documentation](https://portal.thirdweb.com/)
- [ThirdWeb SDK Reference](https://portal.thirdweb.com/typescript)
- [Polygon Documentation](https://docs.polygon.technology/)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [Ethers.js Documentation](https://docs.ethers.io/)
