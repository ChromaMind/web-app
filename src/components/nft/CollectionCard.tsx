"use client";
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import type { Collection } from '@/types/nft';
import { EyeIcon, HeartIcon, MusicalNoteIcon, UsersIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface CollectionCardProps {
  collection: Collection;
}

export function CollectionCard({ collection }: CollectionCardProps) {
  const { address, isConnected } = useAccount();
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  
  // Safety check - ensure collection has required properties
  if (!collection || !collection.name || !collection.contractAddress) {
    console.error('CollectionCard: Invalid collection data:', collection);
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 text-sm">Invalid collection data</p>
      </div>
    );
  }
  
  // Check if user is the creator of this collection
  const isCreator = isConnected && address && 
    collection.creator.toLowerCase() === address.toLowerCase();

  const handleLike = () => {
    setIsLiked(!isLiked);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getCollectionStatus = () => {
    if (isCreator) {
      return { text: 'Your Collection', color: 'text-green-600', bg: 'bg-green-100' };
    }
    if (collection.isActive) {
      return { text: 'Active', color: 'text-blue-600', bg: 'bg-blue-100' };
    }
    return { text: 'Inactive', color: 'text-gray-600', bg: 'bg-gray-100' };
  };

  const status = getCollectionStatus();
  
  // Calculate progress percentage
  const progressPercentage = (collection.maxSupply && collection.maxSupply > 0) 
    ? ((collection.currentSupply || 0) / collection.maxSupply) * 100 
    : 0;

  return (
    <div 
      className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Section */}
      <div className="relative aspect-square bg-gradient-to-br from-purple-100 to-blue-100">
        <img
          src={collection.imageUrl || '/images/sunrise_energizer.png'}
          alt={collection.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/images/sunrise_energizer.png';
          }}
        />
        
        {/* Overlay with collection info */}
        <div className={`absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-300 ${
          isHovered ? 'bg-opacity-30' : ''
        }`}>
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MusicalNoteIcon className="w-5 h-5" />
                <span className="text-sm font-medium">
                  {collection.currentSupply} / {collection.maxSupply}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <UsersIcon className="w-4 h-4" />
                <span className="text-sm">
                  {Math.floor(collection.currentSupply * 0.8)} owners
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Status badge */}
        <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
          {status.text}
        </div>
        
        {/* Like button */}
        <button
          onClick={handleLike}
          className={`absolute top-3 right-3 p-2 rounded-full transition-all duration-200 ${
            isLiked 
              ? 'bg-red-500 text-white' 
              : 'bg-white bg-opacity-90 text-gray-600 hover:bg-opacity-100'
          }`}
        >
          <HeartIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Content Section */}
      <div className="p-4">
        {/* Title and Symbol */}
        <div className="mb-3">
          <h3 className="font-semibold text-slate-900 text-lg mb-1">
            {collection.name}
          </h3>
          <p className="text-sm text-slate-600">
            {collection.symbol} • {formatAddress(collection.contractAddress)}
          </p>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-600 mb-4 line-clamp-2">
          {collection.description || 'No description available'}
        </p>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-600">Minted</span>
            <span className="font-medium text-slate-900">
              {collection.currentSupply || 0} / {collection.maxSupply || 0}
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Collection Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div>
            <span className="text-slate-500">Price:</span>
            <span className="ml-2 font-medium text-slate-900">
              {collection.price ? parseFloat(collection.price).toFixed(4) : '0.0000'} ETH
            </span>
          </div>
          <div>
            <span className="text-slate-500">Royalty:</span>
            <span className="ml-2 font-medium text-slate-900">
              {(collection.royaltyPercentage || 1000) / 100}%
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Link
            href={`/collection/${collection.contractAddress}`}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <EyeIcon className="w-4 h-4" />
            View Collection
          </Link>
          
          {isCreator && (
            <button className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
              <MusicalNoteIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Creator and Date */}
        <div className="mt-3 text-xs text-slate-500">
          <div className="mb-1">
            Creator: {formatAddress(collection.creator)}
          </div>
          <div>
            Created: {new Date(collection.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}
