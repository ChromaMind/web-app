// Contract Test Utility for Local Anvil Network
import { ethers } from 'ethers';
import { createContractService, DEFAULT_CONTRACT_CONFIG } from '@/services/contractService';

// Test configuration for local Anvil network
const TEST_CONFIG = {
  ...DEFAULT_CONTRACT_CONFIG,
  // Use the first Anvil account as signer
  privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
};

/**
 * Test basic contract connectivity and function calls
 */
export async function testContractIntegration() {
  try {
    console.log('🚀 Testing contract integration with local Anvil network...');
    
    // Connect to local Anvil network
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    const signer = new ethers.Wallet(TEST_CONFIG.privateKey, provider);
    
    console.log('✅ Connected to Anvil network');
    console.log('📱 Signer address:', await signer.getAddress());
    
    // Test TripFactory contract
    console.log('\n🏭 Testing TripFactory contract...');
    const factory = new ethers.Contract(
      TEST_CONFIG.tripFactoryAddress,
      ['function getCollectionCount() external view returns (uint256)', 'function owner() external view returns (address)'],
      signer
    );
    
    const collectionCount = await factory.getCollectionCount();
    const factoryOwner = await factory.owner();
    
    console.log('📊 Collection count:', collectionCount.toString());
    console.log('👑 Factory owner:', factoryOwner);
    
    // Test StreamingLedger contract
    console.log('\n💰 Testing StreamingLedger contract...');
    const ledger = new ethers.Contract(
      TEST_CONFIG.streamingLedgerAddress,
      ['function getContractBalance() external view returns (uint256)', 'function owner() external view returns (address)'],
      signer
    );
    
    const contractBalance = await ledger.getContractBalance();
    const ledgerOwner = await ledger.owner();
    
    console.log('💎 Contract balance:', ethers.formatEther(contractBalance), 'ETH');
    console.log('👑 Ledger owner:', ledgerOwner);
    
    // Test user credit balance
    const userCredit = await ledger.getUserCredit(await signer.getAddress());
    console.log('💳 User credit balance:', ethers.formatEther(userCredit), 'ETH');
    
    console.log('\n🎉 All contract tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Contract test failed:', error);
    return false;
  }
}

/**
 * Test collection creation (requires funds in signer account)
 */
export async function testCollectionCreation() {
  try {
    console.log('\n🎨 Testing collection creation...');
    
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    const signer = new ethers.Wallet(TEST_CONFIG.privateKey, provider);
    
    // Check signer balance
    const balance = await provider.getBalance(await signer.getAddress());
    console.log('💰 Signer balance:', ethers.formatEther(balance), 'ETH');
    
    if (balance < ethers.parseEther('0.01')) {
      console.log('⚠️  Insufficient balance for testing. Please fund the account first.');
      return false;
    }
    
    const contractService = createContractService(TEST_CONFIG, signer);
    
    // Test gas estimation
    const gasEstimate = await contractService.estimateCreateCollection({
      name: 'Test Collection',
      symbol: 'TEST',
      maxSupply: 100,
      price: '0.001',
      audioCid: 'QmTest123',
      patternCid: 'QmPattern123',
      metadataCid: 'QmMetadata123',
      royaltyPercentage: 1000 // 10%
    });
    
    console.log('⛽ Estimated gas for collection creation:', gasEstimate);
    console.log('✅ Gas estimation successful');
    
    return true;
    
  } catch (error) {
    console.error('❌ Collection creation test failed:', error);
    return false;
  }
}

/**
 * Run all contract tests
 */
export async function runAllContractTests() {
  console.log('🧪 Running comprehensive contract tests...\n');
  
  const basicTest = await testContractIntegration();
  const creationTest = await testCollectionCreation();
  
  console.log('\n📋 Test Results:');
  console.log('🔗 Basic connectivity:', basicTest ? '✅ PASS' : '❌ FAIL');
  console.log('🎨 Collection creation:', creationTest ? '✅ PASS' : '❌ FAIL');
  
  if (basicTest && creationTest) {
    console.log('\n🎉 All tests passed! Your contracts are ready for integration.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check your Anvil network and contract deployment.');
  }
  
  return basicTest && creationTest;
}


