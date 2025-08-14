import { PinataSDK } from 'pinata';

// Pinata configuration
const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || '';
const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'https://ivory-neat-unicorn-8.mypinata.cloud/ipfs/';

// Initialize Pinata client
const pinata = new PinataSDK({
  pinataJwt: PINATA_JWT,
  pinataGateway: 'ivory-neat-unicorn-8.mypinata.cloud',
});

export interface IPFSUploadResult {
  hash: string;
  size: number;
  path: string;
  url: string;
}

/**
 * Upload a file to IPFS via Pinata
 * @param file - The file to upload
 * @param pin - Whether to pin the file (default: true)
 * @returns IPFSUploadResult with hash and URLs
 */
export async function uploadToIPFS(file: File, pin: boolean = true): Promise<IPFSUploadResult> {
  try {
    if (!PINATA_JWT) {
      throw new Error('Pinata JWT not configured. Please set NEXT_PUBLIC_PINATA_JWT environment variable.');
    }

    // Upload to Pinata using the new API
    const result = await pinata.upload.public.file(file);

    // Log the result to see the actual structure
    console.log('Pinata upload result:', result);

    // The hash is in the 'cid' property for Pinata
    const hash = result.cid;
    
    return {
      hash,
      size: file.size,
      path: hash,
      url: `${GATEWAY_URL}${hash}`,
    };
  } catch (error) {
    console.error('Pinata upload failed:', error);
    throw new Error(`Failed to upload to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload JSON data to IPFS via Pinata
 * @param data - The JSON data to upload
 * @param filename - Optional filename for the JSON
 * @param pin - Whether to pin the file (default: true)
 * @returns IPFSUploadResult with hash and URLs
 */
export async function uploadJSONToIPFS(
  data: any,
  filename: string = 'data.json',
  pin: boolean = true
): Promise<IPFSUploadResult> {
  try {
    if (!PINATA_JWT) {
      throw new Error('Pinata JWT not configured. Please set NEXT_PUBLIC_PINATA_JWT environment variable.');
    }

    // Create a File object from the JSON data
    const jsonString = JSON.stringify(data, null, 2);
    const jsonFile = new File([jsonString], filename, {
      type: 'application/json',
    });

    // Upload JSON to Pinata using the new API
    const result = await pinata.upload.public.file(jsonFile);

    // Log the result to see the actual structure
    console.log('Pinata JSON upload result:', result);

    // The hash is in the 'cid' property for Pinata
    const hash = result.cid;
    
    return {
      hash,
      size: jsonString.length,
      path: hash,
      url: `${GATEWAY_URL}${hash}`,
    };
  } catch (error) {
    console.error('Pinata JSON upload failed:', error);
    throw new Error(`Failed to upload JSON to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload multiple files to IPFS via Pinata
 * @param files - Array of files to upload
 * @param pin - Whether to pin the files (default: true)
 * @returns Array of IPFSUploadResult
 */
export async function uploadMultipleToIPFS(
  files: File[],
  pin: boolean = true
): Promise<IPFSUploadResult[]> {
  try {
    const results: IPFSUploadResult[] = [];
    
    for (const file of files) {
      const result = await uploadToIPFS(file, pin);
      results.push(result);
    }
    
    return results;
  } catch (error) {
    console.error('Pinata multiple upload failed:', error);
    throw new Error(`Failed to upload multiple files to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get IPFS gateway URL from hash
 * @param hash - IPFS hash
 * @returns Full IPFS gateway URL
 */
export function getIPFSURL(hash: string): string {
  return `${GATEWAY_URL}${hash}`;
}

/**
 * Get public gateway URL from IPFS URI
 * @param ipfsUri - IPFS URI (e.g., "ipfs://...")
 * @returns Full public gateway URL
 */
export function getPublicGatewayUrl(ipfsUri: string): string {
  if (!ipfsUri || !ipfsUri.startsWith('ipfs://')) {
    return ipfsUri; // Return original if not a valid IPFS URI
  }
  const hash = ipfsUri.replace('ipfs://', '');
  return `${GATEWAY_URL}${hash}`;
}

/**
 * Validate IPFS hash format
 * @param hash - IPFS hash to validate
 * @returns Whether the hash is valid
 */
export function isValidIPFSHash(hash: string): boolean {
  // Basic IPFS hash validation (starts with Qm for CIDv0 or bafy for CIDv1)
  return /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(hash) || /^bafy[a-z2-7]{55}$/.test(hash);
}

/**
 * Test Pinata connection
 * @returns Whether Pinata is properly configured
 */
export async function testPinataConnection(): Promise<boolean> {
  try {
    if (!PINATA_JWT) {
      return false;
    }
    
    // Test with a simple file upload
    const testFile = new File(['test connection'], 'test.txt', { type: 'text/plain' });
    await pinata.upload.public.file(testFile);
    return true;
  } catch (error) {
    console.error('Pinata connection test failed:', error);
    return false;
  }
}
