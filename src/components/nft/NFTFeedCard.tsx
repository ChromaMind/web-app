"use client";
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import type { Token } from '@/types/nft';
import { PlayIcon, PauseIcon, MusicalNoteIcon } from '@heroicons/react/24/solid';
import { EyeIcon, HeartIcon } from '@heroicons/react/24/outline';
import { usePlayer } from '@/context/PlayerProvider';

interface NFTFeedCardProps {
  token: Token;
}

export function NFTFeedCard({ token }: NFTFeedCardProps) {
  const { address, isConnected } = useAccount();
  const { loadSession, isPlaying, currentSession } = usePlayer();
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  
  // Check if this token is currently playing
  const isCurrentlyPlaying = currentSession?.id === token.id;
  
  // Check if user owns this token
  const isOwner = isConnected && address && 
    token.owner.toLowerCase() === address.toLowerCase();

  const handlePlayPause = () => {
    if (isCurrentlyPlaying) {
      // Pause current session
      // You can implement pause functionality here
    } else {
      // Load and play this token
      // For now, we'll create a mock session
      const mockSession = {
        id: token.id,
        name: token.metadata.name,
        description: token.metadata.description,
        audioUrl: token.metadata.audio || '/audio/placeholder.mp3',
        imageUrl: token.metadata.image || '/images/default-nft.jpg',
        duration: 180, // 3 minutes placeholder
        creator: token.creator,
        owner: token.owner,
        collectionAddress: token.collectionAddress,
        tokenId: token.tokenId,
      };
      
      loadSession(mockSession);
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getTokenStatus = () => {
    if (isOwner) {
      return { text: 'You own this', color: 'text-green-600', bg: 'bg-green-100' };
    }
    return { text: 'Available to mint', color: 'text-blue-600', bg: 'bg-blue-100' };
  };

  const status = getTokenStatus();

  return (
    <div 
      className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Section */}
      <div className="relative aspect-square bg-gradient-to-br from-purple-100 to-blue-100">
        <img
          src={token.metadata.image || '/images/default-nft.jpg'}
          alt={token.metadata.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/images/default-nft.jpg';
          }}
        />
        
        {/* Overlay with play button */}
        <div className={`absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center ${
          isHovered ? 'bg-opacity-20' : ''
        }`}>
          <button
            onClick={handlePlayPause}
            className={`p-4 rounded-full bg-white bg-opacity-90 hover:bg-opacity-100 transition-all duration-200 transform ${
              isHovered ? 'scale-110' : 'scale-100'
            }`}
          >
            {isCurrentlyPlaying ? (
              <PauseIcon className="w-8 h-8 text-gray-800" />
            ) : (
              <PlayIcon className="w-8 h-8 text-gray-800 ml-1" />
            )}
          </button>
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
        {/* Title and Collection */}
        <div className="mb-3">
          <h3 className="font-semibold text-slate-900 text-lg mb-1">
            {token.metadata.name}
          </h3>
          <p className="text-sm text-slate-600">
            Collection: {formatAddress(token.collectionAddress)}
          </p>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-600 mb-4 line-clamp-2">
          {token.metadata.description || 'No description available'}
        </p>

        {/* Token Info */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div>
            <span className="text-slate-500">Token ID:</span>
            <span className="ml-2 font-medium text-slate-900">#{token.tokenId}</span>
          </div>
          <div>
            <span className="text-slate-500">Owner:</span>
            <span className="ml-2 font-medium text-slate-900">
              {formatAddress(token.owner)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handlePlayPause}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              isCurrentlyPlaying
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <MusicalNoteIcon className="w-4 h-4" />
            {isCurrentlyPlaying ? 'Stop' : 'Play'}
          </button>
          
          <button className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
            <EyeIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Mint Date */}
        <div className="mt-3 text-xs text-slate-500">
          Minted: {new Date(token.mintedAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
