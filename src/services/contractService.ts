import { ethers } from 'ethers';
import type { 
  ContractConfig, 
  CreateCollectionRequest, 
  MintRequest,
  CollectionCreatedEvent,
  TokenMintedEvent,
  EarningsClaimedEvent 
} from '@/types/nft';

// Smart Contract ABIs (actual deployed contract ABIs)
const TRIP_FACTORY_ABI = [
  'function createTripCollection(string name, string symbol, uint256 maxSupply, uint256 price, uint96 royaltyFee) external returns (address)',
  'event CollectionCreated(address indexed newCollectionAddress, address indexed creator, string name, string symbol, uint256 maxSupply, uint256 price)',
  'function getDeployedCollections() external view returns (address[])',
  'function getCollectionCount() external view returns (uint256)',
  'function setOwner(address newOwner) external',
  'function owner() external view returns (address)'
];

const TRIP_NFT_ABI = [
  // Constructor parameters
  'constructor(string name, string symbol, uint256 maxSupply, uint256 initialMintPrice, address initialOwner, address royaltyRecipient, uint96 royaltyPercentage)',
  
  // Core functions
  'function mint(uint256 quantity) external payable',
  'function setBaseURI(string newBaseURI) external',
  'function setMintPrice(uint256 newPrice) external',
  'function withdraw() external',
  
  // View functions
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function totalSupply() external view returns (uint256)',
  'function MAX_SUPPLY() external view returns (uint256)',
  'function mintPrice() external view returns (uint256)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function balanceOf(address owner) external view returns (uint256)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'function owner() external view returns (address)',
  
  // ERC-721 functions
  'function approve(address to, uint256 tokenId) external',
  'function getApproved(uint256 tokenId) external view returns (address)',
  'function setApprovalForAll(address operator, bool approved) external',
  'function isApprovedForAll(address owner, address operator) external view returns (bool)',
  'function transferFrom(address from, address to, uint256 tokenId) external',
  'function safeTransferFrom(address from, address to, uint256 tokenId) external',
  'function safeTransferFrom(address from, address to, uint256 tokenId, bytes data) external',
  'function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)',
  'function tokenByIndex(uint256 index) external view returns (uint256)',
  
  // ERC-2981 royalty functions
  'function royaltyInfo(uint256 tokenId, uint256 salePrice) external view returns (address receiver, uint256 royaltyAmount)',
  'function supportsInterface(bytes4 interfaceId) external view returns (bool)',
  
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)',
  'event ApprovalForAll(address indexed owner, address indexed operator, bool approved)',
  'event BaseURIUpdated(string newBaseURI)',
  'event MintPriceUpdated(uint256 newPrice)'
];

const STREAMING_LEDGER_ABI = [
  // Constructor
  'constructor(address initialOwner, address initialTrustedSigner)',
  
  // Core functions
  'function deposit() external payable',
  'function withdraw(uint256 amount, bytes signature) external',
  'function setTrustedSigner(address newSigner) external',
  'function emergencyWithdraw() external',
  
  // View functions
  'function getContractBalance() external view returns (uint256)',
  'function getUserCredit(address user) external view returns (uint256)',
  'function owner() external view returns (address)',
  'function trustedSigner() external view returns (address)',
  
  // Events
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
      console.log('ContractService.createTripCollection called with:', request);
      console.log('Price type:', typeof request.price);
      console.log('Price value:', request.price.toString());
      
      const factory = new ethers.Contract(
        this.config.tripFactoryAddress,
        TRIP_FACTORY_ABI,
        this.signer
      );

      const tx = await factory.createTripCollection(
        request.name,
        request.symbol,
        request.maxSupply,
        request.price, // Already parsed to BigInt
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

      // Get the mint price for this collection
      const price = await collection.mintPrice();
      const totalCost = price * BigInt(request.quantity);

      const tx = await collection.mint(request.quantity, {
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
        collection.MAX_SUPPLY(),
        collection.mintPrice()
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
   * Get full collection details including metadata
   */
  async getCollection(collectionAddress: string) {
    try {
      const collection = new ethers.Contract(
        collectionAddress,
        TRIP_NFT_ABI,
        this.provider
      );

      const [totalSupply, maxSupply, price, name, symbol] = await Promise.all([
        collection.totalSupply(),
        collection.MAX_SUPPLY(),
        collection.mintPrice(),
        collection.name(),
        collection.symbol()
      ]);

      // Try to get collection metadata from IPFS if available
      let description = 'A unique audio-visual experience collection';
      let imageUrl = '/images/sunrise_energizer.png';
      let audioCid = '';
      let patternCid = '';
      let metadataCid = '';

      try {
        // Check if there's a baseURI set for the collection
        // This would typically point to IPFS metadata
        const baseURI = await collection.baseURI?.() || '';
        if (baseURI && baseURI !== '') {
          // Try to fetch collection metadata from IPFS
          const collectionMetadataUrl = `${baseURI}collection.json`;
          const response = await fetch(collectionMetadataUrl);
          if (response.ok) {
            const ipfsMetadata = await response.json();
            description = ipfsMetadata.description || description;
            imageUrl = ipfsMetadata.image || imageUrl;
            audioCid = ipfsMetadata.audio || audioCid;
            patternCid = ipfsMetadata.pattern || patternCid;
            metadataCid = ipfsMetadata.metadata || metadataCid;
          }
        }
      } catch (ipfsError) {
        console.warn('Failed to fetch collection IPFS metadata:', ipfsError);
      }

      return {
        id: collectionAddress,
        contractAddress: collectionAddress,
        name: name,
        symbol: symbol,
        description,
        creator: await collection.owner(),
        maxSupply: Number(maxSupply),
        currentSupply: Number(totalSupply),
        price: ethers.formatEther(price),
        audioCid,
        patternCid,
        metadataCid,
        createdAt: new Date().toISOString(),
        imageUrl,
        isActive: true,
        royaltyPercentage: 1000, // 10% default
        tags: [],
        category: 'Audio-Visual'
      };
    } catch (error) {
      console.error('Error getting collection:', error);
      throw new Error(`Failed to get collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a single token by ID
   */
  async getTokenById(collectionAddress: string, tokenId: string) {
    try {
      const collection = new ethers.Contract(
        collectionAddress,
        TRIP_NFT_ABI,
        this.provider
      );

      // Get the actual token URI from the contract
      const tokenURI = await collection.tokenURI(tokenId);
      
      // Fetch metadata from IPFS
      let metadata = {
        name: `${await collection.name()} #${tokenId}`,
        description: 'A unique audio-visual experience NFT',
        image: '/images/default-token.jpg',
        audio: '',
        pattern: '',
        attributes: []
      };

      try {
        if (tokenURI && tokenURI !== '') {
          const response = await fetch(tokenURI);
          if (response.ok) {
            const ipfsMetadata = await response.json();
            metadata = {
              name: ipfsMetadata.name || metadata.name,
              description: ipfsMetadata.description || metadata.description,
              image: ipfsMetadata.image || metadata.image,
              audio: ipfsMetadata.audio || metadata.audio,
              pattern: ipfsMetadata.pattern || metadata.pattern,
              attributes: ipfsMetadata.attributes || metadata.attributes
            };
          }
        }
      } catch (ipfsError) {
        console.warn(`Failed to fetch IPFS metadata for token ${tokenId}:`, ipfsError);
      }

      const owner = await collection.ownerOf(tokenId);
      
      return {
        id: `${collectionAddress}-${tokenId}`,
        tokenId: tokenId.toString(),
        collectionAddress,
        owner,
        creator: await collection.owner(),
        metadata,
        mintedAt: new Date().toISOString(),
        isListed: false
      };
    } catch (error) {
      console.error('Error getting token by ID:', error);
      throw new Error(`Failed to get token by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get tokens for a specific collection
   */
  async getTokensForCollection(collectionAddress: string) {
    try {
      const collection = new ethers.Contract(
        collectionAddress,
        TRIP_NFT_ABI,
        this.provider
      );

      const totalSupply = await collection.totalSupply();
      const tokens: any[] = [];

      // Get all tokens in the collection
      for (let i = 0; i < totalSupply; i++) {
        try {
          const tokenId = await collection.tokenByIndex(i);
          const owner = await collection.ownerOf(tokenId);
          
          // Get the actual token URI from the contract
          const tokenURI = await collection.tokenURI(tokenId);
          
          // Fetch metadata from IPFS
          let metadata = {
            name: `${await collection.name()} #${tokenId}`,
            description: 'A unique audio-visual experience NFT',
            image: '/images/default-token.jpg',
            audio: '',
            pattern: '',
            attributes: []
          };

          try {
            if (tokenURI && tokenURI !== '') {
              const response = await fetch(tokenURI);
              if (response.ok) {
                const ipfsMetadata = await response.json();
                metadata = {
                  name: ipfsMetadata.name || metadata.name,
                  description: ipfsMetadata.description || metadata.description,
                  image: ipfsMetadata.image || metadata.image,
                  audio: ipfsMetadata.audio || metadata.audio,
                  pattern: ipfsMetadata.pattern || metadata.pattern,
                  attributes: ipfsMetadata.attributes || metadata.attributes
                };
              }
            }
          } catch (ipfsError) {
            console.warn(`Failed to fetch IPFS metadata for token ${tokenId}:`, ipfsError);
          }
          
          tokens.push({
            id: `${collectionAddress}-${tokenId}`,
            tokenId: tokenId.toString(),
            collectionAddress,
            owner,
            creator: await collection.owner(),
            metadata,
            mintedAt: new Date().toISOString(),
            isListed: false
          });
        } catch (error) {
          console.warn(`Error getting token ${i}:`, error);
        }
      }

      return tokens;
    } catch (error) {
      console.error('Error getting tokens for collection:', error);
      throw new Error(`Failed to get tokens for collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mint NFTs from a collection
   */
  async mintNFT(collectionAddress: string, quantity: number, totalPrice: bigint): Promise<string> {
    try {
      const collection = new ethers.Contract(
        collectionAddress,
        TRIP_NFT_ABI,
        this.signer
      );

      const tx = await collection.mint(quantity, { value: totalPrice });
      const receipt = await tx.wait();
      
      return receipt.hash;
    } catch (error) {
      console.error('Error minting NFT:', error);
      throw new Error(`Failed to mint NFT: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

      const balance = await ledger.getUserCredit(userAddress);
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
        request.price, // Already BigInt
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

      const price = await collection.mintPrice(); // Use mintPrice() instead of price()
      const totalCost = price * BigInt(request.quantity);

      const gasEstimate = await collection.mint.estimateGas(
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

// Default configuration for Sepolia testnet
export const DEFAULT_CONTRACT_CONFIG: ContractConfig = {
  tripFactoryAddress: '0x04b307e55A67b7a2704667BAf64091AB54ee5B82',
  streamingLedgerAddress: '0x056D004a46972F106fa420309C1ea91f44406272',
  chainId: 11155111, // Sepolia testnet
  rpcUrl: 'https://lb.drpc.org/sepolia/AplHGB2v9khYpYVNxc5za0FG8GqzeK8R8IrYIgaNGuYu'
};
