import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// Mock database - replace with actual database connection
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

// Mock earnings data - replace with database query
const mockEarnings: Earnings[] = [
  {
    id: 'earn_1',
    tokenId: '1',
    collectionAddress: '0x1234567890123456789012345678901234567890',
    owner: '0x1234567890123456789012345678901234567890',
    creator: '0xabcdef1234567890abcdef1234567890abcdef12',
    amount: '0.035',
    timestamp: '2024-01-15T10:00:00Z',
    isClaimed: false
  },
  {
    id: 'earn_2',
    tokenId: '1',
    collectionAddress: '0x1234567890123456789012345678901234567890',
    owner: '0xabcdef1234567890abcdef1234567890abcdef12',
    creator: '0xabcdef1234567890abcdef1234567890abcdef12',
    amount: '0.015',
    timestamp: '2024-01-15T10:00:00Z',
    isClaimed: false
  }
];

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated (you can implement your own auth logic)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Extract user address from request body
    const body = await request.json();
    const { userAddress } = body;

    if (!userAddress) {
      return NextResponse.json(
        { error: 'Missing user address' },
        { status: 400 }
      );
    }

    // Validate Ethereum address format
    if (!ethers.isAddress(userAddress)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address format' },
        { status: 400 }
      );
    }

    // Check if backend signer private key is configured
    const backendSignerPrivateKey = process.env.BACKEND_SIGNER_PRIVATE_KEY;
    if (!backendSignerPrivateKey) {
      return NextResponse.json(
        { error: 'Backend signer not configured' },
        { status: 500 }
      );
    }

    // Calculate total unclaimed earnings for the user
    const userEarnings = mockEarnings.filter(
      earning => 
        (earning.owner.toLowerCase() === userAddress.toLowerCase() || 
         earning.creator.toLowerCase() === userAddress.toLowerCase()) &&
        !earning.isClaimed
    );

    if (userEarnings.length === 0) {
      return NextResponse.json(
        { 
          error: 'No unclaimed earnings found',
          message: 'You have no earnings to claim at this time'
        },
        { status: 404 }
      );
    }

    // Calculate total amount
    const totalAmount = userEarnings.reduce(
      (sum, earning) => sum + parseFloat(earning.amount), 
      0
    );

    // Create tightly packed message for signature
    // keccak256(abi.encodePacked(userAddress, amount))
    const message = ethers.solidityPacked(
      ['address', 'uint256'],
      [userAddress, ethers.parseEther(totalAmount.toString())]
    );

    // Hash the message
    const messageHash = ethers.keccak256(message);

    // Sign the message with backend private key
    const wallet = new ethers.Wallet(backendSignerPrivateKey);
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));

    // Mark earnings as claimed (in a real implementation, this would update the database)
    userEarnings.forEach(earning => {
      earning.isClaimed = true;
    });

    // Return the claim voucher
    return NextResponse.json({
      success: true,
      userAddress,
      totalAmount: totalAmount.toString(),
      messageHash,
      signature,
      voucher: {
        amount: totalAmount.toString(),
        signature,
        messageHash
      },
      message: `Successfully generated claim voucher for ${totalAmount} ETH`,
      earningsCount: userEarnings.length
    });

  } catch (error) {
    console.error('Earnings claim error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Failed to generate claim voucher: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error while generating claim voucher' },
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
