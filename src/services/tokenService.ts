import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { Polygon } from "@thirdweb-dev/chains";
import { CustomError } from "../middlewares/errorHandler";
import logger from "../utils/logger";
import prisma from "../db/prisma";

if (!process.env.THIRDWEB_PRIVATE_KEY) {
  throw new Error("THIRDWEB_PRIVATE_KEY no configurado");
}

if (!process.env.CONTRACT_ADDRESS) {
  throw new Error("CONTRACT_ADDRESS no configurado");
}

export class TokenService {
  private static sdk: ThirdwebSDK;

  static async initialize(): Promise<void> {
    try {
      this.sdk = await ThirdwebSDK.fromPrivateKey(
        process.env.THIRDWEB_PRIVATE_KEY,
        Polygon,
        {
          clientId: process.env.THIRDWEB_CLIENT_ID, // Optional
        }
      );

      logger.info("Thirdweb SDK initialized");
    } catch (error) {
      logger.error("Error initializing Thirdweb SDK:", error);
      throw error;
    }
  }

  static async mintTokens(
    orderId: string,
    userId: string,
    tokenAmount: number,
    recipientAddress?: string
  ): Promise<{ txHash: string; success: boolean }> {
    try {
      if (!this.sdk) {
        await this.initialize();
      }

      // Get user wallet address
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { walletAddress: true },
      });

      if (!user?.walletAddress && !recipientAddress) {
        throw new CustomError("Usuario sin dirección de wallet", 400);
      }

      const targetAddress = recipientAddress || user!.walletAddress!;

      // Get contract instance
      const contract = await this.sdk.getContract(
        process.env.CONTRACT_ADDRESS!
      );

      // Mint tokens
      const tx = await contract.erc20.mintTo(
        targetAddress,
        tokenAmount.toString()
      );

      logger.info("Mint transaction sent", {
        txHash: tx.receipt.transactionHash,
        orderId,
        userId,
        tokenAmount,
        recipientAddress: targetAddress,
      });

      // Save mint record
      await prisma.mint.create({
        data: {
          orderId,
          userId,
          tokenAmount,
          txHash: tx.receipt.transactionHash,
          chainId: 137, // Polygon mainnet
        },
      });

      // Update order status if not already completed
      await prisma.order.updateMany({
        where: { id: orderId, status: "pending" },
        data: { status: "completed" },
      });

      return {
        txHash: tx.receipt.transactionHash,
        success: true,
      };
    } catch (error) {
      logger.error("Error minting tokens:", error);

      // Update order status to failed
      await prisma.order.updateMany({
        where: { id: orderId },
        data: { status: "failed" },
      });

      throw error;
    }
  }

  static async getTokenBalance(walletAddress: string): Promise<number> {
    try {
      if (!this.sdk) {
        await this.initialize();
      }

      const contract = await this.sdk.getContract(
        process.env.CONTRACT_ADDRESS!
      );
      const balance = await contract.erc20.balanceOf(walletAddress);

      return Number(balance.displayValue);
    } catch (error) {
      logger.error("Error getting token balance:", error);
      throw error;
    }
  }

  static async getTokenInfo(): Promise<{
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: string;
  }> {
    try {
      if (!this.sdk) {
        await this.initialize();
      }

      const contract = await this.sdk.getContract(
        process.env.CONTRACT_ADDRESS!
      );

      const [name, symbol, decimals, totalSupply] = await Promise.all([
        contract.erc20.name(),
        contract.erc20.symbol(),
        contract.erc20.decimals(),
        contract.erc20.totalSupply(),
      ]);

      return {
        name,
        symbol,
        decimals,
        totalSupply: totalSupply.displayValue,
      };
    } catch (error) {
      logger.error("Error getting token info:", error);
      throw error;
    }
  }

  static async transferTokens(
    fromUserId: string,
    toUserId: string,
    amount: number
  ): Promise<{ txHash: string; success: boolean }> {
    try {
      if (!this.sdk) {
        await this.initialize();
      }

      // Get user addresses
      const [fromUser, toUser] = await Promise.all([
        prisma.user.findUnique({
          where: { id: fromUserId },
          select: { walletAddress: true },
        }),
        prisma.user.findUnique({
          where: { id: toUserId },
          select: { walletAddress: true },
        }),
      ]);

      if (!fromUser?.walletAddress || !toUser?.walletAddress) {
        throw new CustomError("Usuarios sin dirección de wallet", 400);
      }

      // Check balance
      const balance = await this.getTokenBalance(fromUser.walletAddress);
      if (balance < amount) {
        throw new CustomError("Saldo insuficiente", 400);
      }

      // Transfer tokens
      const contract = await this.sdk.getContract(
        process.env.CONTRACT_ADDRESS!
      );
      const tx = await contract.erc20.transfer(
        toUser.walletAddress,
        amount.toString()
      );

      logger.info("Transfer transaction sent", {
        txHash: tx.receipt.transactionHash,
        fromUserId,
        toUserId,
        amount,
        fromAddress: fromUser.walletAddress,
        toAddress: toUser.walletAddress,
      });

      return {
        txHash: tx.receipt.transactionHash,
        success: true,
      };
    } catch (error) {
      logger.error("Error transferring tokens:", error);
      throw error;
    }
  }
}

export default TokenService;

