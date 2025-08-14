// NFT Platform Types

// Collection/Trip Types
export interface Collection {
  id: string;
  contractAddress: string;
  name: string;
  symbol: string;
  description: string;
  creator: string;
  maxSupply: number;
  currentSupply: number;
  price: string; // Price in ETH
  audioCid: string; // IPFS CID for audio file
  patternCid: string; // IPFS CID for LED pattern file
  metadataCid: string; // IPFS CID for metadata
  createdAt: string;
  imageUrl: string;
  isActive: boolean;
  royaltyPercentage?: number; // Creator royalty percentage
  tags?: string[];
  category?: string;
}

export interface CollectionMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string; // IPFS URL
  external_url?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

// Token/NFT Types
export interface Trip extends Collection{
  id: string;
  tokenId: string;
  collectionAddress: string;
  owner: string;
  creator: string;
  description: string;
  imageUrl: string;
  name: string;
  price: string;
  royaltyPercentage: number;
  mintedAt: string;
  isListed?: boolean;
  listingPrice?: string;
}

export interface TokenMetadata {
  name: string;
  description: string;
  image: string; // IPFS URL
  audio: string; // IPFS URL
  pattern: string; // IPFS URL
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

// User Types
export interface User {
  address: string;
  username?: string;
  avatar?: string;
  bio?: string;
  createdAt: string;
  isCreator: boolean;
  collections?: Collection[];
  ownedTokens?: Trip[];
}

export interface UserCredits {
  address: string;
  credits: number; // ETH balance
  lastUpdated: string;
  totalEarned: number;
  totalSpent: number;
}

// Earnings Types
export interface Earnings {
  id: string;
  tokenId: string;
  collectionAddress: string;
  owner: string;
  creator: string;
  amount: string; // ETH amount
  timestamp: string;
  isClaimed: boolean;
  claimTransactionHash?: string;
  type: 'listening' | 'transfer' | 'minting';
}

export interface EarningsSummary {
  totalUnclaimed: string;
  totalClaimed: string;
  totalEarned: string;
  recentEarnings: Earnings[];
}

// Access Control Types
export interface AccessRequest {
  signature: string;
  message: string;
  paymentToken?: string;
  collectionAddress: string;
}

export interface AccessResponse {
  access: 'granted' | 'denied';
  type: 'owner' | 'paid' | 'denied';
  tokenId?: string;
  collectionAddress?: string;
  audioCid?: string;
  patternCid?: string;
  creditsDeducted?: number;
  remainingCredits?: number;
  message: string;
  error?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    nextPage: number | null;
    prevPage: number | null;
  };
  filters?: Record<string, any>;
}

export interface CollectionsResponse extends PaginatedResponse<Collection> {}

// Earnings Claim Types
export interface ClaimRequest {
  userAddress: string;
}

export interface ClaimVoucher {
  amount: string;
  signature: string;
  messageHash: string;
}

export interface ClaimResponse {
  success: boolean;
  userAddress: string;
  totalAmount: string;
  messageHash: string;
  signature: string;
  voucher: ClaimVoucher;
  message: string;
  earningsCount: number;
}

// File Upload Types
export interface FileUploadRequest {
  file: File;
  type: 'audio' | 'pattern' | 'image' | 'metadata';
  metadata?: Record<string, any>;
}

export interface FileUploadResponse {
  hash: string; // IPFS CID
  size: number;
  path: string;
  url: string;
  filename: string;
  type: string;
}

// Smart Contract Types
export interface ContractConfig {
  tripFactoryAddress: string;
  streamingLedgerAddress: string;
  chainId: number;
  rpcUrl: string;
}

export interface CreateCollectionRequest {
  name: string;
  symbol: string;
  maxSupply: number;
  price: bigint; // BigInt for wei amount
  audioCid?: string;
  patternCid?: string;
  metadataCid?: string;
  royaltyPercentage: number; // In basis points (1000 = 10%)
}

export interface MintRequest {
  collectionAddress: string;
  recipient: string;
  quantity: number;
}

// Event Types
export interface CollectionCreatedEvent {
  collectionAddress: string;
  creator: string;
  name: string;
  symbol: string;
  maxSupply: number;
  price: string;
  blockNumber: number;
  transactionHash: string;
}

export interface TokenMintedEvent {
  collectionAddress: string;
  tokenId: string;
  owner: string;
  blockNumber: number;
  transactionHash: string;
}

export interface EarningsClaimedEvent {
  userAddress: string;
  amount: string;
  blockNumber: number;
  transactionHash: string;
}

// Filter and Query Types
export interface CollectionFilters {
  creator?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  isActive?: boolean;
  tags?: string[];
}

export interface CollectionSortOptions {
  sortBy: 'createdAt' | 'name' | 'price' | 'currentSupply' | 'maxSupply';
  sortOrder: 'asc' | 'desc';
}

export interface SearchQuery {
  query: string;
  filters?: CollectionFilters;
  sort?: CollectionSortOptions;
  page?: number;
  limit?: number;
}

// Error Types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// Web3 Types
export interface WalletConnection {
  address: string;
  chainId: number;
  isConnected: boolean;
  connector?: any;
}

export interface TransactionStatus {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  confirmations: number;
  blockNumber?: number;
  gasUsed?: string;
  effectiveGasPrice?: string;
}

// Utility Types
export type NetworkId = 1 | 5 | 137 | 80001; // Mainnet, Goerli, Polygon, Mumbai

export type FileType = 'audio' | 'pattern' | 'image' | 'metadata';

export type AccessType = 'owner' | 'paid' | 'denied';

export type EarningsType = 'listening' | 'transfer' | 'minting';

// Constants
export const SUPPORTED_NETWORKS: Record<NetworkId, string> = {
  1: 'Ethereum Mainnet',
  5: 'Goerli Testnet',
  137: 'Polygon Mainnet',
  80001: 'Mumbai Testnet'
};

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const SUPPORTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'];

export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const DEFAULT_ROYALTY_PERCENTAGE = 1000; // 10% in basis points (1000 = 10%)

export const EARNINGS_SPLIT = {
  OWNER: 0.7,    // 70% to NFT owner
  CREATOR: 0.3   // 30% to collection creator
};
