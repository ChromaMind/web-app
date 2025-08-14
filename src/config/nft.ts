// NFT Platform Configuration

export interface NFTConfig {
  // Network Configuration
  network: {
    chainId: number;
    name: string;
    rpcUrl: string;
    explorerUrl: string;
    nativeCurrency: {
      name: string;
      symbol: string;
      decimals: number;
    };
  };

  // Contract Addresses
  contracts: {
    tripFactory: string;
    streamingLedger: string;
    weth?: string; // Wrapped ETH for payments
  };

  // IPFS Configuration
  ipfs: {
    gateway: string;
    pinataJwt: string;
    pinataGateway: string;
  };

  // Platform Configuration
  platform: {
    name: string;
    description: string;
    version: string;
    maxFileSize: number;
    supportedAudioTypes: string[];
    supportedImageTypes: string[];
    defaultRoyaltyPercentage: number;
    earningsSplit: {
      owner: number;
      creator: number;
    };
  };

  // API Configuration
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
  };
}

// Development Configuration (Sepolia Testnet)
export const DEV_CONFIG: NFTConfig = {
  network: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: 'https://lb.drpc.org/sepolia/AplHGB2v9khYpYVNxc5za0FG8GqzeK8R8IrYIgaNGuYu',
    explorerUrl: 'https://sepolia.etherscan.io',
      nativeCurrency: {
    name: 'Sepolia Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  },
  contracts: {
    tripFactory: process.env.NEXT_PUBLIC_TRIP_FACTORY_ADDRESS || '0x04b307e55A67b7a2704667BAf64091AB54ee5B82',
    streamingLedger: process.env.NEXT_PUBLIC_STREAMING_LEDGER_ADDRESS || '0x056D004a46972F106fa420309C1ea91f44406272',
    weth: process.env.NEXT_PUBLIC_WETH_ADDRESS || '0x0000000000000000000000000000000000000000',
  },
  ipfs: {
    gateway: process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/',
    pinataJwt: process.env.NEXT_PUBLIC_PINATA_JWT || '',
    pinataGateway: process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs/',
  },
  platform: {
    name: 'ChromaMind',
    description: 'Web3 Audio-Visual Experience Platform',
    version: '1.0.0',
    maxFileSize: 50 * 1024 * 1024, // 50MB
    supportedAudioTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'],
    supportedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    defaultRoyaltyPercentage: 10,
    earningsSplit: {
      owner: 0.7,    // 70% to NFT owner
      creator: 0.3   // 30% to collection creator
    },
  },
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
  },
};

// Production Configuration (Polygon Mainnet)
export const PROD_CONFIG: NFTConfig = {
  network: {
    chainId: 137,
    name: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
  },
  contracts: {
    tripFactory: process.env.NEXT_PUBLIC_TRIP_FACTORY_ADDRESS || '0x0000000000000000000000000000000000000000',
    streamingLedger: process.env.NEXT_PUBLIC_STREAMING_LEDGER_ADDRESS || '0x0000000000000000000000000000000000000000',
    weth: process.env.NEXT_PUBLIC_WETH_ADDRESS || '0x0000000000000000000000000000000000000000',
  },
  ipfs: {
    gateway: process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/',
    pinataJwt: process.env.NEXT_PUBLIC_PINATA_JWT || '',
    pinataGateway: process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs/',
  },
  platform: {
    name: 'ChromaMind',
    description: 'Web3 Audio-Visual Experience Platform',
    version: '1.0.0',
    maxFileSize: 50 * 1024 * 1024, // 50MB
    supportedAudioTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'],
    supportedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    defaultRoyaltyPercentage: 10,
    earningsSplit: {
      owner: 0.7,    // 70% to NFT owner
      creator: 0.3   // 30% to collection creator
    },
  },
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
  },
};

// Get configuration based on environment
export function getNFTConfig(): NFTConfig {
  if (process.env.NODE_ENV === 'production') {
    return PROD_CONFIG;
  }
  return DEV_CONFIG;
}

// Export current configuration
export const nftConfig = getNFTConfig();

// Network-specific utilities
export const NETWORKS = {
  1: {
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/your-api-key',
    explorerUrl: 'https://etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  5: {
    name: 'Goerli Testnet',
    rpcUrl: 'https://goerli.infura.io/v3/your-api-key',
    explorerUrl: 'https://goerli.etherscan.io',
    nativeCurrency: { name: 'Goerli Ether', symbol: 'ETH', decimals: 18 },
  },
  137: {
    name: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  },
  80001: {
    name: 'Mumbai Testnet',
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    explorerUrl: 'https://mumbai.polygonscan.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  },
  11155111: {
    name: 'Sepolia Testnet',
    rpcUrl: 'https://lb.drpc.org/sepolia/AplHGB2v9khYpYVNxc5za0FG8GqzeK8R8IrYIgaNGuYu',
    explorerUrl: 'https://sepolia.etherscan.io',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  },
  31337: {
    name: 'Local Anvil Network',
    rpcUrl: 'http://127.0.0.1:8545',
    explorerUrl: 'http://127.0.0.1:8545',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
} as const;

export type NetworkId = keyof typeof NETWORKS;

// Contract ABI snippets for common functions
export const CONTRACT_ABIS = {
  // ERC-721 standard functions
  erc721: [
    'function name() external view returns (string)',
    'function symbol() external view returns (string)',
    'function ownerOf(uint256 tokenId) external view returns (address)',
    'function totalSupply() external view returns (uint256)',
    'function balanceOf(address owner) external view returns (uint256)',
    'function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)',
    'function tokenByIndex(uint256 index) external view returns (uint256)',
    'function transferFrom(address from, address to, uint256 tokenId) external',
    'function safeTransferFrom(address from, address to, uint256 tokenId) external',
    'function approve(address to, uint256 tokenId) external',
    'function getApproved(uint256 tokenId) external view returns (address)',
    'function setApprovalForAll(address operator, bool approved) external',
    'function isApprovedForAll(address owner, address operator) external view returns (bool)',
  ],

  // ERC-2981 royalty functions
  erc2981: [
    'function royaltyInfo(uint256 tokenId, uint256 salePrice) external view returns (address receiver, uint256 royaltyAmount)',
    'function supportsInterface(bytes4 interfaceId) external view returns (bool)',
  ],

  // ERC-721Enumerable functions
  erc721Enumerable: [
    'function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)',
    'function tokenByIndex(uint256 index) external view returns (uint256)',
    'function totalSupply() external view returns (uint256)',
  ],
} as const;

// Gas estimation constants
export const GAS_ESTIMATES = {
  createCollection: 500000,    // Gas estimate for creating a collection
  mintToken: 150000,           // Gas estimate for minting a token
  setBaseURI: 50000,           // Gas estimate for setting base URI
  transferToken: 100000,       // Gas estimate for transferring a token
  approveToken: 50000,         // Gas estimate for approving a token
  depositCredits: 100000,      // Gas estimate for depositing credits
  withdrawEarnings: 150000,    // Gas estimate for withdrawing earnings
} as const;

// Platform limits and constraints
export const PLATFORM_LIMITS = {
  maxCollectionSupply: 10000,           // Maximum tokens per collection
  minCollectionPrice: '0.001',          // Minimum price in ETH
  maxCollectionPrice: '100',            // Maximum price in ETH
  maxRoyaltyPercentage: 1000,           // Maximum royalty percentage in basis points (100%)
  minRoyaltyPercentage: 0,              // Minimum royalty percentage in basis points (0%)
  maxFileSize: 50 * 1024 * 1024,       // Maximum file size (50MB)
  maxCollectionNameLength: 100,         // Maximum collection name length
  maxCollectionDescriptionLength: 1000, // Maximum collection description length
  maxTagsPerCollection: 10,             // Maximum tags per collection
} as const;

// Error messages
export const ERROR_MESSAGES = {
  // File upload errors
  FILE_TOO_LARGE: 'File size exceeds the maximum limit of 50MB',
  INVALID_FILE_TYPE: 'File type is not supported',
  UPLOAD_FAILED: 'File upload failed. Please try again',
  
  // Collection errors
  INVALID_COLLECTION_DATA: 'Invalid collection data provided',
  COLLECTION_CREATION_FAILED: 'Failed to create collection',
  COLLECTION_NOT_FOUND: 'Collection not found',
  INVALID_ROYALTY: 'Royalty percentage must be between 0 and 1000 basis points (0-100%)',
  
  // Minting errors
  INSUFFICIENT_FUNDS: 'Insufficient funds for minting',
  MINTING_FAILED: 'Token minting failed',
  COLLECTION_SOLD_OUT: 'Collection is sold out',
  
  // Access control errors
  ACCESS_DENIED: 'Access denied to this content',
  INSUFFICIENT_CREDITS: 'Insufficient credits for access',
  INVALID_SIGNATURE: 'Invalid signature provided',
  
  // Network errors
  NETWORK_ERROR: 'Network error. Please check your connection',
  CONTRACT_ERROR: 'Smart contract interaction failed',
  TRANSACTION_FAILED: 'Transaction failed',
  
  // General errors
  UNKNOWN_ERROR: 'An unknown error occurred',
  VALIDATION_ERROR: 'Validation failed',
  AUTHENTICATION_ERROR: 'Authentication required',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  COLLECTION_CREATED: 'Collection created successfully!',
  TOKEN_MINTED: 'Token minted successfully!',
  FILE_UPLOADED: 'File uploaded successfully!',
  ACCESS_GRANTED: 'Access granted successfully!',
  CREDITS_DEPOSITED: 'Credits deposited successfully!',
  EARNINGS_CLAIMED: 'Earnings claimed successfully!',
  TRANSACTION_CONFIRMED: 'Transaction confirmed!',
} as const;

// Validation patterns
export const VALIDATION_PATTERNS = {
  // Ethereum address validation
  ETH_ADDRESS: /^0x[a-fA-F0-9]{40}$/,
  
  // IPFS CID validation (basic)
  IPFS_CID: /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/,
  
  // Collection name validation (alphanumeric + spaces + hyphens)
  COLLECTION_NAME: /^[a-zA-Z0-9\s\-_]+$/,
  
  // Collection symbol validation (alphanumeric + hyphens)
  COLLECTION_SYMBOL: /^[a-zA-Z0-9\-]+$/,
} as const;

// Export everything
export default nftConfig;
