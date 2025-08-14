import { ethers } from 'ethers';
import type { 
  ContractConfig, 
  CreateCollectionRequest, 
  MintRequest,
  CollectionCreatedEvent,
  TokenMintedEvent,
  EarningsClaimedEvent 
} from '@/types/nft';

// Smart Contract ABIs (actual contract ABIs)
const TRIP_FACTORY_ABI = [
  'function createTripCollection(string name, string symbol, uint256 maxSupply, uint256 price, uint96 royaltyFee) external returns (address)',
  'event CollectionCreated(address indexed newCollectionAddress, address indexed creator, string name, string symbol, uint256 maxSupply, uint256 price)',
  'function getDeployedCollections() external view returns (address[])',
  'function getCollectionCount() external view returns (uint256)',
  'function setOwner(address newOwner) external',
  'function owner() external view returns (address)'
];

const TRIP_NFT_ABI = [
  'function mint(address to, uint256 quantity) external payable',
  'function setBaseURI(string baseURI) external',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function totalSupply() external view returns (uint256)',
  'function maxSupply() external view returns (uint256)',
  'function price() external view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
];

const STREAMING_LEDGER_ABI = [
  'function deposit() external payable',
  'function withdraw(uint256 amount, bytes memory signature) external',
  'function getBalance(address user) external view returns (uint256)',
  'event Deposited(address indexed user, uint256 amount)',
  'event Withdrawn(address indexed user, uint256 amount)'
];

export class ContractService {
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  private config: ContractConfig;

  constructor(config: ContractConfig, signer: ethers.Signer) {
    this.config = config;
    this.signer = signer;
    this.provider = signer.provider!;
  }

  /**
   * Create a new Trip collection
   */
  async createTripCollection(request: CreateCollectionRequest): Promise<string> {
    try {
      const factory = new ethers.Contract(
        this.config.tripFactoryAddress,
        TRIP_FACTORY_ABI,
        this.signer
      );

      const tx = await factory.createTripCollection(
        request.name,
        request.symbol,
        request.maxSupply,
        ethers.parseEther(request.price),
        request.royaltyPercentage // This will be converted to uint96 by ethers
      );

      const receipt = await tx.wait();
      
      // Find the CollectionCreated event
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed?.name === 'CollectionCreated';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = factory.interface.parseLog(event);
        return parsed?.args?.[0]; // newCollectionAddress
      }

      throw new Error('Collection creation event not found');
    } catch (error) {
      console.error('Error creating collection:', error);
      throw new Error(`Failed to create collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Set base URI for a collection
   */
  async setBaseURI(collectionAddress: string, baseURI: string): Promise<void> {
    try {
      const collection = new ethers.Contract(
        collectionAddress,
        TRIP_NFT_ABI,
        this.signer
      );

      const tx = await collection.setBaseURI(baseURI);
      await tx.wait();
    } catch (error) {
      console.error('Error setting base URI:', error);
      throw new Error(`Failed to set base URI: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mint tokens from a collection
   */
  async mintTokens(request: MintRequest): Promise<string> {
    try {
      const collection = new ethers.Contract(
        request.collectionAddress,
        TRIP_NFT_ABI,
        this.signer
      );

      // Get the price for this collection
      const price = await collection.price();
      const totalCost = price * BigInt(request.quantity);

      const tx = await collection.mint(request.recipient, request.quantity, {
        value: totalCost
      });

      const receipt = await tx.wait();
      return receipt?.hash || '';
    } catch (error) {
      console.error('Error minting tokens:', error);
      throw new Error(`Failed to mint tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if user owns a specific token
   */
  async isTokenOwner(collectionAddress: string, tokenId: string, userAddress: string): Promise<boolean> {
    try {
      const collection = new ethers.Contract(
        collectionAddress,
        TRIP_NFT_ABI,
        this.provider
      );

      const owner = await collection.ownerOf(tokenId);
      return owner.toLowerCase() === userAddress.toLowerCase();
    } catch (error) {
      console.error('Error checking token ownership:', error);
      return false;
    }
  }

  /**
   * Get collection information
   */
  async getCollectionInfo(collectionAddress: string) {
    try {
      const collection = new ethers.Contract(
        collectionAddress,
        TRIP_NFT_ABI,
        this.provider
      );

      const [totalSupply, maxSupply, price] = await Promise.all([
        collection.totalSupply(),
        collection.maxSupply(),
        collection.price()
      ]);

      return {
        totalSupply: totalSupply.toString(),
        maxSupply: maxSupply.toString(),
        price: ethers.formatEther(price)
      };
    } catch (error) {
      console.error('Error getting collection info:', error);
      throw new Error(`Failed to get collection info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get deployed collections from factory
   */
  async getDeployedCollections(): Promise<string[]> {
    try {
      const factory = new ethers.Contract(
        this.config.tripFactoryAddress,
        TRIP_FACTORY_ABI,
        this.provider
      );

      return await factory.getDeployedCollections();
    } catch (error) {
      console.error('Error getting deployed collections:', error);
      throw new Error(`Failed to get deployed collections: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get collection count from factory
   */
  async getCollectionCount(): Promise<number> {
    try {
      const factory = new ethers.Contract(
        this.config.tripFactoryAddress,
        TRIP_FACTORY_ABI,
        this.provider
      );

      const count = await factory.getCollectionCount();
      return Number(count);
    } catch (error) {
      console.error('Error getting collection count:', error);
      throw new Error(`Failed to get collection count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get factory owner
   */
  async getFactoryOwner(): Promise<string> {
    try {
      const factory = new ethers.Contract(
        this.config.tripFactoryAddress,
        TRIP_FACTORY_ABI,
        this.provider
      );

      return await factory.owner();
    } catch (error) {
      console.error('Error getting factory owner:', error);
      throw new Error(`Failed to get factory owner: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deposit ETH to StreamingLedger for credits
   */
  async depositCredits(amount: string): Promise<string> {
    try {
      const ledger = new ethers.Contract(
        this.config.streamingLedgerAddress,
        STREAMING_LEDGER_ABI,
        this.signer
      );

      const tx = await ledger.deposit({
        value: ethers.parseEther(amount)
      });

      const receipt = await tx.wait();
      return receipt?.hash || '';
    } catch (error) {
      console.error('Error depositing credits:', error);
      throw new Error(`Failed to deposit credits: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Withdraw earnings from StreamingLedger
   */
  async withdrawEarnings(amount: string, signature: string): Promise<string> {
    try {
      const ledger = new ethers.Contract(
        this.config.streamingLedgerAddress,
        STREAMING_LEDGER_ABI,
        this.signer
      );

      const tx = await ledger.withdraw(
        ethers.parseEther(amount),
        signature
      );

      const receipt = await tx.wait();
      return receipt?.hash || '';
    } catch (error) {
      console.error('Error withdrawing earnings:', error);
      throw new Error(`Failed to withdraw earnings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user's credit balance
   */
  async getCreditBalance(userAddress: string): Promise<string> {
    try {
      const ledger = new ethers.Contract(
        this.config.streamingLedgerAddress,
        STREAMING_LEDGER_ABI,
        this.provider
      );

      const balance = await ledger.getBalance(userAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting credit balance:', error);
      throw new Error(`Failed to get credit balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Listen for collection creation events
   */
  async listenForCollectionCreated(callback: (event: CollectionCreatedEvent) => void) {
    try {
      const factory = new ethers.Contract(
        this.config.tripFactoryAddress,
        TRIP_FACTORY_ABI,
        this.provider
      );

      factory.on('CollectionCreated', (newCollectionAddress, creator, name, symbol, maxSupply, price, event) => {
        const collectionEvent: CollectionCreatedEvent = {
          collectionAddress: newCollectionAddress,
          creator,
          name,
          symbol,
          maxSupply: maxSupply.toString(),
          price: ethers.formatEther(price),
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash
        };

        callback(collectionEvent);
      });
    } catch (error) {
      console.error('Error setting up collection event listener:', error);
      throw new Error(`Failed to setup event listener: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Listen for token minting events
   */
  async listenForTokenMinted(collectionAddress: string, callback: (event: TokenMintedEvent) => void) {
    try {
      const collection = new ethers.Contract(
        collectionAddress,
        TRIP_NFT_ABI,
        this.provider
      );

      collection.on('Transfer', (from, to, tokenId, event) => {
        // Only emit for new mints (from zero address)
        if (from === ethers.ZeroAddress) {
          const mintEvent: TokenMintedEvent = {
            collectionAddress,
            tokenId: tokenId.toString(),
            owner: to,
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash
          };

          callback(mintEvent);
        }
      });
    } catch (error) {
      console.error('Error setting up token minting event listener:', error);
      throw new Error(`Failed to setup event listener: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(txHash: string) {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        return { status: 'pending', confirmations: 0 };
      }

      const currentBlock = await this.provider.getBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber;

      return {
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        confirmations,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.gasUsed ? receipt.gasUsed.toString() : '0'
      };
    } catch (error) {
      console.error('Error getting transaction status:', error);
      throw new Error(`Failed to get transaction status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Estimate gas for collection creation
   */
  async estimateCreateCollection(request: CreateCollectionRequest): Promise<string> {
    try {
      const factory = new ethers.Contract(
        this.config.tripFactoryAddress,
        TRIP_FACTORY_ABI,
        this.signer
      );

      const gasEstimate = await factory.createTripCollection.estimateGas(
        request.name,
        request.symbol,
        request.maxSupply,
        ethers.parseEther(request.price),
        request.royaltyPercentage // This will be converted to uint96
      );

      return gasEstimate.toString();
    } catch (error) {
      console.error('Error estimating gas for collection creation:', error);
      throw new Error(`Failed to estimate gas: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Estimate gas for minting
   */
  async estimateMintTokens(request: MintRequest): Promise<string> {
    try {
      const collection = new ethers.Contract(
        request.collectionAddress,
        TRIP_NFT_ABI,
        this.signer
      );

      const price = await collection.price();
      const totalCost = price * BigInt(request.quantity);

      const gasEstimate = await collection.mint.estimateGas(
        request.recipient,
        request.quantity,
        { value: totalCost }
      );

      return gasEstimate.toString();
    } catch (error) {
      console.error('Error estimating gas for minting:', error);
      throw new Error(`Failed to estimate gas: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Factory function to create contract service
export function createContractService(config: ContractConfig, signer: ethers.Signer): ContractService {
  return new ContractService(config, signer);
}

// Default configuration (replace with actual values)
export const DEFAULT_CONTRACT_CONFIG: ContractConfig = {
  tripFactoryAddress: '0x0000000000000000000000000000000000000000', // Replace with actual address
  streamingLedgerAddress: '0x0000000000000000000000000000000000000000', // Replace with actual address
  chainId: 80001, // Mumbai testnet
  rpcUrl: 'https://rpc-mumbai.maticvigil.com' // Replace with actual RPC URL
};
