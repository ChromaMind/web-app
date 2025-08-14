"use client";
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import type { Trip } from '@/types/nft';
import { EyeIcon, MusicalNoteIcon, UsersIcon } from '@heroicons/react/24/outline';
import { PlayIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import Image from 'next/image';

interface TripCardProps {
    trip: Trip;
}

export function TripCard({ trip }: TripCardProps) {
    const { address, isConnected } = useAccount();
    const [isHovered, setIsHovered] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [imageError, setImageError] = useState(false);
    console.log('trip image', trip.imageUrl);

    // Safety check - ensure collection has required properties
    if (!trip || !trip.name || !trip.collectionAddress || !trip.tokenId || !trip.owner || !trip.creator || !trip.mintedAt || !trip.description || !trip.imageUrl) {
        console.error('TripCard: Invalid trip data:', trip);
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">Invalid trip data</p>
            </div>
        );
    }

    // Check if user is the creator of this collection
    const isCreator = isConnected && address &&
        trip.creator.toLowerCase() === address.toLowerCase();
    const isOwner = isConnected && address &&
        trip.owner.toLowerCase() === address.toLowerCase();
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
        if (trip.isActive) {
            return { text: 'Active', color: 'text-blue-600', bg: 'bg-blue-100' };
        }
        return { text: 'Inactive', color: 'text-gray-600', bg: 'bg-gray-100' };
    };

    const status = getCollectionStatus();

    const imageSrc = imageError
        ? '/images/sunrise_energizer.png'
        : trip.imageUrl || '/images/sunrise_energizer.png';

    // Calculate progress percentage
    const progressPercentage = (trip.maxSupply && trip.maxSupply > 0)
        ? ((trip.currentSupply || 0) / trip.maxSupply) * 100
        : 0;

    return (
        <div
            className="bg-white rounded-xl shadow-lg overflow-hidden  transition-all duration-300"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Image Section */}
            <div className="relative aspect-square">
                <Image
                    src={trip.imageUrl}
                    alt={trip.name}
                    fill
                    className="object-cover"
                    onError={() => {
                        if (!imageError) setImageError(true);
                    }}
                />
                <div
                    className="absolute inset-0 bg-gradient-to-br from-purple-100 to-blue-100"
                    style={{ zIndex: -1 }}
                />
                {/* Like button */}
                <button
                    onClick={handleLike}
                    className={`absolute top-3 right-3 p-2 rounded-full transition-all duration-200 ${isLiked
                            ? 'bg-red-500 text-white'
                            : 'bg-white bg-opacity-90 text-gray-600 hover:bg-opacity-100'
                        }`}
                >
                    {isOwner? <PlayIcon className="w-4 h-4" />:<EyeIcon className="w-4 h-4" />}
                </button>
            </div>

            {/* Content Section */}
            <div className="p-4">
                {/* Title and Symbol */}
                <div className="mb-3">
                    <h3 className="font-semibold text-slate-900 text-lg mb-1">
                        {trip.name} #{trip.tokenId}
                    </h3>
                </div>

                {/* Description */}
                <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                    {trip.description || 'No description available'}
                </p>

                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-600">Minted</span>
                        <span className="font-medium text-slate-900">
                            {trip.currentSupply || 0} / {trip.maxSupply || 0}
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
                            {trip.price ? parseFloat(trip.price).toFixed(4) : '0.0000'} ETH
                        </span>
                    </div>
                    <div>
                        <span className="text-slate-500">Experience Fee:</span>
                        <span className="ml-2 font-medium text-slate-900">
                            {trip.experienceFee || 0} ETH
                        </span>
                    </div>
                    <div>
                        <span className="text-slate-500">Royalty:</span>
                        <span className="ml-2 font-medium text-slate-900">
                            {(trip.royaltyPercentage || 1000) / 100}%
                        </span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                        <Link
                            href={`/collection/${trip.collectionAddress}/${trip.tokenId}`}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                            <EyeIcon className="w-4 h-4" />
                            Experience Trip
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
                        Creator: {formatAddress(trip.creator)}
                    </div>
                    <div>
                        Owner: {formatAddress(trip.owner)}
                    </div>
                    <div>
                        Minted: {new Date(trip.mintedAt).toLocaleDateString()}
                    </div>
                </div>
            </div>
        </div>
    );
}
