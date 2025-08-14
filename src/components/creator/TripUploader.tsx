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
  imageFile: File | null;
  imageHash?: string; // IPFS hash of uploaded image
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
    imageFile: null,
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deployedMetadata, setDeployedMetadata] = useState<NFTMetadata | null>(null);

  // Contract deployment state
  const [isDeploying, setIsDeploying] = useState(false);
  const [isDeployed, setIsDeployed] = useState(false);
  const [deployedContractAddress, setDeployedContractAddress] = useState<string>('');
  const [deploymentError, setDeploymentError] = useState<string>('');

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

  const handleImageUpload = useCallback((file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }
    setFormData(prev => ({ ...prev, imageFile: file }));
  }, []);

  // IPFS upload state
  const [uploadedFiles, setUploadedFiles] = useState<{
    audio?: IPFSUploadResult;
    pattern?: IPFSUploadResult;
    image?: IPFSUploadResult;
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

  // Step 1: Upload image to IPFS first
  const uploadImageFirst = useCallback(async () => {
    if (!formData.imageFile) {
      alert('Please select an image file first');
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);

    try {
      // Upload image to IPFS
      const imageResult = await uploadToIPFS(formData.imageFile);
      setUploadedFiles(prev => ({ ...prev, image: imageResult }));
      setUploadProgress(100);
      
      console.log('Image uploaded to IPFS:', imageResult);
      alert(`✅ Image uploaded successfully! Hash: ${imageResult.hash}`);
      
      // Store the image hash for contract deployment
      setFormData(prev => ({ 
        ...prev, 
        imageHash: `ipfs://${imageResult.hash}` 
      }));

    } catch (error) {
      console.error('Image upload failed:', error);
      alert(`Image upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  }, [formData.imageFile]);

  // Step 2: Deploy the trip NFT contract with the image hash
  const deployTripContract = useCallback(async () => {
    if (!address) {
      alert('Please connect wallet first');
      return;
    }

    if (!formData.name || !formData.maxSupply || !formData.mintPrice) {
      alert('Please fill in all required fields');
      return;
    }

    if (!formData.imageHash) {
      alert('Please upload the image first to get the IPFS hash');
      return;
    }

    setIsDeploying(true);
    setDeploymentError('');

    try {
      // Check if user is on Sepolia network
      if (!window.ethereum) {
        alert('Please install MetaMask or another Web3 wallet');
        return;
      }
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const network = await provider.getNetwork();
      if (network.chainId !== BigInt(11155111)) { // Sepolia chain ID
        alert('Please switch to Sepolia testnet to deploy your Trip NFT');
        return;
      }

      // Get the signer from the connected wallet
      const signer = await provider.getSigner();

      // Create contract service
      const contractService = createContractService(DEFAULT_CONTRACT_CONFIG, signer);

      // Prepare collection data with correct parameters
      const priceInWei = ethers.parseEther(formData.mintPrice.toString());
      const experienceFeeInWei = ethers.parseEther("0.25"); // 0.25 ETH experience fee
      
      console.log('Deploying collection with data:', {
        name: formData.name,
        symbol: 'TRIP',
        maxSupply: formData.maxSupply,
        mintPrice: priceInWei.toString(),
        experienceFee: experienceFeeInWei.toString(),
        creatorExperienceSplit: 50, // 50%
        royaltyFee: 1000, // 10% in basis points
        metadataName: formData.name,
        metadataDescription: formData.description || "Audio-visual experience NFT",
        metadataImageURL: formData.imageHash, // Use the actual uploaded image hash
        metadataExternalURL: `https://app.chromamind.tech/trips/${formData.name.toLowerCase().replace(/\s+/g, '-')}`
      });

      // Deploy the collection with all required parameters in correct order
      const newCollectionAddress = await contractService.createTripCollection({
        name: formData.name,
        symbol: 'TRIP',
        maxSupply: formData.maxSupply,
        price: priceInWei,
        experienceFee: experienceFeeInWei,
        creatorExperienceSplit: 50, // 50%
        royaltyFee: 1000, // 10% in basis points
        metadataName: formData.name,
        metadataDescription: formData.description || "Audio-visual experience NFT",
        metadataImageURL: formData.imageHash, // Use the actual uploaded image hash
        metadataExternalURL: `https://app.chromamind.tech/trips/${formData.name.toLowerCase().replace(/\s+/g, '-')}`
      });
      
      if (newCollectionAddress === 'DEPLOYMENT_SUCCESSFUL_BUT_ADDRESS_UNKNOWN') {
        // Contract deployed but we couldn't get the address
        alert('✅ Contract deployed successfully! However, we could not retrieve the contract address automatically. Please check your wallet for the transaction and manually verify the deployment.');
        setIsDeployed(true);
        setDeployedContractAddress('DEPLOYMENT_SUCCESSFUL');
      } else {
        setDeployedContractAddress(newCollectionAddress);
        setIsDeployed(true);
        console.log('Collection deployed at:', newCollectionAddress);
      }

      // Get transaction hash for display
      const deployedAddresses = await contractService.getDeployedCollections();
      console.log('All deployed collections:', deployedAddresses);

    } catch (error) {
      console.error('Contract deployment failed:', error);
      setDeploymentError(error instanceof Error ? error.message : 'Contract deployment failed');
    } finally {
      setIsDeploying(false);
    }
  }, [address, formData.name, formData.maxSupply, formData.mintPrice, formData.description, formData.imageHash]);

  // Step 3: Upload remaining files to IPFS after contract is deployed
  const uploadFilesToIPFS = useCallback(async () => {
    if (!deployedContractAddress || !formData.audioFile || !formData.patternFile) {
      alert('Please deploy contract first and upload audio and pattern files');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Upload audio to IPFS
      setUploadProgress(33);
      const audioResult = await uploadToIPFS(formData.audioFile);
      setUploadedFiles(prev => ({ ...prev, audio: audioResult }));
      
      // Step 2: Upload pattern JSON to IPFS
      setUploadProgress(66);
      const patternResult = await uploadToIPFS(formData.patternFile);
      setUploadedFiles(prev => ({ ...prev, pattern: patternResult }));
      
      // Step 3: Generate and upload metadata
      setUploadProgress(90);
      const metadata: NFTMetadata = {
        name: formData.name,
        description: formData.description,
        image: formData.imageHash!, // Use the already uploaded image hash
        audio: `ipfs://${audioResult.hash}`,
        streaming_data: `ipfs://${patternResult.hash}`,
        attributes: [
          { trait_type: 'Category', value: formData.category },
          { trait_type: 'Intensity', value: formData.intensity },
          { trait_type: 'Duration', value: `${formData.duration} min` },
          { trait_type: 'Creator', value: address || 'Unknown' },
          { trait_type: 'Edition', value: `1 of ${formData.maxSupply}` },
          { trait_type: 'Audio Format', value: 'MP3' },
          { trait_type: 'BLE Compatible', value: 'Yes' },
        ],
        external_url: `https://app.chromamind.tech/trips/${deployedContractAddress}`,
      };

      const metadataResult = await uploadJSONToIPFS(metadata, 'metadata.json');
      setUploadedFiles(prev => ({ ...prev, metadata: metadataResult }));

      setUploadProgress(100);
      setDeployedMetadata(metadata);

              // Step 5: Set the base URI for the collection
        try {
          const provider = new ethers.BrowserProvider(window.ethereum as any);
        const signer = await provider.getSigner();
        const contractService = createContractService(DEFAULT_CONTRACT_CONFIG, signer);

        // Set the base URI to point to the IPFS directory containing metadata
        const baseURI = `ipfs://${metadataResult.hash.replace('/metadata.json', '')}/`;
        await contractService.setBaseURI(deployedContractAddress, baseURI);

        console.log('Base URI set to:', baseURI);
        alert('✅ Trip NFT deployment complete! Base URI has been set.');

      } catch (error) {
        console.error('Failed to set base URI:', error);
        alert('⚠️ Files uploaded but failed to set base URI. You may need to set it manually.');
      }

    } catch (error) {
      console.error('IPFS upload failed:', error);
      alert(`IPFS upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  }, [deployedContractAddress, formData, address]);

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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Image Upload */}
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <label className="block text-sm font-medium text-slate-700 mb-2">Cover Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e.target.files?.[0] || null)}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Choose Image
              </label>
              {formData.imageFile && (
                <p className="mt-2 text-sm text-green-600">{formData.imageFile.name}</p>
              )}
            </div>

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

        {/* Image Upload Status */}
        {formData.imageHash && (
          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-lg font-medium text-green-900 mb-3">✅ Image Uploaded Successfully</h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-green-700 text-sm">IPFS Hash:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-green-600">
                    {formData.imageHash}
                  </span>
                  <button
                    onClick={() => copyToClipboard(formData.imageHash!)}
                    className="p-1 text-green-600 hover:text-green-800 transition-colors"
                    title="Copy to clipboard"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-green-600 mt-2">
                Ready to deploy smart contract with this image
              </p>
            </div>
          </div>
        )}

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

        {/* Step 1: Upload Image Button */}
        <div className="pt-4">
          <button
            onClick={uploadImageFirst}
            disabled={isUploading || !formData.imageFile}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {isUploading ? (
              <>
                <CloudArrowUpIcon className="h-6 w-6 animate-spin" />
                Uploading Image to IPFS... {uploadProgress}%
              </>
            ) : (
              <>
                <CloudArrowUpIcon className="h-6 w-6" />
                Step 1: Upload Image to IPFS
              </>
            )}
          </button>
        </div>

        {/* Step 2: Deploy Contract Button (only show after image is uploaded) */}
        {formData.imageHash && (
          <div className="pt-4">
            <button
              onClick={deployTripContract}
              disabled={isDeploying || !formData.name || !formData.maxSupply || !formData.mintPrice}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:from-green-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {isDeploying ? (
                <>
                  <RocketLaunchIcon className="h-6 w-6 animate-spin" />
                  Deploying Smart Contract...
                </>
              ) : (
                <>
                  <RocketLaunchIcon className="h-6 w-6" />
                  Step 2: Deploy Trip NFT Contract
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 3: Upload Files Button (only show after contract is deployed) */}
        {isDeployed && deployedContractAddress && deployedContractAddress !== 'DEPLOYMENT_SUCCESSFUL' && (
          <div className="pt-4">
            <button
              onClick={uploadFilesToIPFS}
              disabled={isUploading || !formData.audioFile || !formData.patternFile || !formData.imageFile}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {isUploading ? (
                <>
                  <CloudArrowUpIcon className="h-6 w-6 animate-bounce" />
                  Uploading Audio & Pattern... {uploadProgress}%
                </>
              ) : (
                <>
                  <CloudArrowUpIcon className="h-6 w-6" />
                  Step 3: Upload Audio & Pattern Files
                </>
              )}
            </button>
          </div>
        )}

        {/* Manual Contract Address Retrieval */}
        {isDeployed && deployedContractAddress === 'DEPLOYMENT_SUCCESSFUL' && (
          <div className="pt-4">
            <button
              onClick={async () => {
                try {
                  const provider = new ethers.BrowserProvider(window.ethereum as any);
                  const signer = await provider.getSigner();
                  const contractService = createContractService(DEFAULT_CONTRACT_CONFIG, signer);
                  const deployedCollections = await contractService.getDeployedCollections();
                  if (deployedCollections && deployedCollections.length > 0) {
                    const latestAddress = deployedCollections[deployedCollections.length - 1];
                    setDeployedContractAddress(latestAddress);
                    alert(`✅ Found deployed contract: ${latestAddress}`);
                  } else {
                    alert('No deployed collections found. Please check your wallet transaction history.');
                  }
                } catch (error) {
                  alert(`Failed to retrieve contract address: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              }}
              className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:from-yellow-700 hover:to-orange-700 transition-all duration-200 flex items-center justify-center gap-3"
            >
              🔍 Retrieve Deployed Contract Address
            </button>
          </div>
        )}
      </div>

      {/* Deployment Status */}
      {deployedContractAddress && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-4">
            {isDeployed ? (
              deployedContractAddress === 'DEPLOYMENT_SUCCESSFUL' 
                ? '✅ Contract Deployed (Address Retrieval Needed)' 
                : '🎉 Trip NFT Contract Deployed Successfully!'
            ) : '📋 Contract Deployment'}
          </h3>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-green-700">Name:</span>
              <span className="font-medium">{formData.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">Category:</span>
              <span className="font-medium">{formData.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">Max Supply:</span>
              <span className="font-medium">{formData.maxSupply}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">Mint Price:</span>
              <span className="font-medium">{formData.mintPrice} ETH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">Contract Address:</span>
              <span className="font-mono text-xs text-green-600">
                {deployedContractAddress === 'DEPLOYMENT_SUCCESSFUL' 
                  ? 'Address retrieval needed - use button above' 
                  : deployedContractAddress}
              </span>
            </div>
          </div>

          {/* Next Steps */}
          <div className="mt-4 p-3 bg-blue-100 rounded-lg">
            <p className="text-sm text-blue-800">
              {isDeployed ? (
                <><strong>Next:</strong> Upload your files to IPFS to complete the deployment!</>
              ) : (
                <><strong>Status:</strong> Contract deployment in progress...</>
              )}
            </p>
          </div>
        </div>
      )}

      {/* IPFS Upload Results */}
      {deployedMetadata && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">
            📁 Files Uploaded to IPFS Successfully!
          </h3>
          
          {/* IPFS Details */}
          <div className="space-y-2 text-sm">
            {/* Image was already uploaded in Step 1 */}
            <div className="flex justify-between">
              <span className="text-blue-700">Cover Image:</span>
              <span className="text-blue-600 font-mono text-xs">
                {formData.imageHash?.replace('ipfs://', '').substring(0, 12)}... (Uploaded in Step 1)
              </span>
            </div>
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

          {/* Base URI Info */}
          <div className="mt-4 p-3 bg-purple-50 rounded-lg">
            <h4 className="font-semibold text-purple-900 mb-2">�� Base URI Set</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-purple-700">Base URI:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-purple-600">
                    ipfs://{uploadedFiles.metadata?.hash.replace('/metadata.json', '')}/
                  </span>
                  <button
                    onClick={() => copyToClipboard(`ipfs://${uploadedFiles.metadata?.hash.replace('/metadata.json', '')}/`)}
                    className="p-1 text-purple-600 hover:text-purple-800 transition-colors"
                    title="Copy to clipboard"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <p className="text-xs text-purple-600 mt-2">
              ✅ Your Trip NFT is now fully deployed and ready for minting!
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