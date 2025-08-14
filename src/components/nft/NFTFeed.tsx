"use client";
import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { nftPlatformService } from '@/services/nftPlatformService';
import { createContractService, DEFAULT_CONTRACT_CONFIG } from '@/services/contractService';
import type { Collection, Token } from '@/types/nft';
import { NFTFeedCard } from './NFTFeedCard';
import { CollectionCard } from './CollectionCard';
import { OwnedNFTCard } from './OwnedNFTCard';
import { Loader } from '@/components/core/Loader';

interface NFTFeedProps {
  view?: 'all' | 'collections' | 'owned';
}

export function NFTFeed({ view = 'all' }: NFTFeedProps) {
  const { address, isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for different data types
  const [collections, setCollections] = useState<Collection[]>([]);
  const [allTrips, setAllTrips] = useState<Token[]>([]);
  const [ownedTrips, setOwnedTrips] = useState<Token[]>([]);
  const [userCollections, setUserCollections] = useState<Collection[]>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Load collections from blockchain
  const loadCollections = useCallback(async () => {
    try {
      if (!isConnected) return;
      
      const provider = new ethers.JsonRpcProvider(DEFAULT_CONTRACT_CONFIG.rpcUrl);
      const contractService = createContractService(DEFAULT_CONTRACT_CONFIG, provider as any);
      
      // Get deployed collections from factory
      console.log('Fetching deployed collections from TripFactory...');
      const deployedAddresses = await contractService.getDeployedCollections();
      const collectionCount = await contractService.getCollectionCount();
      
      console.log(`Found ${collectionCount} collections on blockchain:`, deployedAddresses);
      
      if (deployedAddresses.length === 0) {
        console.log('No collections found, this might be expected for a new deployment');
        setCollections([]);
        return;
      }
      
      // Fetch collection details for each deployed address
      const collectionPromises = deployedAddresses.map(async (contractAddress) => {
        try {
          console.log(`Fetching info for collection: ${contractAddress}`);
          const info = await contractService.getCollectionInfo(contractAddress);
          console.log(`Collection info:`, info);
          
          // Try to get collection name and symbol from the contract
          let collectionName = `Collection ${contractAddress.slice(0, 8)}...`;
          let collectionSymbol = 'TRIP';
          let collectionCreator = '0x0000000000000000000000000000000000000000';
          
          try {
            const collectionContract = new ethers.Contract(
              contractAddress,
              [
                'function name() external view returns (string)',
                'function symbol() external view returns (string)',
                'function owner() external view returns (address)'
              ],
              provider
            );
            
            collectionName = await collectionContract.name();
            collectionSymbol = await collectionContract.symbol();
            collectionCreator = await collectionContract.owner();
          } catch (error) {
            console.log(`Using default names for collection ${contractAddress}`);
          }
          
          // Create a collection object with real data
          const collection: Collection = {
            id: contractAddress,
            contractAddress,
            name: collectionName,
            symbol: collectionSymbol,
            description: 'Audio-visual experience collection',
            creator: collectionCreator,
            maxSupply: parseInt(info.maxSupply),
            currentSupply: parseInt(info.totalSupply),
            price: info.price,
            audioCid: '',
            patternCid: '',
            metadataCid: '',
            createdAt: new Date().toISOString(),
            imageUrl: '/images/default-collection.jpg',
            isActive: true,
            royaltyPercentage: 1000, // 10%
          };
          
          return collection;
        } catch (error) {
          console.error(`Failed to load collection ${contractAddress}:`, error);
          return null;
        }
      });
      
      const loadedCollections = (await Promise.all(collectionPromises)).filter(Boolean) as Collection[];
      setCollections(loadedCollections);
      
      // If user is connected, get their collections
      if (address) {
        const userCollections = loadedCollections.filter(collection => 
          collection.creator.toLowerCase() === address.toLowerCase()
        );
        setUserCollections(userCollections);
      }
      
    } catch (error) {
      console.error('Failed to load collections:', error);
      setError('Failed to load collections from blockchain');
    }
  }, [isConnected, address]);

  // Load all trips from all collections
  const loadAllTrips = useCallback(async () => {
    try {
      if (!isConnected || collections.length === 0) return;
      
      const provider = new ethers.JsonRpcProvider(DEFAULT_CONTRACT_CONFIG.rpcUrl);
      const contractService = createContractService(DEFAULT_CONTRACT_CONFIG, provider as any);
      
      const allTripsData: Token[] = [];
      
      // For each collection, get all trips
      for (const collection of collections) {
        try {
          const collectionContract = new ethers.Contract(
            collection.contractAddress,
            [
              'function totalSupply() external view returns (uint256)',
              'function tokenURI(uint256 tokenId) external view returns (string)',
              'function ownerOf(uint256 tokenId) external view returns (address)',
              'function mintPrice() external view returns (uint256)'
            ],
            provider
          );
          
          const totalSupply = await collectionContract.totalSupply();
          
          // Get each trip
          for (let i = 0; i < totalSupply; i++) {
            try {
              const tokenId = i.toString();
              const owner = await collectionContract.ownerOf(tokenId);
              const tokenURI = await collectionContract.tokenURI(tokenId);
              
              // Try to fetch metadata from IPFS if available
              let tripMetadata = {
                name: `${collection.name} #${tokenId}`,
                description: collection.description,
                image: collection.imageUrl,
                audio: collection.audioCid,
                pattern: collection.patternCid,
              };
              
              if (tokenURI && tokenURI.startsWith('ipfs://')) {
                try {
                  const ipfsHash = tokenURI.replace('ipfs://', '');
                  const metadataResponse = await fetch(`https://ivory-neat-unicorn-8.mypinata.cloud/ipfs/${ipfsHash}`);
                  if (metadataResponse.ok) {
                    const metadata = await metadataResponse.json();
                    tripMetadata = {
                      name: metadata.name || tripMetadata.name,
                      description: metadata.description || tripMetadata.description,
                      image: metadata.image || tripMetadata.image,
                      audio: metadata.audio || tripMetadata.audio,
                      pattern: metadata.pattern || tripMetadata.pattern,
                    };
                  }
                } catch (error) {
                  console.log(`Failed to fetch IPFS metadata for token ${tokenId}:`, error);
                }
              }
              
              const trip: Token = {
                id: `${collection.contractAddress}-${tokenId}`,
                tokenId,
                collectionAddress: collection.contractAddress,
                owner,
                creator: collection.creator,
                metadata: tripMetadata,
                mintedAt: new Date().toISOString(),
              };
              
              allTripsData.push(trip);
            } catch (error) {
              console.error(`Failed to load trip ${i} from collection ${collection.contractAddress}:`, error);
            }
          }
        } catch (error) {
          console.error(`Failed to load trips from collection ${collection.contractAddress}:`, error);
        }
      }
      
      setAllTrips(allTripsData);
      
      // Filter owned trips
      if (address) {
        const userTrips = allTripsData.filter(trip => 
          trip.owner.toLowerCase() === address.toLowerCase()
        );
        setOwnedTrips(userTrips);
      }
      
    } catch (error) {
      console.error('Failed to load trips:', error);
      setError('Failed to load trips from blockchain');
    }
  }, [isConnected, collections, address]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        await loadCollections();
      } catch (error) {
        console.error('Failed to load initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (isConnected) {
      loadData();
    } else {
      setIsLoading(false);
    }
  }, [isConnected, loadCollections]);

  // Load trips after collections are loaded
  useEffect(() => {
    if (collections.length > 0) {
      loadAllTrips();
    }
  }, [collections, loadAllTrips]);

  // Load more data (for pagination)
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    setCurrentPage(prev => prev + 1);
    
    // Simulate loading more data
    setTimeout(() => {
      setIsLoadingMore(false);
      // In a real implementation, you'd fetch more data here
    }, 1000);
  }, [isLoadingMore, hasMore]);

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Connect Wallet</h3>
        <p className="text-slate-600">Please connect your wallet to view NFTs</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-red-600 mb-2">Error</h3>
        <p className="text-slate-600">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const renderContent = () => {
    switch (view) {
      case 'collections':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">Collections</h2>
            {collections.length === 0 ? (
              <p className="text-slate-600 text-center py-8">No collections found</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {collections.map((collection) => (
                  <CollectionCard key={collection.id} collection={collection} />
                ))}
              </div>
            )}
          </div>
        );
        
      case 'owned':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">My Trips</h2>
            {ownedTrips.length === 0 ? (
              <p className="text-slate-600 text-center py-8">You don't own any trips yet</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ownedTrips.map((trip) => (
                  <OwnedNFTCard key={trip.id} token={trip} />
                ))}
              </div>
            )}
            
            <div className="mt-8">
              <h3 className="text-xl font-semibold text-slate-900 mb-4">My Collections</h3>
              {userCollections.length === 0 ? (
                <p className="text-slate-600 text-center py-4">You haven't created any collections yet</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userCollections.map((collection) => (
                    <CollectionCard key={collection.id} collection={collection} />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
        
      default: // 'all'
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">All Trips</h2>
            {allTrips.length === 0 ? (
              <p className="text-slate-600 text-center py-8">No trips found</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allTrips.map((trip) => (
                  <NFTFeedCard key={trip.id} token={trip} />
                ))}
              </div>
            )}
            
            {hasMore && (
              <div className="text-center py-8">
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-slate-600">Total Collections</h3>
          <p className="text-2xl font-bold text-slate-900">{collections.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-slate-600">Total Trips</h3>
          <p className="text-2xl font-bold text-slate-900">{allTrips.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-slate-600">My Trips</h3>
          <p className="text-2xl font-bold text-slate-900">{ownedTrips.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-slate-600">My Collections</h3>
          <p className="text-2xl font-bold text-slate-900">{userCollections.length}</p>
        </div>
      </div>

      {/* Main Content */}
      {renderContent()}
    </div>
  );
}
