"use client";

import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { CloudArrowUpIcon, DocumentTextIcon, MusicalNoteIcon, RocketLaunchIcon, ClipboardDocumentIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { uploadToIPFS, uploadJSONToIPFS, testPinataConnection, type IPFSUploadResult } from '@/services/ipfsService';
import { createContractService, DEFAULT_CONTRACT_CONFIG } from '@/services/contractService';

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  audio: string;
  streaming_data: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  external_url: string;
}

interface DeployFormData {
  name: string;
  description: string;
  category: string;
  intensity: string;
  duration: number;
  maxSupply: number;
  mintPrice: string;
  audioFile: File | null;
  patternFile: File | null;
}

export function TripUploader() {
  const { address } = useAccount();
  const [formData, setFormData] = useState<DeployFormData>({
    name: '',
    description: '',
    category: '',
    intensity: '',
    duration: 0,
    maxSupply: 100,
    mintPrice: '0.01',
    audioFile: null,
    patternFile: null,
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deployedMetadata, setDeployedMetadata] = useState<NFTMetadata | null>(null);
  const [deployedTokenId, setDeployedTokenId] = useState<number | null>(null);

  // Contract deployment state
  const [isDeploying, setIsDeploying] = useState(false);
  const [isDeployed, setIsDeployed] = useState(false);
  const [deployedContractAddress, setDeployedContractAddress] = useState<string>('');
  const [deploymentError, setDeploymentError] = useState<string>('');
  const [deploymentTxHash, setDeploymentTxHash] = useState<string>('');

  // File upload handlers
  const handleAudioUpload = useCallback((file: File | null) => {
    if (!file) return;
    if (file.type !== 'audio/mpeg' && file.type !== 'audio/mp3') {
      alert('Please upload an MP3 file');
      return;
    }
    setFormData(prev => ({ ...prev, audioFile: file }));
  }, []);

  const handlePatternUpload = useCallback((file: File | null) => {
    if (!file) return;
    if (file.type !== 'application/json') {
      alert('Please upload a JSON file');
      return;
    }
    setFormData(prev => ({ ...prev, patternFile: file }));
  }, []);

  // IPFS upload state
  const [uploadedFiles, setUploadedFiles] = useState<{
    audio?: IPFSUploadResult;
    pattern?: IPFSUploadResult;
    metadata?: IPFSUploadResult;
  }>({});

  // Copy to clipboard function
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Copied to clipboard!');
    }
  }, []);

  // Deploy to blockchain using TripFactory
  const deployToBlockchain = useCallback(async () => {
    if (!address || !uploadedFiles.metadata) {
      alert('Please connect wallet and upload files first');
      return;
    }

    setIsDeploying(true);
    setDeploymentError('');

    try {
      // Get the signer from the connected wallet
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Create contract service
      const contractService = createContractService(DEFAULT_CONTRACT_CONFIG, signer);

      // Prepare collection data
      const collectionData = {
        name: formData.name,
        symbol: 'TRIP',
        maxSupply: formData.maxSupply,
        price: ethers.parseEther(formData.mintPrice),
        royaltyPercentage: 1000, // 10% royalty
      };

      console.log('Deploying collection with data:', collectionData);

      // Deploy the collection
      const txHash = await contractService.createTripCollection(collectionData);
      setDeploymentTxHash(txHash);

      console.log('Collection deployment transaction:', txHash);

      // Wait for transaction confirmation
      const receipt = await contractService.provider.waitForTransaction(txHash);
      console.log('Transaction confirmed:', receipt);

      // Get the deployed collection address from the event
      const deployedAddress = await contractService.getDeployedCollections();
      const newCollectionAddress = deployedAddress[deployedAddress.length - 1]; // Latest deployed

      setDeployedContractAddress(newCollectionAddress);
      setIsDeployed(true);

      console.log('Collection deployed at:', newCollectionAddress);

      // Set the base URI for the collection
      const baseURI = `ipfs://${uploadedFiles.metadata.hash.replace('/metadata.json', '')}/`;
      await contractService.setBaseURI(newCollectionAddress, baseURI);

      console.log('Base URI set to:', baseURI);

    } catch (error) {
      console.error('Deployment failed:', error);
      setDeploymentError(error instanceof Error ? error.message : 'Deployment failed');
    } finally {
      setIsDeploying(false);
    }
  }, [address, uploadedFiles.metadata, formData]);

  // Test Pinata connection
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const testConnection = useCallback(async () => {
    setIsTestingConnection(true);
    try {
      const isConnected = await testPinataConnection();
      setConnectionStatus(isConnected ? 'success' : 'error');
      if (isConnected) {
        alert('✅ Pinata connection successful!');
      } else {
        alert('❌ Pinata connection failed. Check your JWT token.');
      }
    } catch (error) {
      setConnectionStatus('error');
      alert(`❌ Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTestingConnection(false);
    }
  }, []);

  // Deploy NFT
  const handleDeploy = useCallback(async () => {
    if (!address || !formData.audioFile || !formData.patternFile) {
      alert('Please fill all required fields and upload files');
      return;
    }

    // Check if user is on Sepolia network
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      if (network.chainId !== BigInt(11155111)) { // Sepolia chain ID
        alert('Please switch to Sepolia testnet to deploy your Trip NFT');
        return;
      }
    } catch (error) {
      console.error('Failed to check network:', error);
      alert('Please ensure you are connected to Sepolia testnet');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Upload audio to IPFS
      setUploadProgress(20);
      const audioResult = await uploadToIPFS(formData.audioFile);
      setUploadedFiles(prev => ({ ...prev, audio: audioResult }));
      
      // Step 2: Upload pattern JSON to IPFS
      setUploadProgress(40);
      const patternResult = await uploadToIPFS(formData.patternFile);
      setUploadedFiles(prev => ({ ...prev, pattern: patternResult }));
      
      // Step 3: Generate and upload metadata
      setUploadProgress(60);
      const metadata: NFTMetadata = {
        name: formData.name,
        description: formData.description,
        image: `ipfs://Qm${Math.random().toString(36).substring(2, 15)}`, // Placeholder image
        audio: `ipfs://${audioResult.hash}`,
        streaming_data: `ipfs://${patternResult.hash}`,
        attributes: [
          { trait_type: 'Category', value: formData.category },
          { trait_type: 'Intensity', value: formData.intensity },
          { trait_type: 'Duration', value: `${formData.duration} min` },
          { trait_type: 'Creator', value: address },
          { trait_type: 'Edition', value: `1 of ${formData.maxSupply}` },
          { trait_type: 'Audio Format', value: 'MP3' },
          { trait_type: 'BLE Compatible', value: 'Yes' },
        ],
        external_url: `https://chromamind.app/trips/${formData.name.toLowerCase().replace(/\s+/g, '-')}`,
      };

      const metadataResult = await uploadJSONToIPFS(metadata, 'metadata.json');
      setUploadedFiles(prev => ({ ...prev, metadata: metadataResult }));

      setUploadProgress(80);
      setDeployedMetadata(metadata);

      // Step 4: Deploy to blockchain using TripFactory
      setUploadProgress(90);
      setIsDeploying(true);
      
      try {
        // Get the signer from the connected wallet
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        // Create contract service
        const contractService = createContractService(DEFAULT_CONTRACT_CONFIG, signer);

        // Prepare collection data
        const priceInWei = ethers.parseEther(formData.mintPrice.toString());
        const collectionData = {
          name: formData.name,
          symbol: 'TRIP',
          maxSupply: formData.maxSupply,
          price: priceInWei,
          royaltyPercentage: 1000, // 10% royalty
        };

        console.log('Deploying collection with data:', collectionData);
        console.log('Price in wei:', priceInWei.toString());
        console.log('Price type:', typeof priceInWei);

        // Deploy the collection
        const txHash = await contractService.createTripCollection(collectionData);
        setDeploymentTxHash(txHash);

        console.log('Collection deployment transaction:', txHash);

        // Wait for transaction confirmation
        const receipt = await contractService.provider.waitForTransaction(txHash);
        console.log('Transaction confirmed:', receipt);

        // Get the deployed collection address from the event
        const deployedAddress = await contractService.getDeployedCollections();
        const newCollectionAddress = deployedAddress[deployedAddress.length - 1]; // Latest deployed

        setDeployedContractAddress(newCollectionAddress);
        setIsDeployed(true);

        console.log('Collection deployed at:', newCollectionAddress);

        // Set the base URI for the collection
        const baseURI = `ipfs://${metadataResult.hash.replace('/metadata.json', '')}/`;
        await contractService.setBaseURI(newCollectionAddress, baseURI);

        console.log('Base URI set to:', baseURI);
        setUploadProgress(100);

      } catch (error) {
        console.error('Blockchain deployment failed:', error);
        setDeploymentError(error instanceof Error ? error.message : 'Blockchain deployment failed');
        setIsDeploying(false);
        return;
      }
    } catch (error) {
      console.error('Deployment failed:', error);
      alert(`Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  }, [address, formData]);

  if (!address) {
    return (
      <div className="bg-slate-50 rounded-lg p-8 text-center">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Connect Wallet</h3>
        <p className="text-slate-600">Please connect your wallet to deploy NFTs</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Deploy Your Trip NFT</h1>
        <p className="text-slate-600">Create limited edition audio-visual experiences</p>
      </div>

      {/* Deployment Form */}
      <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
        <h2 className="text-xl font-semibold text-slate-900">Trip Details</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Trip Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Rave Session #001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select category</option>
              <option value="Rave">Rave</option>
              <option value="Meditation">Meditation</option>
              <option value="Workout">Workout</option>
              <option value="Study">Study</option>
              <option value="Sleep">Sleep</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Intensity</label>
            <select
              value={formData.intensity}
              onChange={(e) => setFormData(prev => ({ ...prev, intensity: e.target.value }))}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select intensity</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Extreme">Extreme</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Duration (minutes)</label>
            <input
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="45"
              min="1"
              max="180"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Max Supply</label>
            <input
              type="number"
              value={formData.maxSupply}
              onChange={(e) => setFormData(prev => ({ ...prev, maxSupply: parseInt(e.target.value) || 100 }))}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="100"
              min="1"
              max="10000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Mint Price (ETH)</label>
            <input
              type="text"
              value={formData.mintPrice}
              onChange={(e) => setFormData(prev => ({ ...prev, mintPrice: e.target.value }))}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.01"
              step="0.001"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe your audio-visual experience..."
          />
        </div>

        {/* File Uploads */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-slate-900">Upload Files</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Audio Upload */}
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <MusicalNoteIcon className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <label className="block text-sm font-medium text-slate-700 mb-2">Audio File (MP3)</label>
              <input
                type="file"
                accept=".mp3"
                onChange={(e) => handleAudioUpload(e.target.files?.[0] || null)}
                className="hidden"
                id="audio-upload"
              />
              <label
                htmlFor="audio-upload"
                className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Choose Audio File
              </label>
              {formData.audioFile && (
                <p className="mt-2 text-sm text-green-600">{formData.audioFile.name}</p>
              )}
            </div>

            {/* Pattern JSON Upload */}
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <label className="block text-sm font-medium text-slate-700 mb-2">Pattern Data (JSON)</label>
              <input
                type="file"
                accept=".json"
                onChange={(e) => handlePatternUpload(e.target.files?.[0] || null)}
                className="hidden"
                id="pattern-upload"
              />
              <label
                htmlFor="pattern-upload"
                className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Choose Pattern File
              </label>
              {formData.patternFile && (
                <p className="mt-2 text-sm text-green-600">{formData.patternFile.name}</p>
              )}
            </div>
          </div>
        </div>

        {/* Pinata Connection Test */}
        <div className="border-t border-slate-200 pt-4">
          <h3 className="text-lg font-medium text-slate-900 mb-3">IPFS Connection</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={testConnection}
              disabled={isTestingConnection}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                connectionStatus === 'success'
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : connectionStatus === 'error'
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : 'bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200'
              }`}
            >
              {isTestingConnection ? (
                'Testing...'
              ) : connectionStatus === 'success' ? (
                '✅ Pinata Connected'
              ) : connectionStatus === 'error' ? (
                '❌ Connection Failed'
              ) : (
                '🔗 Test Pinata Connection'
              )}
            </button>
            
            <span className="text-xs text-slate-500">
              {connectionStatus === 'success' 
                ? 'Ready to upload files' 
                : connectionStatus === 'error' 
                ? 'Check your JWT token' 
                : 'Verify IPFS connection'
              }
            </span>
          </div>
        </div>

        {/* Deploy Button */}
        <div className="pt-4">
          <button
            onClick={handleDeploy}
            disabled={isUploading || isDeploying || !formData.name || !formData.audioFile || !formData.patternFile}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {isUploading ? (
              <>
                <CloudArrowUpIcon className="h-6 w-6 animate-bounce" />
                Uploading to IPFS... {uploadProgress}%
              </>
            ) : isDeploying ? (
              <>
                <RocketLaunchIcon className="h-6 w-6 animate-spin" />
                Deploying Smart Contract...
              </>
            ) : (
              <>
                <RocketLaunchIcon className="h-6 w-6" />
                Deploy Trip NFT
              </>
            )}
          </button>
        </div>
      </div>

      {/* Deployment Status */}
      {deployedMetadata && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-4">
            {isDeployed ? '🎉 Trip NFT Deployed Successfully!' : '📁 Files Uploaded to IPFS'}
          </h3>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-green-700">Name:</span>
              <span className="font-medium">{deployedMetadata.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">Category:</span>
              <span className="font-medium">{deployedMetadata.attributes.find(a => a.trait_type === 'Category')?.value}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">Max Supply:</span>
              <span className="font-medium">{formData.maxSupply}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">Mint Price:</span>
              <span className="font-medium">{formData.mintPrice} ETH</span>
            </div>
          </div>

          {/* IPFS Details */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">📁 IPFS Files</h4>
            <div className="space-y-2 text-sm">
              {uploadedFiles.audio && (
                <div className="flex justify-between">
                  <span className="text-blue-700">Audio:</span>
                  <a 
                    href={uploadedFiles.audio.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-mono text-xs"
                  >
                    {uploadedFiles.audio.hash.substring(0, 12)}...
                  </a>
                </div>
              )}
              {uploadedFiles.pattern && (
                <div className="flex justify-between">
                  <span className="text-blue-700">Pattern Data:</span>
                  <a 
                    href={uploadedFiles.pattern.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-mono text-xs"
                  >
                    {uploadedFiles.pattern.hash.substring(0, 12)}...
                  </a>
                </div>
              )}
              {uploadedFiles.metadata && (
                <div className="flex justify-between">
                  <span className="text-blue-700">Metadata:</span>
                  <a 
                    href={uploadedFiles.metadata.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-mono text-xs"
                  >
                    {uploadedFiles.metadata.hash.substring(0, 12)}...
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Smart Contract Info */}
          <div className="mt-4 p-3 bg-purple-50 rounded-lg">
            <h4 className="font-semibold text-purple-900 mb-2">🔗 Smart Contract Data</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-purple-700">Metadata URI:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-purple-600">
                    ipfs://{uploadedFiles.metadata?.hash}
                  </span>
                  <button
                    onClick={() => copyToClipboard(`ipfs://${uploadedFiles.metadata?.hash}`)}
                    className="p-1 text-purple-600 hover:text-purple-800 transition-colors"
                    title="Copy to clipboard"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-700">Base URI:</span>
                <span className="font-mono text-xs text-purple-600">
                  ipfs://{uploadedFiles.metadata?.hash.replace('/metadata.json', '')}/
                </span>
              </div>
            </div>
            <p className="text-xs text-purple-600 mt-2">
              Use these URIs when deploying your smart contract
            </p>
          </div>

          {/* Blockchain Deployment Info */}
          {isDeployed && deployedContractAddress && (
            <div className="mt-4 p-3 bg-blue-100 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">🔗 Blockchain Deployment</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Contract Address:</span>
                  <span className="font-mono text-xs text-blue-600">
                    {deployedContractAddress}
                  </span>
                </div>
                {deploymentTxHash && (
                  <div className="flex justify-between">
                    <span className="text-blue-700">Transaction Hash:</span>
                    <a 
                      href={`https://sepolia.etherscan.io/tx/${deploymentTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-mono text-xs"
                    >
                      {deploymentTxHash.substring(0, 12)}...
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="mt-4 p-3 bg-green-100 rounded-lg">
            <p className="text-sm text-green-800">
              {isDeployed ? (
                <><strong>Success!</strong> Your Trip NFT is now deployed on the blockchain and ready for minting!</>
              ) : (
                <><strong>Next Steps:</strong> Your NFT is now live on IPFS! Deploy your smart contract with the metadata URI above.</>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {deploymentError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-900 mb-2">❌ Deployment Failed</h3>
          <p className="text-red-800 text-sm">{deploymentError}</p>
          <button
            onClick={() => setDeploymentError('')}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Progress Bar */}
      {isUploading && (
        <div className="bg-slate-100 rounded-lg p-4">
          <div className="flex justify-between text-sm text-slate-600 mb-2">
            <span>Upload Progress</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
