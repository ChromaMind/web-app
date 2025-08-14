import { NextRequest, NextResponse } from 'next/server';
import { PinataSDK } from 'pinata';

// Initialize Pinata SDK
const pinata = new PinataSDK({ 
  pinataJwt: process.env.PINATA_JWT || '',
  pinataGateway: process.env.PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs/'
});

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated (you can implement your own auth logic)
    // For now, we'll assume the request includes an authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Parse the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type (allow audio and JSON files)
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'application/json'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only audio and JSON files are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB.' },
        { status: 400 }
      );
    }

    // Check Pinata JWT
    if (!process.env.PINATA_JWT) {
      return NextResponse.json(
        { error: 'IPFS service not configured' },
        { status: 500 }
      );
    }

    // Upload to IPFS via Pinata
    const result = await pinata.upload.public.file(file);
    
    if (!result.cid) {
      throw new Error('Failed to get IPFS CID from Pinata');
    }

    // Return the upload result
    const uploadResult = {
      hash: result.cid,
      size: file.size,
      path: result.cid,
      url: `${process.env.PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs/'}${result.cid}`,
      filename: file.name,
      type: file.type
    };

    return NextResponse.json(uploadResult);

  } catch (error) {
    console.error('IPFS upload error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Upload failed: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error during upload' },
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
