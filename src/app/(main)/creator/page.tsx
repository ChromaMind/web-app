"use client";

import { useState } from 'react';
import { TripUploader } from '@/components/creator/TripUploader';
import { PatternGenerator } from '@/components/creator/PatternGenerator';
import { RocketLaunchIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

export default function CreatorPage() {
  const [activeTab, setActiveTab] = useState<'deploy' | 'generate'>('deploy');

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto py-8 px-4">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Creator Studio</h1>
          <p className="text-xl text-slate-600">Build and deploy your audio-visual NFT experiences</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg p-1 shadow-lg">
            <button
              onClick={() => setActiveTab('deploy')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'deploy'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <RocketLaunchIcon className="h-5 w-5" />
              Upload Trip
            </button>
            <button
              onClick={() => setActiveTab('generate')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'generate'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <DocumentTextIcon className="h-5 w-5" />
              Generate Patterns
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {activeTab === 'deploy' && (
            <div>
              <TripUploader />
            </div>
          )}
          
          {activeTab === 'generate' && (
            <div>
              <PatternGenerator />
            </div>
          )}
        </div>

        {/* Creator Guide */}
        <div className="mt-12 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">🎯 Creator Workflow</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold text-lg">1</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Generate Patterns</h3>
              <p className="text-sm text-slate-600">
                Use the pattern generator to create LED animation data for your audio trip
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 font-bold text-lg">2</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Prepare Files</h3>
              <p className="text-sm text-slate-600">
                Upload your audio file (MP3) and download the generated pattern JSON
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-purple-600 font-bold text-lg">3</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Upload Trip</h3>
              <p className="text-sm text-slate-600">
                Upload your trip as a limited edition NFT with synchronized audio and visual data
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">💡 Pro Tips</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use 60 FPS for smooth LED animations</li>
              <li>• Test different pattern combinations for dynamic experiences</li>
              <li>• Consider your target audience when setting mint price and supply</li>
              <li>• Validate your pattern data before deployment</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
