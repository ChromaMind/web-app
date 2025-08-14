"use client";
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import type { Token } from '@/types/nft';
import { PlayIcon, PauseIcon, MusicalNoteIcon, StarIcon } from '@heroicons/react/24/solid';
import { EyeIcon, HeartIcon, ShareIcon, CogIcon } from '@heroicons/react/24/outline';
import { usePlayer } from '@/context/PlayerProvider';

interface OwnedNFTCardProps {
  token: Token;
}

export function OwnedNFTCard({ token }: OwnedNFTCardProps) {
  const { address, isConnected } = useAccount();
  const { loadSession, isPlaying, currentSession } = usePlayer();
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showOwnerMenu, setShowOwnerMenu] = useState(false);
  
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

  const handleShare = () => {
    // Share functionality
    if (navigator.share) {
      navigator.share({
        title: token.metadata.name,
        text: `Check out my NFT: ${token.metadata.name}`,
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isOwner) {
    return null; // Don't render if user doesn't own this token
  }

  return (
    <div 
      className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Section */}
      <div className="relative aspect-square bg-gradient-to-br from-green-100 to-blue-100">
        <img
          src={token.metadata.image || '/images/default-nft.jpg'}
          alt={token.metadata.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/images/default-nft.jpg';
          }}
        />
        
        {/* Owner Star Badge */}
        <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-green-500 text-white text-xs font-medium flex items-center gap-1">
          <StarIcon className="w-3 h-3" />
          Owner
        </div>
        
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
            <span className="text-slate-500">Creator:</span>
            <span className="ml-2 font-medium text-slate-900">
              {formatAddress(token.creator)}
            </span>
          </div>
        </div>

        {/* Owner Benefits */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <h4 className="text-sm font-medium text-green-800 mb-2">Owner Benefits</h4>
          <ul className="text-xs text-green-700 space-y-1">
            <li>• Free unlimited access to audio</li>
            <li>• Earn royalties from secondary sales</li>
            <li>• Exclusive owner-only features</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={handlePlayPause}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              isCurrentlyPlaying
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            <MusicalNoteIcon className="w-4 h-4" />
            {isCurrentlyPlaying ? 'Stop' : 'Play'}
          </button>
          
          <button 
            onClick={() => setShowOwnerMenu(!showOwnerMenu)}
            className="px-4 py-2 border border-green-300 rounded-lg text-green-700 hover:bg-green-50 transition-colors"
          >
            <CogIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Secondary Actions */}
        <div className="flex gap-2">
          <button className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors text-sm">
            <EyeIcon className="w-4 h-4 inline mr-1" />
            View Details
          </button>
          
          <button 
            onClick={handleShare}
            className="px-3 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ShareIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Owner Menu */}
        {showOwnerMenu && (
          <div className="mt-3 p-3 bg-white border border-slate-200 rounded-lg">
            <h5 className="text-sm font-medium text-slate-900 mb-2">Owner Actions</h5>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded transition-colors">
                Transfer NFT
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded transition-colors">
                List for Sale
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded transition-colors">
                View Earnings
              </button>
            </div>
          </div>
        )}

        {/* Mint Date */}
        <div className="mt-3 text-xs text-slate-500">
          Minted: {new Date(token.mintedAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
