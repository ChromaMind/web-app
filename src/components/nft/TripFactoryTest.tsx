"use client";
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { createContractService, DEFAULT_CONTRACT_CONFIG } from '@/services/contractService';

export function TripFactoryTest() {
  const { isConnected, address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  const testTripFactory = async () => {
    setIsLoading(true);
    setError('');
    setResult('');

    try {
      // Create a provider for Sepolia
      const provider = new ethers.JsonRpcProvider(DEFAULT_CONTRACT_CONFIG.rpcUrl);
      
      // Test basic connectivity
      const blockNumber = await provider.getBlockNumber();
      setResult(`Connected to Sepolia! Current block: ${blockNumber}\n`);
      
      // Test TripFactory contract
      const contractService = createContractService(DEFAULT_CONTRACT_CONFIG, provider as any);
      
      setResult(prev => prev + 'Testing TripFactory contract...\n');
      
      // Get collection count
      const collectionCount = await contractService.getCollectionCount();
      setResult(prev => prev + `Collection count: ${collectionCount}\n`);
      
      // Get deployed collections
      const deployedCollections = await contractService.getDeployedCollections();
      setResult(prev => prev + `Deployed collections: ${deployedCollections.length}\n`);
      
      if (deployedCollections.length > 0) {
        setResult(prev => prev + `Collection addresses: ${deployedCollections.join(', ')}\n`);
        
        // Test first collection
        const firstCollection = deployedCollections[0];
        setResult(prev => prev + `\nTesting first collection: ${firstCollection}\n`);
        
        const collectionInfo = await contractService.getCollectionInfo(firstCollection);
        setResult(prev => prev + `Collection info: ${JSON.stringify(collectionInfo, null, 2)}\n`);
      } else {
        setResult(prev => prev + 'No collections deployed yet.\n');
      }
      
    } catch (err) {
      console.error('Test failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const testNetworkSwitch = async () => {
    setIsLoading(true);
    setError('');
    setResult('');

    try {
      // This would test if the user can switch to Sepolia
      setResult('Network switching test - check your wallet to see if Sepolia is available\n');
      
      // Test if we can read from the contract without a signer
      const provider = new ethers.JsonRpcProvider(DEFAULT_CONTRACT_CONFIG.rpcUrl);
      const factoryContract = new ethers.Contract(
        DEFAULT_CONTRACT_CONFIG.tripFactoryAddress,
        ['function getCollectionCount() external view returns (uint256)'],
        provider
      );
      
      const count = await factoryContract.getCollectionCount();
      setResult(prev => prev + `Successfully read from TripFactory: ${count} collections\n`);
      
    } catch (err) {
      console.error('Network test failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Connect Wallet</h3>
        <p className="text-slate-600">Please connect your wallet to test TripFactory connectivity</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">TripFactory Test (Sepolia)</h2>
      
      <div className="space-y-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">Current Configuration</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <div>Network: Sepolia Testnet (Chain ID: {DEFAULT_CONTRACT_CONFIG.chainId})</div>
            <div>RPC URL: {DEFAULT_CONTRACT_CONFIG.rpcUrl}</div>
            <div>TripFactory: {DEFAULT_CONTRACT_CONFIG.tripFactoryAddress}</div>
            <div>StreamingLedger: {DEFAULT_CONTRACT_CONFIG.streamingLedgerAddress}</div>
            <div>Connected Address: {address}</div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={testTripFactory}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test TripFactory'}
        </button>
        
        <button
          onClick={testNetworkSwitch}
          disabled={isLoading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test Network'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <h3 className="font-medium text-red-900 mb-2">Error</h3>
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h3 className="font-medium text-slate-900 mb-2">Test Results</h3>
          <pre className="text-sm text-slate-800 whitespace-pre-wrap">{result}</pre>
        </div>
      )}
    </div>
  );
}
