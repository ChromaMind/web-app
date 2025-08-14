import { ethers } from 'ethers';
import { createContractService, DEFAULT_CONTRACT_CONFIG } from './contractService';
import { getPublicGatewayUrl } from './ipfsService';
import type { Collection, Token } from '@/types/nft';

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
    return getMockCollections();
  }
}

/**
 * Get all trips (tokens) from blockchain with fallback to mock data
 */
export async function getTrips(): Promise<Token[]> {
  try {
    // Create a proper provider for read-only operations
    const provider = new ethers.JsonRpcProvider(DEFAULT_CONTRACT_CONFIG.rpcUrl);
    
    // Try to get real blockchain data
    const contractService = createContractService(DEFAULT_CONTRACT_CONFIG, provider as any);
    const collections = await getCollections();
    
    const allTrips: Token[] = [];
    for (const collection of collections) {
      try {
        const tokens = await contractService.getTokensForCollection(collection.contractAddress);
        allTrips.push(...tokens);
      } catch (error) {
        console.error(`Error fetching tokens for collection ${collection.contractAddress}:`, error);
      }
    }

    return allTrips;
  } catch (error) {
    console.error('Failed to fetch trips from blockchain, using mock data:', error);
    return getMockTrips();
  }
}

/**
 * Get trips owned by a specific address
 */
export async function getTripsForOwner(ownerAddress: string): Promise<Token[]> {
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
      name: trip.metadata.name,
      description: trip.metadata.description,
      imageUrl: getPublicGatewayUrl(trip.metadata.image),
      duration: 15, // Default duration, could be stored in metadata
    }));
  } catch (error) {
    console.error('Failed to fetch sessions from blockchain, using mock data:', error);
    // Fallback to mock data
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (!ownerAddress) return [];
    return Object.values(MOCK_SESSION_DETAILS).map(({ events, comments, ...session }) => session);
  }
};

/**
 * Get session details (legacy function for My Trips page)
 */
export const getSessionDetails = async (sessionId: string): Promise<SessionDetails | null> => {
  try {
    // Try to get real blockchain data first
    const trips = await getTrips();
    const trip = trips.find(t => t.id === sessionId);
    
    if (trip) {
      // Convert blockchain trip to session details format
      return {
        id: trip.id,
        name: trip.metadata.name,
        description: trip.metadata.description,
        imageUrl: getPublicGatewayUrl(trip.metadata.image),
        duration: 15, // Default duration
        creator: trip.creator,
        category: 'Relaxation' as const, // Default category
        intensity: 'Mild' as const, // Default intensity
        audioUrl: trip.metadata.audio || '/audios/rave.mp3',
        events: [], // Would need to be stored in metadata
        comments: [] // Would need to be stored in metadata
      };
    }
  } catch (error) {
    console.error('Failed to fetch session details from blockchain:', error);
  }

  // Fallback to mock data
  await new Promise(resolve => setTimeout(resolve, 500));
  return MOCK_SESSION_DETAILS[sessionId] || null;
};

// --- MOCK DATA HELPERS (Fallback) ---

function getMockCollections(): Collection[] {
  return [];
}

function getMockTrips(): Token[] {
  return [
    {
      id: '1',
      tokenId: '1',
      collectionAddress: '0x1234567890123456789012345678901234567890',
      owner: '0xabcdef1234567890abcdef1234567890abcdef12',
      creator: '0xabcdef1234567890abcdef1234567890abcdef12',
      metadata: {
        name: 'Rave in the Dark #1',
        description: 'An electrifying electronic music experience with synchronized LED patterns',
        image: '/images/forest_focus.png',
        audio: '/audios/rave.mp3',
        pattern: 'QmPattern1234567890abcdef1234567890abcdef'
      },
      mintedAt: '2024-01-15T10:00:00Z',
      isListed: false
    }
  ];
}