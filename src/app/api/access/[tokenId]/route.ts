import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// Mock database - replace with actual database connection
interface UserCredits {
  address: string;
  credits: number;
  lastUpdated: string;
}

interface Earnings {
  id: string;
  tokenId: string;
  collectionAddress: string;
  owner: string;
  creator: string;
  amount: string;
  timestamp: string;
  isClaimed: boolean;
}

// Mock data - replace with database queries
const mockUserCredits: Record<string, UserCredits> = {
  '0x1234567890123456789012345678901234567890': {
    address: '0x1234567890123456789012345678901234567890',
    credits: 0.5,
    lastUpdated: '2024-01-15T10:00:00Z'
  }
};

const mockEarnings: Earnings[] = [];

// Mock NFT ownership data - replace with blockchain calls
const mockNFTOwnership: Record<string, string> = {
  '1': '0x1234567890123456789012345678901234567890', // tokenId 1 owned by address
  '2': '0xabcdef1234567890abcdef1234567890abcdef12'  // tokenId 2 owned by different address
};

// Mock collection data - replace with database query
const mockCollections: Record<string, any> = {
  '0x1234567890123456789012345678901234567890': {
    name: 'Rave in the Dark',
    audioCid: 'QmAudio1234567890abcdef1234567890abcdef',
    patternCid: 'QmPattern1234567890abcdef1234567890abcdef',
    price: '0.05',
    creator: '0xabcdef1234567890abcdef1234567890abcdef12'
  }
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  try {
    const { tokenId } = await params;
    const body = await request.json();
    const { signature, message, paymentToken, collectionAddress } = body;

    if (!signature || !message || !collectionAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters: signature, message, collectionAddress' },
        { status: 400 }
      );
    }

    // Verify signature to get user address
    let userAddress: string;
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      userAddress = recoveredAddress.toLowerCase();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Get collection data
    const collection = mockCollections[collectionAddress];
    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Check for Ownership (Free Access)
    const ownerAddress = mockNFTOwnership[tokenId];
    if (ownerAddress && ownerAddress.toLowerCase() === userAddress) {
      // User is the owner - grant free access
      return NextResponse.json({
        access: 'granted',
        type: 'owner',
        tokenId,
        collectionAddress,
        audioCid: collection.audioCid,
        patternCid: collection.patternCid,
        message: 'Free access granted to NFT owner'
      });
    }

    // Check for Payment (Paid Access)
    const userCredits = mockUserCredits[userAddress];
    if (userCredits && userCredits.credits >= parseFloat(collection.price)) {
      // User has sufficient credits - deduct and grant access
      const requiredCredits = parseFloat(collection.price);
      userCredits.credits -= requiredCredits;
      userCredits.lastUpdated = new Date().toISOString();

      // Calculate earnings split (70% to owner, 30% to creator)
      const ownerEarnings = requiredCredits * 0.7;
      const creatorEarnings = requiredCredits * 0.3;

      // Record earnings for owner
      if (ownerAddress) {
        const ownerEarning: Earnings = {
          id: `earn_${Date.now()}_owner`,
          tokenId,
          collectionAddress,
          owner: ownerAddress,
          creator: collection.creator,
          amount: ownerEarnings.toString(),
          timestamp: new Date().toISOString(),
          isClaimed: false
        };
        mockEarnings.push(ownerEarning);
      }

      // Record earnings for creator
      const creatorEarning: Earnings = {
        id: `earn_${Date.now()}_creator`,
        tokenId,
        collectionAddress,
        owner: userAddress,
        creator: collection.creator,
        amount: creatorEarnings.toString(),
        timestamp: new Date().toISOString(),
        isClaimed: false
      };
      mockEarnings.push(creatorEarning);

      // Grant access
      return NextResponse.json({
        access: 'granted',
        type: 'paid',
        tokenId,
        collectionAddress,
        audioCid: collection.audioCid,
        patternCid: collection.patternCid,
        creditsDeducted: requiredCredits,
        remainingCredits: userCredits.credits,
        message: 'Access granted after payment deduction'
      });
    }

    // Deny Access - neither owner nor sufficient credits
    return NextResponse.json(
      { 
        error: 'Access denied',
        message: 'You are not the owner and do not have sufficient credits',
        requiredCredits: collection.price,
        availableCredits: userCredits?.credits || 0
      },
      { status: 403 }
    );

  } catch (error) {
    console.error('Access control error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Access control failed: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error during access control' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
