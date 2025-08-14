import { ethers } from 'ethers';
import { getPublicGatewayUrl } from '@/services/ipfsService';
import type { 
  ContractConfig, 
  CreateCollectionRequest, 
  MintRequest,
  CollectionCreatedEvent,
  TokenMintedEvent,
  EarningsClaimedEvent 
} from '@/types/nft';
import { getCurrentConfig } from '@/config/environment';

// Smart Contract ABIs (actual deployed contract ABIs)
const TRIP_FACTORY_ABI = [
  {
    "type": "function",
    "name": "createTripCollection",
    "stateMutability": "nonpayable",
    "inputs": [
      { "type": "string", "name": "name" },
      { "type": "string", "name": "symbol" },
      { "type": "uint256", "name": "maxSupply" },
      { "type": "uint256", "name": "mintPrice" },
      { "type": "uint256", "name": "experienceFee" },
      { "type": "uint256", "name": "creatorExperienceSplit" },
      { "type": "uint256", "name": "royaltyFee" },
      { "type": "string", "name": "metadataName" },
      { "type": "string", "name": "metadataDescription" },
      { "type": "string", "name": "metadataImageURL" },
      { "type": "string", "name": "metadataExternalURL" }
    ],
    "outputs": [
      { "type": "address", "name": "" }
    ]
  },
  {
    "type": "function",
    "name": "getDeployedCollections",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      { "type": "address[]", "name": "" }
    ]
  },
  {
    "type": "event",
    "name": "CollectionCreated",
    "anonymous": false,
    "inputs": [
      { "indexed": true, "type": "address", "name": "newCollectionAddress" },
      { "indexed": true, "type": "address", "name": "creator" },
      { "indexed": false, "type": "string", "name": "name" },
      { "indexed": false, "type": "string", "name": "symbol" },
      { "indexed": false, "type": "uint256", "name": "maxSupply" },
      { "indexed": false, "type": "uint256", "name": "mintPrice" },
      { "indexed": false, "type": "uint256", "name": "experienceFee" },
      { "indexed": false, "type": "uint256", "name": "creatorExperienceSplit" },
      { "indexed": false, "type": "uint256", "name": "royaltyFee" }
    ]
  }
];

const TRIP_NFT_ABI = [
  // Core Functions
  {
    "inputs": [{"type": "uint256", "name": "quantity"}],
    "name": "mint",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"type": "uint256", "name": "tokenId"}],
    "name": "payForExperience",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"type": "uint256", "name": "tokenId"}, {"type": "uint256", "name": "newFee"}],
    "name": "setExperienceFee",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // View Functions
  {
    "inputs": [],
    "name": "getPublicMetadata",
    "outputs": [{"type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "experienceFee",
    "outputs": [{"type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "mintPrice",
    "outputs": [{"type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"type": "uint256", "name": "tokenId"}],
    "name": "tokenURI",
    "outputs": [{"type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"type": "uint256", "name": "tokenId"}],
    "name": "ownerOf",
    "outputs": [{"type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "collectionCreator",
    "outputs": [{"type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"type": "string", "name": "newBaseURI"}],
    "name": "setBaseURI",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // ERC-721 Functions
  {
    "inputs": [{"type": "address", "name": "owner"}],
    "name": "balanceOf",
    "outputs": [{"type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [{"type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },

  // Events
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "type": "address", "name": "from"},
      {"indexed": true, "type": "address", "name": "to"},
      {"indexed": true, "type": "uint256", "name": "tokenId"}
    ],
    "name": "Transfer",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "type": "address", "name": "to"},
      {"indexed": true, "type": "uint256", "name": "tokenId"},
      {"indexed": false, "type": "uint256", "name": "quantity"}
    ],
    "name": "Mint",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "type": "address", "name": "user"},
      {"indexed": true, "type": "uint256", "name": "tokenId"},
      {"indexed": false, "type": "uint256", "name": "amount"}
    ],
    "name": "ExperiencePaid",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "getPublicMetadata",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "getTokensByOwner",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const STREAMING_LEDGER_ABI = [
  {
    "type": "function",
    "name": "deposit",
    "stateMutability": "payable",
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function",
    "name": "withdraw",
    "stateMutability": "nonpayable",
    "inputs": [
      { "type": "uint256", "name": "amount" },
      { "type": "bytes", "name": "signature" }
    ],
    "outputs": []
  },
  {
    "type": "event",
    "name": "Deposited",
    "anonymous": false,
    "inputs": [
      { "indexed": true, "type": "address", "name": "user" },
      { "indexed": false, "type": "uint256", "name": "amount" }
    ]
  },
  {
    "type": "event",
    "name": "Withdrawn",
    "anonymous": false,
    "inputs": [
      { "indexed": true, "type": "address", "name": "user" },
      { "indexed": false, "type": "uint256", "name": "amount" }
    ]
  }
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
        request.experienceFee,
        request.creatorExperienceSplit,
        request.royaltyFee,
        request.metadataName,
        request.metadataDescription,
        request.metadataImageURL,
        request.metadataExternalURL
      );

      const receipt = await tx.wait();
      
      console.log('Transaction receipt:', receipt);
      console.log('Transaction logs:', receipt?.logs);
      
      // Find the CollectionCreated event
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = factory.interface.parseLog(log);
          console.log('Parsed log:', parsed);
          return parsed?.name === 'CollectionCreated';
        } catch (error) {
          console.log('Failed to parse log:', error);
          return false;
        }
      });

      console.log('Found CollectionCreated event:', event);
      if (event) {
        const parsed = factory.interface.parseLog(event);
        console.log('Parsed event args:', parsed?.args);
        return parsed?.args?.[0]; // newCollectionAddress
      }

      // Fallback: try to get the deployed address from the transaction
      console.log('Event not found, trying to get address from transaction...');
      
      // Method 1: Try to get from contract creation logs
      if (receipt?.logs && receipt.logs.length > 0) {
        for (const log of receipt.logs) {
          try {
            const parsed = factory.interface.parseLog(log);
            console.log('Alternative log:', parsed);
            if (parsed?.args && parsed.args.length > 0) {
              return parsed.args[0]; // Return first argument which should be the address
            }
          } catch (error) {
            console.log('Failed to parse alternative log:', error);
          }
        }
      }
      
      // Method 2: Try to get from contract creation transaction
      if (receipt?.to === this.config.tripFactoryAddress) {
        console.log('This is a contract creation transaction, checking for contract address...');
        // For contract creation, the new contract address might be in the transaction receipt
        // or we can try to get it from the factory's deployed collections
        try {
          const deployedCollections = await factory.getDeployedCollections();
          console.log('Deployed collections from factory:', deployedCollections);
          if (deployedCollections && deployedCollections.length > 0) {
            // Return the most recently deployed collection
            return deployedCollections[deployedCollections.length - 1];
          }
        } catch (error) {
          console.log('Failed to get deployed collections:', error);
        }
      }
      
      // Method 3: Return a placeholder and let the user know
      console.warn('Could not parse contract address from transaction, but deployment was successful');
      return 'DEPLOYMENT_SUCCESSFUL_BUT_ADDRESS_UNKNOWN';
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

      const [totalSupply, price] = await Promise.all([
        collection.totalSupply(),
        collection.mintPrice()
      ]);

      return {
        totalSupply: totalSupply.toString(),
        maxSupply: '100', // Default value since maxSupply function doesn't exist
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

      const [totalSupply, price, name, symbol, publicMetadata, creator] = await Promise.all([
        collection.totalSupply(),
        collection.mintPrice(),
        collection.name(),
        collection.symbol(),
        collection.getPublicMetadata(),
        collection.collectionCreator()
      ]);
      
      // Since maxSupply function doesn't exist, we'll use a default or try to get it from constructor
      const maxSupply = 100; // Default value, you might want to store this in metadata

      // Try to get collection metadata from IPFS using tokenURI for token 0
      let description = 'A unique audio-visual experience collection';
      let imageUrl = '/images/sunrise_energizer.png';
      const category = 'Audio-Visual';
      const intensity = 'Medium';
      const duration = 'Unknown';

      try {
        if (publicMetadata) {
          const parsedMetadata = JSON.parse(publicMetadata);
          description = parsedMetadata.description || description;
          imageUrl = parsedMetadata.image || imageUrl;
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
        creator: creator,
        maxSupply: Number(maxSupply),
        currentSupply: Number(totalSupply),
        price: ethers.formatEther(price),
        audioCid: '',
        patternCid: '',
        metadataCid: '',
        severity: 'low',
        createdAt: new Date().toISOString(),
        imageUrl: getPublicGatewayUrl(imageUrl),
        isActive: true,
        royaltyFee: 1000, // 10% default
        tags: [category, intensity, duration].filter(Boolean),
        category: category
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

      const [tokenURI, owner, creator] = await Promise.all([
        collection.tokenURI(tokenId),
        collection.ownerOf(tokenId),
        collection.collectionCreator()
      ]);
      
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
      
      return {
        id: `${collectionAddress}-${tokenId}`,
        tokenId: tokenId.toString(),
        collectionAddress,
        owner,
        creator,
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
      const collectionContract = new ethers.Contract(
        collectionAddress,
        TRIP_NFT_ABI,
        this.provider
      );

      const collection = await this.getCollection(collectionAddress);

      const tokens: any[] = [];

      // Get all tokens in the collection
      for (let i = 1; i <= collection.currentSupply; i++) {
        try {
          const tokenId = i; // Since tokenByIndex doesn't exist, assume sequential token IDs
          
          // Get the actual token URI from the contract
          const owner = await collectionContract.ownerOf(tokenId);
          
          // Fetch metadata from IPFS
          let metadata = {
            ...collection,
            owner: owner,
          };
          const token = {...metadata, id: `${collectionAddress}-${tokenId}`,collectionAddress: collectionAddress, tokenId: tokenId.toString(),  mintedAt: new Date().toISOString(), isListed: false}
          console.log('token', token);

          
          tokens.push(token);
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
      console.log('tripFactoryAddress', this.config.tripFactoryAddress);
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
        request.experienceFee,
        request.creatorExperienceSplit,
        request.royaltyFee,
        request.metadataName,
        request.metadataDescription,
        request.metadataImageURL,
        request.metadataExternalURL
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

// Default configuration - automatically uses current environment
export const DEFAULT_CONTRACT_CONFIG: ContractConfig = {
  tripFactoryAddress: getCurrentConfig().contracts.tripFactory,
  streamingLedgerAddress: getCurrentConfig().contracts.streamingLedger,
  chainId: getCurrentConfig().chainId,
  rpcUrl: getCurrentConfig().rpcUrl
};

// Legacy configurations for backward compatibility
export const LOCAL_CONFIG: ContractConfig = {
  tripFactoryAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  streamingLedgerAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  chainId: 31337,
  rpcUrl: 'http://localhost:8545'
};

export const SEPOLIA_CONFIG: ContractConfig = {
  tripFactoryAddress: '0xA3EF656C1BfeF416E5Ba93344e420c6B142CAcb4',
  streamingLedgerAddress: '0x2abEA1c905c8547E4D7e2000257A77e52cB8A4cC',
  chainId: 11155111,
  rpcUrl: 'https://lb.drpc.org/sepolia/AplHGB2v9khYpYVNxc5za0FG8GqzeK8R8IrYIgaNGuYu'
};
