import type {
  Collection,
  Token,
  UserCredits,
  Earnings,
  AccessRequest,
  AccessResponse,
  ClaimRequest,
  ClaimResponse,
  FileUploadRequest,
  FileUploadResponse,
  CreateCollectionRequest,
  MintRequest,
  CollectionsResponse,
  SearchQuery,
  CollectionFilters,
  CollectionSortOptions
} from '@/types/nft';

/**
 * NFT Platform Service
 * Provides high-level functions for interacting with the NFT platform
 */
export class NFTPlatformService {
  private baseUrl: string;
  private authToken?: string;

  constructor(baseUrl: string = '/api', authToken?: string) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string) {
    this.authToken = token;
  }

  /**
   * Get authentication headers
   */
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Upload file to IPFS
   */
  async uploadFile(request: FileUploadRequest): Promise<FileUploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', request.file);
      formData.append('type', request.type);
      
      if (request.metadata) {
        formData.append('metadata', JSON.stringify(request.metadata));
      }

      const response = await fetch(`${this.baseUrl}/ipfs/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      return await response.json();
    } catch (error) {
      console.error('File upload error:', error);
      throw new Error(`File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload multiple files to IPFS
   */
  async uploadMultipleFiles(requests: FileUploadRequest[]): Promise<FileUploadResponse[]> {
    const uploadPromises = requests.map(request => this.uploadFile(request));
    return Promise.all(uploadPromises);
  }

  /**
   * Get collections with filtering and pagination
   */
  async getCollections(
    filters?: CollectionFilters,
    sort?: CollectionSortOptions,
    page: number = 1,
    limit: number = 10
  ): Promise<CollectionsResponse> {
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              value.forEach(v => params.append(key, v));
            } else {
              params.append(key, String(value));
            }
          }
        });
      }

      if (sort) {
        params.append('sortBy', sort.sortBy);
        params.append('sortOrder', sort.sortOrder);
      }

      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await fetch(`${this.baseUrl}/data/collections?${params.toString()}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch collections');
      }

      return await response.json();
    } catch (error) {
      console.error('Get collections error:', error);
      throw new Error(`Failed to get collections: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get collections by creator
   */
  async getCollectionsByCreator(creatorAddress: string, page: number = 1, limit: number = 10): Promise<CollectionsResponse> {
    return this.getCollections({ creator: creatorAddress }, undefined, page, limit);
  }

  /**
   * Search collections
   */
  async searchCollections(query: SearchQuery): Promise<CollectionsResponse> {
    return this.getCollections(
      query.filters,
      query.sort,
      query.page,
      query.limit
    );
  }

  /**
   * Get collection by address
   */
  async getCollectionByAddress(contractAddress: string): Promise<Collection | null> {
    try {
      const collections = await this.getCollections();
      return collections.data.find(collection => 
        collection.contractAddress.toLowerCase() === contractAddress.toLowerCase()
      ) || null;
    } catch (error) {
      console.error('Get collection by address error:', error);
      throw new Error(`Failed to get collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Request access to collection content
   */
  async requestAccess(request: AccessRequest): Promise<AccessResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/access/${request.collectionAddress}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Access request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Access request error:', error);
      throw new Error(`Access request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Claim earnings
   */
  async claimEarnings(request: ClaimRequest): Promise<ClaimResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/earnings/claim`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Earnings claim failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Earnings claim error:', error);
      throw new Error(`Earnings claim failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user's earnings summary
   */
  async getUserEarningsSummary(userAddress: string): Promise<{
    totalUnclaimed: string;
    totalClaimed: string;
    totalEarned: string;
    recentEarnings: Earnings[];
  }> {
    // This would typically call a dedicated endpoint
    // For now, we'll simulate the response
    return {
      totalUnclaimed: '0.05',
      totalClaimed: '0.15',
      totalEarned: '0.20',
      recentEarnings: []
    };
  }

  /**
   * Create collection metadata
   */
  async createCollectionMetadata(collection: Partial<Collection>): Promise<string> {
    try {
      const metadata = {
        name: collection.name,
        symbol: collection.symbol,
        description: collection.description,
        image: collection.imageUrl,
        external_url: `${window.location.origin}/collection/${collection.contractAddress}`,
        attributes: [
          {
            trait_type: 'Creator',
            value: collection.creator
          },
          {
            trait_type: 'Max Supply',
            value: collection.maxSupply
          },
          {
            trait_type: 'Price',
            value: `${collection.price} ETH`
          },
          {
            trait_type: 'Royalty',
            value: `${(collection.royaltyPercentage || 1000) / 100}%`
          }
        ]
      };

      // Create a JSON file and upload it to IPFS
      const jsonBlob = new Blob([JSON.stringify(metadata, null, 2)], {
        type: 'application/json'
      });
      
      const jsonFile = new File([jsonBlob], 'metadata.json', {
        type: 'application/json'
      });

      const uploadResult = await this.uploadFile({
        file: jsonFile,
        type: 'metadata',
        metadata: { collectionId: collection.id }
      });

      return uploadResult.hash;
    } catch (error) {
      console.error('Create metadata error:', error);
      throw new Error(`Failed to create metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate collection data before creation
   */
  validateCollectionData(data: CreateCollectionRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Collection name is required');
    }

    if (!data.symbol || data.symbol.trim().length === 0) {
      errors.push('Collection symbol is required');
    }

    if (data.maxSupply <= 0) {
      errors.push('Max supply must be greater than 0');
    }

    if (parseFloat(data.price) <= 0) {
      errors.push('Price must be greater than 0');
    }

    if (!data.audioCid) {
      errors.push('Audio file is required');
    }

    if (!data.patternCid) {
      errors.push('Pattern file is required');
    }

    if (data.royaltyPercentage < 0 || data.royaltyPercentage > 1000) {
      errors.push('Royalty percentage must be between 0 and 1000 basis points (0-100%)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get popular collections
   */
  async getPopularCollections(limit: number = 6): Promise<Collection[]> {
    try {
      const collections = await this.getCollections(
        { isActive: true },
        { sortBy: 'currentSupply', sortOrder: 'desc' },
        1,
        limit
      );
      return collections.data;
    } catch (error) {
      console.error('Get popular collections error:', error);
      return [];
    }
  }

  /**
   * Get trending collections
   */
  async getTrendingCollections(limit: number = 6): Promise<Collection[]> {
    try {
      const collections = await this.getCollections(
        { isActive: true },
        { sortBy: 'createdAt', sortOrder: 'desc' },
        1,
        limit
      );
      return collections.data;
    } catch (error) {
      console.error('Get trending collections error:', error);
      return [];
    }
  }

  /**
   * Get user's collections
   */
  async getUserCollections(userAddress: string, page: number = 1, limit: number = 10): Promise<CollectionsResponse> {
    return this.getCollectionsByCreator(userAddress, page, limit);
  }

  /**
   * Get user's owned tokens
   */
  async getUserTokens(userAddress: string): Promise<Token[]> {
    // This would typically call a dedicated endpoint
    // For now, we'll return mock data
    return [];
  }

  /**
   * Check if user can access collection content
   */
  async checkCollectionAccess(
    collectionAddress: string,
    tokenId: string,
    userAddress: string
  ): Promise<{
    canAccess: boolean;
    accessType: 'owner' | 'paid' | 'denied';
    reason?: string;
  }> {
    try {
      // This would typically check blockchain state
      // For now, we'll simulate the check
      return {
        canAccess: true,
        accessType: 'owner',
        reason: 'User owns this token'
      };
    } catch (error) {
      console.error('Check access error:', error);
      return {
        canAccess: false,
        accessType: 'denied',
        reason: 'Failed to check access'
      };
    }
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(contractAddress: string): Promise<{
    totalSupply: number;
    maxSupply: number;
    price: string;
    totalRevenue: string;
    totalMints: number;
    uniqueOwners: number;
  }> {
    // This would typically call blockchain and database
    // For now, we'll return mock data
    return {
      totalSupply: 45,
      maxSupply: 100,
      price: '0.05',
      totalRevenue: '2.25',
      totalMints: 45,
      uniqueOwners: 38
    };
  }

  /**
   * Get user's credit balance
   */
  async getUserCredits(userAddress: string): Promise<UserCredits> {
    // This would typically call the StreamingLedger contract
    // For now, we'll return mock data
    return {
      address: userAddress,
      credits: 0.5,
      lastUpdated: new Date().toISOString(),
      totalEarned: 1.2,
      totalSpent: 0.7
    };
  }

  /**
   * Deposit credits to user account
   */
  async depositCredits(userAddress: string, amount: string): Promise<{ success: boolean; transactionHash?: string }> {
    // This would typically call the StreamingLedger contract
    // For now, we'll simulate success
    return {
      success: true,
      transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    };
  }
}

// Factory function to create NFT platform service
export function createNFTPlatformService(baseUrl?: string, authToken?: string): NFTPlatformService {
  return new NFTPlatformService(baseUrl, authToken);
}

// Default service instance
export const nftPlatformService = createNFTPlatformService();
