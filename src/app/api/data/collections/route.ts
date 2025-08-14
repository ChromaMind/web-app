import { NextRequest, NextResponse } from 'next/server';

// Mock database - replace with actual database connection
interface Collection {
  id: string;
  contractAddress: string;
  name: string;
  symbol: string;
  description: string;
  creator: string;
  maxSupply: number;
  currentSupply: number;
  price: string;
  audioCid: string;
  patternCid: string;
  metadataCid: string;
  createdAt: string;
  imageUrl: string;
  isActive: boolean;
}

// Mock data - replace with database query
const mockCollections: Collection[] = [
  {
    id: '1',
    contractAddress: '0x1234567890123456789012345678901234567890',
    name: 'Rave in the Dark',
    symbol: 'RAVE',
    description: 'An electrifying electronic music experience with synchronized LED patterns',
    creator: '0xabcdef1234567890abcdef1234567890abcdef12',
    maxSupply: 100,
    currentSupply: 45,
    price: '0.05',
    audioCid: 'QmAudio1234567890abcdef1234567890abcdef',
    patternCid: 'QmPattern1234567890abcdef1234567890abcdef',
    metadataCid: 'QmMetadata1234567890abcdef1234567890abcdef',
    createdAt: '2024-01-15T10:00:00Z',
    imageUrl: '/images/rave-dark.jpg',
    isActive: true
  },
  {
    id: '2',
    contractAddress: '0x2345678901234567890123456789012345678901',
    name: 'Chill Vibes',
    symbol: 'CHILL',
    description: 'Relaxing ambient sounds perfect for meditation and relaxation',
    creator: '0xbcdef1234567890abcdef1234567890abcdef123',
    maxSupply: 50,
    currentSupply: 12,
    price: '0.03',
    audioCid: 'QmAudio2345678901abcdef1234567890abcdef123',
    patternCid: 'QmPattern2345678901abcdef1234567890abcdef123',
    metadataCid: 'QmMetadata2345678901abcdef1234567890abcdef123',
    createdAt: '2024-01-16T14:30:00Z',
    imageUrl: '/images/chill-vibes.jpg',
    isActive: true
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const creator = searchParams.get('creator');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const search = searchParams.get('search') || '';
    
    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }
    
    // Filter collections based on query parameters
    let filteredCollections = mockCollections.filter(collection => {
      // Filter by creator if specified
      if (creator && collection.creator.toLowerCase() !== creator.toLowerCase()) {
        return false;
      }
      
      // Filter by search term
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          collection.name.toLowerCase().includes(searchLower) ||
          collection.description.toLowerCase().includes(searchLower) ||
          collection.symbol.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    });
    
    // Sort collections
    filteredCollections.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Collection];
      let bValue: any = b[sortBy as keyof Collection];
      
      // Handle date sorting
      if (sortBy === 'createdAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      // Handle numeric sorting
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // Handle string sorting
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return 0;
    });
    
    // Calculate pagination
    const total = filteredCollections.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedCollections = filteredCollections.slice(startIndex, endIndex);
    
    // Calculate pagination metadata
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    // Return response with pagination metadata
    return NextResponse.json({
      collections: paginatedCollections,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null
      },
      filters: {
        creator,
        search,
        sortBy,
        sortOrder
      }
    });
    
  } catch (error) {
    console.error('Collections API error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Failed to fetch collections: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error while fetching collections' },
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
