"use client";
import { useState } from 'react';
import { NFTFeed } from '@/components/nft/NFTFeed';
import { TripFactoryTest } from '@/components/nft/TripFactoryTest';
import { useAccount } from 'wagmi';
import { 
  MusicalNoteIcon, 
  FolderIcon, 
  UserIcon,
  PlusIcon 
} from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function NFTsPage() {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'all' | 'collections' | 'owned'>('all');

  const tabs = [
    {
      id: 'all',
      label: 'All Trips',
      icon: MusicalNoteIcon,
      description: 'Discover all audio-visual experiences'
    },
    {
      id: 'collections',
      label: 'Collections',
      icon: FolderIcon,
      description: 'Browse trip collections'
    },
    {
      id: 'owned',
      label: 'My Trips',
      icon: UserIcon,
      description: 'Your owned trips and collections',
      requiresConnection: true
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Trip Marketplace</h1>
              <p className="text-slate-600 mt-2">
                Discover, collect, and experience audio-visual trips on ChromaMind
              </p>
            </div>
            
            {isConnected && (
              <Link
                href="/creator"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                Create Collection
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isDisabled = tab.requiresConnection && !isConnected;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => !isDisabled && setActiveTab(tab.id as any)}
                  disabled={isDisabled}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  } ${
                    isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Descriptions */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`${activeTab === tab.id ? 'block' : 'hidden'}`}
            >
              <p className="text-slate-600">{tab.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {/* Temporary test component */}
        <TripFactoryTest />
        
        {/* NFT Feed */}
        <NFTFeed view={activeTab} />
      </div>

      {/* Connection Required Message */}
      {!isConnected && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg">
          <p className="text-sm">
            Connect your wallet to view your trips and collections
          </p>
        </div>
      )}
    </div>
  );
}
