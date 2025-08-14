"use client";
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { useContractService } from '@/hooks/useContractService';
import { 
  MusicalNoteIcon, 
  UserIcon, 
  CalendarIcon, 
  CurrencyDollarIcon,
  PlayIcon,
  PauseIcon,
  HeartIcon,
  ShareIcon
} from '@heroicons/react/24/outline';

import { createContractService, DEFAULT_CONTRACT_CONFIG } from '@/services/contractService';
import type { Collection, Token } from '@/types/nft';

export default function CollectionPage() {
  const params = useParams();
  const { address, isConnected } = useAccount();
  const contractService = useContractService();
  
  const [collection, setCollection] = useState<Collection | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mintAmount, setMintAmount] = useState(1);
  const [isMinting, setIsMinting] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  const contractAddress = params.contractAddress as string;

  // Helper functions
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatPrice = (price: string) => {
    return parseFloat(price).toFixed(4);
  };

  const userOwnedTokens = tokens.filter(token => 
    token.owner.toLowerCase() === address?.toLowerCase()
  );

  useEffect(() => {
    if (contractAddress) {
      loadCollectionData();
    }
  }, [contractAddress]);

  const loadCollectionData = async () => {
    try {
      setIsLoading(true);
      
      // Create a provider for read-only operations
      const provider = new ethers.JsonRpcProvider(DEFAULT_CONTRACT_CONFIG.rpcUrl);
      const contractService = createContractService(DEFAULT_CONTRACT_CONFIG, provider as any);
      
      // Load collection details
      const collectionData = await contractService.getCollection(contractAddress);
      setCollection(collectionData);
      
      // Load tokens for this collection
      const tokensData = await contractService.getTokensForCollection(contractAddress);
      setTokens(tokensData);
    } catch (error) {
      console.error('Error loading collection data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMint = async () => {
    if (!collection || !isConnected || !contractService) return;
    
    try {
      setIsMinting(true);
      setMintError(null);
      
      const totalPrice = ethers.parseEther(collection.price) * BigInt(mintAmount);
      const txHash = await contractService.mintNFT(contractAddress, mintAmount, totalPrice);
      
      console.log('Minting transaction hash:', txHash);
      // Optionally, you can add logic here to wait for the transaction to be mined
      // and then reload the collection data.
      await loadCollectionData();
      
    } catch (error) {
      console.error('Minting error:', error);
      setMintError(error instanceof Error ? error.message : 'Minting failed');
    } finally {
      setIsMinting(false);
    }
  };

  const handlePlayAudio = async () => {
    if (!collection?.audioCid) return;
    
    try {
      if (isPlaying && currentAudio) {
        currentAudio.pause();
        setIsPlaying(false);
        setCurrentAudio(null);
        return;
      }

      // Create IPFS gateway URL
      const audioUrl = `https://gateway.pinata.cloud/ipfs/${collection.audioCid}`;
      const audio = new Audio(audioUrl);
      
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentAudio(null);
      });
      
      audio.addEventListener('error', () => {
        console.error('Audio playback error');
        setIsPlaying(false);
        setCurrentAudio(null);
      });
      
      await audio.play();
      setIsPlaying(true);
      setCurrentAudio(audio);
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="h-96 bg-slate-200 rounded-lg mb-6"></div>
                <div className="space-y-4">
                  <div className="h-6 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                  <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-32 bg-slate-200 rounded-lg"></div>
                <div className="h-32 bg-slate-200 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold text-slate-900 mb-4">Collection Not Found</h1>
            <p className="text-slate-600">The collection you're looking for doesn't exist or has been removed.</p>
          </div>
        </div>
      </div>
    );
  }

  const isCreator = isConnected && address && 
    collection.creator.toLowerCase() === address.toLowerCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => window.history.back()}
              className="p-2 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              ← Back
            </button>
            <h1 className="text-3xl font-bold text-slate-900">{collection.name}</h1>
            {isCreator && (
              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                Your Collection
              </span>
            )}
          </div>
          <p className="text-lg text-slate-600 max-w-3xl">
            {collection.description}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Collection Image */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="relative aspect-square">
                <img
                  src={collection.imageUrl || '/images/sunrise_energizer.png'}
                  alt={collection.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/images/sunrise_energizer.png';
                  }}
                />
                
                {/* Audio Play Button Overlay */}
                {collection.audioCid && (
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                    <button
                      onClick={handlePlayAudio}
                      className="p-4 bg-white bg-opacity-90 rounded-full shadow-lg hover:bg-opacity-100 transition-all duration-200"
                    >
                      {isPlaying ? (
                        <PauseIcon className="w-8 h-8 text-slate-900" />
                      ) : (
                        <PlayIcon className="w-8 h-8 text-slate-900" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Collection Stats */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Collection Stats</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {collection.currentSupply}
                  </div>
                  <div className="text-sm text-slate-600">Minted</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {collection.maxSupply}
                  </div>
                  <div className="text-sm text-slate-600">Total Supply</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {formatPrice(collection.price)}
                  </div>
                  <div className="text-sm text-slate-600">Price (ETH)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600 mb-1">
                    {(collection.royaltyPercentage || 1000) / 100}%
                  </div>
                  <div className="text-sm text-slate-600">Royalty</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600">Minting Progress</span>
                  <span className="font-medium text-slate-900">
                    {collection.currentSupply} / {collection.maxSupply}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${collection.maxSupply > 0 ? (collection.currentSupply / collection.maxSupply) * 100 : 0}%` 
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Owned Tokens */}
            {userOwnedTokens.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Your Tokens</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userOwnedTokens.map((token) => (
                    <div key={token.id} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-slate-900">{token.metadata.name}</h3>
                        <span className="text-sm text-slate-500">#{token.tokenId}</span>
                      </div>
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                        {token.metadata.description}
                      </p>
                      <div className="text-xs text-slate-500">
                        Minted: {new Date(token.mintedAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Minting Card */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Mint NFT</h3>
              
              {!isConnected ? (
                <div className="text-center py-4">
                  <div className="text-slate-400 mb-3">
                    <UserIcon className="mx-auto h-8 w-8" />
                  </div>
                  <p className="text-slate-600 mb-4">Connect your wallet to mint NFTs from this collection</p>
                  <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                    Connect Wallet
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Amount
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={mintAmount}
                      onChange={(e) => setMintAmount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="text-sm text-slate-600">
                    <div className="flex justify-between mb-1">
                      <span>Price per NFT:</span>
                      <span>{formatPrice(collection.price)} ETH</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Total:</span>
                      <span>{(parseFloat(collection.price) * mintAmount).toFixed(4)} ETH</span>
                    </div>
                  </div>

                  {mintError && (
                    <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                      {mintError}
                    </div>
                  )}

                  <button
                    onClick={handleMint}
                    disabled={isMinting || collection.currentSupply >= collection.maxSupply}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isMinting ? 'Minting...' : 
                     collection.currentSupply >= collection.maxSupply ? 'Sold Out' : 'Mint NFT'}
                  </button>
                </div>
              )}
            </div>

            {/* Collection Info */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Collection Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">Creator:</span>
                  <span className="font-medium text-slate-900">
                    {formatAddress(collection.creator)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">Created:</span>
                  <span className="font-medium text-slate-900">
                    {new Date(collection.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CurrencyDollarIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">Symbol:</span>
                  <span className="font-medium text-slate-900">{collection.symbol}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MusicalNoteIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">Contract:</span>
                  <span className="font-medium text-slate-900 font-mono text-xs">
                    {formatAddress(collection.contractAddress)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
                  <HeartIcon className="w-4 h-4" />
                  Like Collection
                </button>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
                  <ShareIcon className="w-4 h-4" />
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
