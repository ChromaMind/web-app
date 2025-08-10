import type { Session } from "@/app/(main)/trips/page";

// MOCK DATA: Replace this with actual blockchain queries
const MOCK_SESSIONS: Session[] = [
  {
    id: 'nft-001',
    name: 'Oceanic Calm',
    description: 'Gentle blue and green lights synced with calming ocean waves.',
    imageUrl: '/placeholder-ocean.png', // Create a placeholder image in public/
    duration: 900, // 15 minutes
  },
  {
    id: 'nft-002',
    name: 'Forest Focus',
    description: 'Pulsating green and amber lights designed to enhance focus.',
    imageUrl: '/placeholder-forest.png',
    duration: 1200, // 20 minutes
  },
  {
    id: 'nft-003',
    name: 'Sunrise Energizer',
    description: 'A vibrant sequence of reds and oranges to start your day.',
    imageUrl: '/placeholder-sunrise.png',
    duration: 600, // 10 minutes
  },
];

/**
 * Fetches the session NFTs owned by a given wallet address.
 * TODO: Replace mock data with a real blockchain call using libraries like
 * viem, ethers.js, or an NFT API service like Alchemy or Moralis.
 * You would query your NFT contract's `balanceOf` and `tokenOfOwnerByIndex` methods.
 */
export const getSessionsForOwner = async (ownerAddress: string): Promise<Session[]> => {
  console.log(`Fetching sessions for owner: ${ownerAddress}`);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // In a real app, you would check if ownerAddress exists
  if (!ownerAddress) return [];
  
  // Return the mock data for demonstration purposes
  return MOCK_SESSIONS;
};