"use client";

import { useState, useEffect } from 'react';
import { CollectionCard } from '@/components/nft/CollectionCard';
import { Loader } from '@/components/core/Loader';
import { getCollections } from '@/services/nftService';
import type { Collection } from '@/types/nft';

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCollections = async () => {
      setIsLoading(true);
      try {
        const data = await getCollections();
        setCollections(data);
      } catch (error) {
        console.error('Failed to fetch collections:', error);
        setCollections([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCollections();
  }, []);

  if (isLoading) return <Loader />;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6 pt-8">
        {collections.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-slate-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No collections yet</h3>
            <p className="text-slate-500">Collections will appear here once they're created.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((collection) => (
              <div key={collection.id} className="w-full">
                <CollectionCard collection={collection} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
