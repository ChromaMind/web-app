import { ethers } from 'ethers';
import { createContractService, DEFAULT_CONTRACT_CONFIG } from './contractService';
import { getFileFromIPFS, getPublicGatewayUrl } from './ipfsService';
import type { Collection, Trip } from '@/types/nft';
import { TRIP_NFT_ABI } from '@/config/contracts';


// --- TYPES ---
export type SessionComment = {
  author: string;
  avatarUrl: string;
  text: string;
};

export interface Session {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  duration: number; // in minutes
}

export interface SessionDetails extends Session {
  creator: string;
  category: 'Relaxation' | 'Focus' | 'Energy';
  name: string;
  intensity: 'Mild' | 'Moderate' | 'Intense';
  audioUrl: string;
  events: { time: number; colors: number[][] }[];
  comments: SessionComment[];
}

// --- MOCK DATA (Fallback) ---
const MOCK_SESSION_DETAILS: { [id: string]: SessionDetails } = {
  'nft-001': {
    id: 'nft-001',
    name: 'Oceanic Calm',
    description: 'Gentle blue and green lights synced with calming ocean waves.',
    imageUrl: '/images/oceanic_calm.png',
    duration: 15,
    creator: 'ChromaMind Labs',
    category: 'Relaxation',
    intensity: 'Mild',
    audioUrl: '/audios/rave.mp3',
    events: [ /* ... event data from previous step ... */ ],
    comments: [
      { author: 'ZenMaster', avatarUrl: '/avatars/avatar1.png', text: 'Pure bliss. I felt like I was floating in the ocean. Highly recommended for de-stressing after a long day.' },
      { author: 'LucidDreamer', avatarUrl: '/avatars/avatar2.png', text: 'The color transitions are so smooth. Put me in a perfect state for meditation.' },
    ],
  },
  'nft-002': {
    id: 'nft-002',
    name: 'Forest Focus',
    description: 'Pulsating green and amber lights designed to enhance focus.',
    imageUrl: '/images/forest_focus.png',
    duration: 20,
    creator: 'Dr. Aura Bright',
    category: 'Focus',
    intensity: 'Moderate',
    audioUrl: '/audios/rave.mp3',
    events: [ /* ... event data from previous step ... */ ],
    comments: [
      { author: 'DeepWork', avatarUrl: '/avatars/avatar3.png', text: 'My go-to for deep work sessions. The amber light pulses really help me lock in and ignore distractions. A game-changer.' },
    ],
  },
  'nft-003': {
    id: 'nft-003',
    name: 'Sunrise Energizer',
    description: 'A vibrant sequence of reds and oranges to start your day.',
    imageUrl: '/images/sunrise_energizer.png',
    duration: 10,
    creator: 'ChromaMind Labs',
    category: 'Energy',
    intensity: 'Intense',
    audioUrl: '/audios/rave.mp3',
    events: [ /* ... event data from previous step ... */ ],
    comments: [
      { author: 'MorningGlow', avatarUrl: '/avatars/avatar4.png', text: 'Better than a cup of coffee! The vibrant reds and oranges really wake up my mind. I feel ready to take on the day.' },
      { author: 'Apollo', avatarUrl: '/avatars/avatar1.png', text: 'The intensity is no joke. A powerful and quick way to get energized.' },
    ],
  },
};

// --- SERVICE FUNCTIONS ---

/**
 * Get all collections from blockchain with fallback to mock data
 */
export async function getCollections(): Promise<Collection[]> {
  try {
    // Create a proper provider for read-only operations
    const provider = new ethers.JsonRpcProvider(DEFAULT_CONTRACT_CONFIG.rpcUrl);
    
    // Try to get real blockchain data
    const contractService = createContractService(DEFAULT_CONTRACT_CONFIG, provider as any);
    const deployedAddresses = await contractService.getDeployedCollections();
    
    const collections = await Promise.all(
      deployedAddresses.map(async (address) => {
        try {
          return await contractService.getCollection(address);
        } catch (error) {
          console.error(`Error fetching collection ${address}:`, error);
          return null;
        }
      })
    );

    return collections.filter(Boolean) as Collection[];
  } catch (error) {
    console.error('Failed to fetch collections from blockchain, using mock data:', error);
    return [];
  }
}

/**
 * Get all trips (tokens) from blockchain with fallback to mock data
 */
export async function getTrips(): Promise<Trip[]> {
  try {
    // Create a proper provider for read-only operations
    const provider = new ethers.JsonRpcProvider(DEFAULT_CONTRACT_CONFIG.rpcUrl);
    
    // Try to get real blockchain data
    const contractService = createContractService(DEFAULT_CONTRACT_CONFIG, provider as any);
    const collections = await getCollections();
    
    const allTrips: Trip[] = [];
    for (const collection of collections) {
      try {
        const trips = await contractService.getTokensForCollection(collection.contractAddress);
        allTrips.push(...trips);
      } catch (error) {
        console.error(`Error fetching tokens for collection ${collection.contractAddress}:`, error);
      }
    }

    return allTrips;
  } catch (error) {
    console.error('Failed to fetch trips from blockchain, using mock data:', error);
    return [];
  }
}

/**
 * Get trips owned by a specific address
 */
export async function getTripsForOwner(ownerAddress: string): Promise<Trip[]> {
  try {
    const allTrips = await getTrips();
    return allTrips.filter(trip => 
      trip.owner.toLowerCase() === ownerAddress.toLowerCase()
    );
  } catch (error) {
    console.error('Error filtering trips by owner:', error);
    return [];
  }
}

/**
 * Get sessions for owner (legacy function for My Trips page)
 */
export const getSessionsForOwner = async (ownerAddress: string): Promise<Session[]> => {
  try {
    // Try to get real blockchain data first
    const trips = await getTripsForOwner(ownerAddress);
    
    // Convert blockchain trips to session format
    return trips.map(trip => ({
      id: trip.id,
      name: trip.name,
      description: trip.description,
      imageUrl: getPublicGatewayUrl(trip.imageUrl),
      duration: trip.duration || 15, // Use trip duration or default
    }));
  } catch (error) {
    console.error('Failed to fetch sessions from blockchain, using mock data:', error);
    // Fallback to mock data
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (!ownerAddress) return [];
    return Object.values(MOCK_SESSION_DETAILS).map(({ events, comments, ...session }) => session);
  }
};


export const getCollection = async (collectionAddress: string): Promise<Collection | null> => {
  try {
    const provider = new ethers.JsonRpcProvider(DEFAULT_CONTRACT_CONFIG.rpcUrl);
    const contractService = createContractService(DEFAULT_CONTRACT_CONFIG, provider as any);
    const collection = await contractService.getCollection(collectionAddress);
    return collection;
  } catch (error) {
    console.error('Failed to fetch collection from blockchain:', error);
    return null;
  }
};
export const getTripForCollection = async (collectionAddress: string): Promise<Trip[]> => {
  try {
  const provider = new ethers.JsonRpcProvider(DEFAULT_CONTRACT_CONFIG.rpcUrl);
  const contractService = createContractService(DEFAULT_CONTRACT_CONFIG, provider as any);
  const trips = await contractService.getTokensForCollection(collectionAddress);
  return trips;
  } catch (error) {
    console.error('Failed to fetch trips for collection:', error);
    return [];
  }
};

/**
 * Get trip data by token ID from a collection contract
 * @param collectionAddress - The collection contract address
 * @param tokenId - The token ID to fetch
 * @returns Trip data with metadata
 */
export async function getTripByTokenId(
  collectionAddress: string,
  tokenId: string
): Promise<Trip | null> {
  try {
    // Use the working RPC URL
    const provider = new ethers.JsonRpcProvider('https://lb.drpc.org/sepolia/AplHGB2v9khYpYVNxc5za0FG8GqzeK8R8IrYIgaNGuYu');
    
    const collection = new ethers.Contract(collectionAddress, TRIP_NFT_ABI, provider);
    
    console.log('Fetching tokenURI for:', { collectionAddress, tokenId });
    
    // Get the tokenURI for the specific token
    const tokenURI = await collection.tokenURI(tokenId);
    
    console.log('Raw tokenURI:', tokenURI);
    
    if (!tokenURI) {
      throw new Error('Token URI not found');
    }
    
    // Check if it's already a full URL or just a hash
    let metadataUrl = tokenURI;
    if (tokenURI.startsWith('ipfs://')) {
      metadataUrl = getPublicGatewayUrl(tokenURI);
    } else if (!tokenURI.startsWith('http')) {
      // If it's just a hash, construct the full URL
      metadataUrl = `https://ivory-neat-unicorn-8.mypinata.cloud/ipfs/${tokenURI}`;
    }
    
    console.log('Fetching metadata from:', metadataUrl);
    
    // Fetch the metadata from IPFS
    const response = await fetch(metadataUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }
    
    const responseText = await response.text();
    console.log('Raw response:', responseText.substring(0, 200) + '...');
    
    let metadata;
    try {
      metadata = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      console.error('Response was:', responseText);
      throw new Error('Invalid JSON response from metadata URL');
    }
    
    console.log('Parsed metadata:', metadata);
    console.log(metadata.audio)
    
    // Convert IPFS URIs to gateway URLs
    const audioUrl = metadata.audio ? getPublicGatewayUrl(metadata.audio) : "";
    console.log(audioUrl)
    const streamingDataUrl = metadata.streaming_data ? getPublicGatewayUrl(metadata.streaming_data) : "";
    console.log(streamingDataUrl)
    const imageUrl = metadata.image ? getPublicGatewayUrl(metadata.image) : "";
    console.log(imageUrl)
    
    return {
      id: tokenId,
      tokenId: tokenId,
      collectionAddress: collectionAddress,
      owner: metadata.owner || '0x0000000000000000000000000000000000000000',
      creator: metadata.creator || 'Unknown',
      description: metadata.description || '',
      imageUrl: imageUrl,
      name: metadata.name || `Trip ${tokenId}`,
      price: metadata.price || '0',
      royaltyPercentage: metadata.royaltyPercentage || 0,
      mintedAt: metadata.mintedAt || new Date().toISOString(),
      experienceFee: metadata.experienceFee || 0,
      audioUrl: audioUrl,
      steramingUrl: streamingDataUrl,
      // Collection properties
      contractAddress: collectionAddress,
      symbol: metadata.symbol || 'TRIP',
      maxSupply: metadata.maxSupply || 1000,
      currentSupply: metadata.currentSupply || 0,
      audioCid: metadata.audioCid || '',
      patternCid: metadata.patternCid || '',
      metadataCid: metadata.metadataCid || '',
      createdAt: metadata.createdAt || new Date().toISOString(),
      isActive: metadata.isActive !== undefined ? metadata.isActive : true,
      tags: metadata.tags || [],
      category: metadata.category || 'Focus'
    };
  } catch (error) {
    console.error('Failed to get trip by token ID:', error);
    throw error;
  }
}