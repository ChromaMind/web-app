"use client";
import { useCallback, useMemo } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { ethers } from 'ethers';
import { createContractService, DEFAULT_CONTRACT_CONFIG } from '@/services/contractService';

export function useContractService() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const contractService = useMemo(() => {
    if (!isConnected || !address || !walletClient) {
      return null;
    }

    try {
      // Create ethers signer from wagmi wallet client
      const provider = new ethers.BrowserProvider(walletClient);
      return provider.getSigner().then(signer => {
        return createContractService(DEFAULT_CONTRACT_CONFIG, signer);
      });
    } catch (error) {
      console.error('Error creating ContractService:', error);
      return null;
    }
  }, [isConnected, address, walletClient]);

  const mintNFT = useCallback(async (collectionAddress: string, quantity: number, totalPrice: bigint): Promise<string> => {
    if (!contractService) {
      throw new Error('Wallet not connected');
    }
    const service = await contractService;
    return await service.mintNFT(collectionAddress, quantity, totalPrice);
  }, [contractService]);

  const getCollection = useCallback(async (collectionAddress: string) => {
    if (!contractService) {
      throw new Error('Wallet not connected');
    }
    const service = await contractService;
    return await service.getCollection(collectionAddress);
  }, [contractService]);

  const getTokensForCollection = useCallback(async (collectionAddress: string) => {
    if (!contractService) {
      throw new Error('Wallet not connected');
    }
    const service = await contractService;
    return await service.getTokensForCollection(collectionAddress);
  }, [contractService]);

  const getTokenById = useCallback(async (collectionAddress: string, tokenId: string) => {
    if (!contractService) {
      throw new Error('Wallet not connected');
    }
    const service = await contractService;
    return await service.getTokenById(collectionAddress, tokenId);
  }, [contractService]);

  const getDeployedCollections = useCallback(async () => {
    if (!contractService) {
      throw new Error('Wallet not connected');
    }
    const service = await contractService;
    return await service.getDeployedCollections();
  }, [contractService]);

  return {
    // Service instance
    contractService,
    
    // Connection state
    isConnected,
    address,
    
    // Collection methods
    getCollection,
    getTokensForCollection,
    getTokenById,
    getDeployedCollections,
    
    // NFT methods
    mintNFT,
  };
}
